<script setup lang="ts">
import { parseOpi, type OpiArchive } from "~/utils/parsers/opi-parser";
import FileParser from "~/utils/parsers/file-parser";
import OJMParser from "~/utils/parsers/ojm-parser";
import { convert } from "~/utils/parsers/ojn-parser";
import { normalizeFailData } from "~/utils/helpers/search";
import { shuffle } from "~/utils/helpers/random";
import { fancyTimeFormat } from "~/utils/helpers/formatter";
import { fetchAndParseDMJamTrack } from "~/utils/helpers/chart-loader";

const route = useRoute();

// Unified Dashboard States
const currentView = ref<'landing' | 'player' | 'dressing' | 'godtool'>('landing');
const loadedChart = ref<ConvertedOJN | null>(null);
const loadedGodtool = ref<OpiArchive | null>(null);

const showOpaModal = ref(false);
const pendingOpaFile = ref<File | null>(null);

const loading = ref(false);

// Refs for workspace components
const dressingWorkspaceRef = ref<any>(null);

const { isArchiveLoaded, parseAvatarArchive, clearEquipments } = useAvatarState();

const activeWorkspaceLabel = computed(() => {
  if (currentView.value === 'player') return 'O2Jam Rhythm Chart Player';
  if (currentView.value === 'dressing') return 'O2Jam Closet Customizer';
  if (currentView.value === 'godtool') return 'GodTool OPI Inspector';
  return '';
});

// Audio Hook states
const seed = useSeed();
const ohmMode = useOhm();
const noLN = useNoLN();
const verticalMode = useVerticalMode();
const noteHeight = useNoteHeight();
const scaleW = useScaleW();
const scaleH = useScaleH();
const selectedDifficulty = useSelectedDifficulty();

const pattern = computed(() => {
  return seed.value.split("").map((char) => (parseInt(char) - 1).toString());
});

const chartDataRef = computed<ConvertedOJN | undefined>(() => {
  if (!loadedChart.value) return undefined;
  return loadedChart.value;
});

const {
  isPlaying,
  seekOffset,
  isDecoding,
  decodingProgress,
  decodingTotal,
  volumeLevel,
  decodeAllSounds,
  getChartDurationMs,
  pauseAudioPlayback,
  startAudioPlayback,
  stopSong,
  seekTo,
  togglePlay,
} = useOjnAudio(
  chartDataRef,
  pattern,
  () => {}
);

// Drag & Drop visual state helpers
const isDragActive = ref(false);
let dragCounter = 0;

const onDragEnter = (e: DragEvent) => {
  e.preventDefault();
  dragCounter++;
  isDragActive.value = true;
};

const onDragLeave = (e: DragEvent) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    isDragActive.value = false;
  }
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const onDrop = async (e: DragEvent) => {
  e.preventDefault();
  isDragActive.value = false;
  dragCounter = 0;
  
  const filesList = e.dataTransfer?.items || e.dataTransfer?.files;
  if (filesList && filesList.length > 0) {
    await handleDroppedItems(filesList);
  }
};

const getFileFromEntry = (entry: any): Promise<File> => {
  return new Promise((resolve, reject) => {
    entry.file((file: File) => resolve(file), (err: any) => reject(err));
  });
};

const readFileBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = (e) => reject(e.target?.error);
    reader.readAsArrayBuffer(file);
  });
};

const loadChartFromRoute = async () => {
  const rawServer = Array.isArray(route.query.server) ? route.query.server[0] : route.query.server;
  const rawId = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;

  if (!rawServer || !rawId) return false;

  const server = String(rawServer).toLowerCase();
  const chartId = String(rawId);
  const supportedServers = new Set(["dmjam", "nsjam", "ojn"]);

  if (!supportedServers.has(server)) return false;

  loading.value = true;
  try {
    let converted: ConvertedOJN;

    if (server === "dmjam") {
      converted = await fetchAndParseDMJamTrack(Number(chartId), selectedDifficulty.value);
    } else {
      const downloadUrl = await $fetch<string>(`/api/${server}/${chartId}`);
      if (!downloadUrl) throw new Error("No download URL returned");

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download chart (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      converted = convert(arrayBuffer, {}, {}, selectedDifficulty.value);
      converted.rawOjnBuffer = arrayBuffer;
    }

    loadedChart.value = converted;
    stopSong();
    await decodeAllSounds();
    currentView.value = 'player';
    return true;
  } catch (err) {
    console.error("Failed to load chart from route:", err);
    alert("Failed to open chart from URL: " + err);
    return false;
  } finally {
    loading.value = false;
  }
};

const handleDroppedItems = async (items: any) => {
  const entries: any[] = [];
  const files: File[] = [];
  let isDirectory = false;
  
  if (items[0] && ('webkitGetAsEntry' in items[0] || items[0] instanceof DataTransferItem)) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
          if (entry.isDirectory) isDirectory = true;
        }
      }
    }
  } else {
    for (let i = 0; i < items.length; i++) {
      files.push(items[i]);
    }
  }

  let hasOjn = false;
  let hasOpa = false;
  let hasOpi = false;
  let opaFileEntry: any = null;
  let opiFileEntry: any = null;

  if (entries.length > 0) {
    if (isDirectory) {
      hasOjn = true;
    } else {
      for (const entry of entries) {
        const name = entry.name.toLowerCase();
        if (name.endsWith('.ojn') || name.endsWith('.ojm')) hasOjn = true;
        if (name.endsWith('.opa')) { hasOpa = true; opaFileEntry = entry; }
        if (name.endsWith('.opi')) { hasOpi = true; opiFileEntry = entry; }
      }
    }
  } else {
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.ojn') || name.endsWith('.ojm')) hasOjn = true;
      if (name.endsWith('.opa')) { hasOpa = true; opaFileEntry = file; }
      if (name.endsWith('.opi')) { hasOpi = true; opiFileEntry = file; }
    }
  }

  if (hasOjn) {
    loading.value = true;
    try {
      const inputItems = entries.length > 0 ? entries : files;
      const output = await FileParser.parseFiles(inputItems, entries.length > 0);
      loadedChart.value = output;
      stopSong();
      await decodeAllSounds();
      currentView.value = 'player';
    } catch (err) {
      alert("Failed to parse rhythm chart: " + err);
    } finally {
      loading.value = false;
    }
  } else if (hasOpa) {
    const rawFile = entries.length > 0 ? await getFileFromEntry(opaFileEntry) : opaFileEntry;
    if (rawFile) {
      pendingOpaFile.value = rawFile;
      showOpaModal.value = true;
    }
  } else if (hasOpi) {
    loading.value = true;
    const rawFile = entries.length > 0 ? await getFileFromEntry(opiFileEntry) : opiFileEntry;
    if (rawFile) {
      try {
        const buffer = await readFileBuffer(rawFile);
        loadedGodtool.value = parseOpi(buffer);
        currentView.value = 'godtool';
      } catch (err) {
        alert("Failed to parse OPI archive: " + err);
      } finally {
        loading.value = false;
      }
    }
  } else {
    alert("Unsupported file format! Please drop a valid O2Jam resource file (.ojn, .ojm, .opa, .opi).");
  }
};

const handleOpaChoice = async (choice: 'dressing' | 'godtool') => {
  if (!pendingOpaFile.value) return;
  showOpaModal.value = false;
  loading.value = true;
  
  const rawFile = pendingOpaFile.value;
  pendingOpaFile.value = null;
  
  try {
    const buffer = await readFileBuffer(rawFile);
    if (choice === 'dressing') {
      await parseAvatarArchive(buffer);
      currentView.value = 'dressing';
    } else {
      loadedGodtool.value = parseOpi(buffer);
      currentView.value = 'godtool';
    }
  } catch (err) {
    alert("Parsing failed: " + err);
  } finally {
    loading.value = false;
  }
};

const cancelOpaChoice = () => {
  showOpaModal.value = false;
  pendingOpaFile.value = null;
};

const onMainInputChange = async (event: any) => {
  if (event.target.files && event.target.files.length > 0) {
    await handleDroppedItems(event.target.files);
  }
};

const onMainFilesDropped = async (event: any) => {
  if (event.dataTransfer?.files && event.dataTransfer?.files.length > 0) {
    await handleDroppedItems(event.dataTransfer.files);
  }
};

const exitToLanding = () => {
  currentView.value = 'landing';
};

const unloadActiveWorkspace = () => {
  if (currentView.value === 'player') {
    stopSong();
    loadedChart.value = null;
  } else if (currentView.value === 'dressing') {
    clearEquipments();
    isArchiveLoaded.value = false;
  } else if (currentView.value === 'godtool') {
    loadedGodtool.value = null;
  }
  currentView.value = 'landing';
};

// Player Settings Controls handlers
const showSettings = ref(true);
const toggleSetting = () => {
  if (loadedChart.value) {
    showSettings.value = !showSettings.value;
  }
};

const handlePlaySongToggle = () => {
  if (!loadedChart.value || loading.value || isDecoding.value) return;
  togglePlay();
};

const playSong = () => {
  handlePlaySongToggle();
};

const upload = async (uploadedFile: ConvertedOJN) => {
  loading.value = true;
  loadedChart.value = uploadedFile;
  stopSong();
  await decodeAllSounds();
  loading.value = false;
};

const random = (isRandom: boolean) => {
  if (isRandom) {
    seed.value = shuffle("1234567".split("")).join("");
  }
};

const toggleOhmMode = (ohmModeValue: string) => {};
const toggleNoLN = () => {};
const toggleVerticalMode = () => {};
const updateScaleW = () => {};
const updateScaleH = () => {};
const updateNoteHeight = () => {};

const onChangeDifficulty = async (difficulty: OjnDifficulty) => {
  if (!loadedChart.value || !loadedChart.value.rawOjnBuffer) return;
  
  const wasPlaying = isPlaying.value;
  const currentOffset = seekOffset.value;
  
  if (wasPlaying) {
    pauseAudioPlayback();
  }
  
  selectedDifficulty.value = difficulty;
  loading.value = true;
  
  try {
    const convertedData = convert(
      loadedChart.value.rawOjnBuffer,
      loadedChart.value.deathPoints || {},
      loadedChart.value.hitSounds || {},
      difficulty
    );
    loadedChart.value = {
      ...loadedChart.value,
      ribbit: convertedData.ribbit,
      header: convertedData.header,
      hard: convertedData.hard,
    };
    
    await decodeAllSounds();
    
    const maxDurationSec = loadedChart.value.header?.difficulty?.[difficulty]?.duration || 0;
    const chartDurationMs = getChartDurationMs() || maxDurationSec * 1000;
    const clampedOffset = Math.max(0, Math.min(currentOffset, chartDurationMs));
    
    seekTo(clampedOffset);
    
    if (wasPlaying) {
      startAudioPlayback(clampedOffset);
    }
  } catch (error) {
    console.error("Failed to swap difficulty:", error);
    alert("Failed to swap difficulty: " + error);
  } finally {
    loading.value = false;
  }
};

let wasPlayingBeforeDrag = false;
const onBeforeDrag = () => {
  if (isPlaying.value) {
    wasPlayingBeforeDrag = true;
    pauseAudioPlayback();
  } else {
    wasPlayingBeforeDrag = false;
  }
};

const onAfterDrag = () => {
  if (wasPlayingBeforeDrag) {
    startAudioPlayback(seekOffset.value);
    wasPlayingBeforeDrag = false;
  }
};

// Keyboard listener
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
      return;
    }
    e.preventDefault();
    if (currentView.value === 'player') {
      handlePlaySongToggle();
    }
  }
};

// Robust sanitization function for song metadata
const sanitizeMetadataString = (str: string | undefined | null): string => {
  if (!str) return "";
  // Strip control bytes
  let clean = str.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  // Strip trailing replacement characters, block boxes, box drawing, or trailing whitespace
  clean = clean.replace(/[\uFFFD\u2500-\u25FF\s]+$/, "");
  // Strip leading replacement characters or whitespace
  clean = clean.replace(/^[\uFFFD\s]+/, "");
  return clean.trim();
};

const sanitizedTitle = computed(() => {
  return sanitizeMetadataString(loadedChart.value?.header?.title);
});

const sanitizedArtist = computed(() => {
  return sanitizeMetadataString(loadedChart.value?.header?.artist);
});

const sanitizedNoter = computed(() => {
  return sanitizeMetadataString(
    loadedChart.value?.ribbit?.obj || loadedChart.value?.header?.noter
  );
});

const formattedBpm = computed(() => {
  const bpm = loadedChart.value?.header?.bpm ?? loadedChart.value?.ribbit?.bpm;
  if (bpm == null || Number.isNaN(bpm)) return "—";
  return (Math.round(bpm * 100) / 100).toString();
});

useHead({
  title: () => {
    if (currentView.value === 'player' && loadedChart.value) {
      const difficulty = selectedDifficulty.value;
      const level = loadedChart.value.header?.difficulty?.[difficulty]?.level || 0;
      const diffLabel = difficulty === 'easy' ? 'EX' : difficulty === 'normal' ? 'NX' : 'HX';
      return `[${diffLabel} Lv.${level}] ${sanitizedTitle.value} - OJN Viewer`;
    } else if (currentView.value === 'dressing') {
      return 'Avatar Closet - OJN Viewer';
    } else if (currentView.value === 'godtool') {
      return 'OPI Inspector - OJN Viewer';
    }
    return 'OJN Viewer';
  }
});

watch(
  () => [route.query.server, route.query.id],
  async () => {
    if (!loadedChart.value) {
      await loadChartFromRoute();
    }
  },
  { flush: 'post' }
);

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);

  if (window.innerWidth < 1280) {
    verticalMode.value = true;
    scaleW.value = 8;
    scaleH.value = 6;
    noteHeight.value = 10;
  }

  void loadChartFromRoute();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  stopSong();
});
</script>

<template>
  <div 
    class="h-screen w-screen bg-zinc-950 text-white font-sans flex flex-col overflow-hidden select-none relative"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Screen-wide Global Drag Over Overlay -->
    <div 
      v-show="isDragActive"
      class="absolute inset-0 bg-emerald-950/20 border-4 border-dashed border-emerald-500 backdrop-blur-sm z-[300] flex flex-col items-center justify-center pointer-events-none transition-all duration-150"
    >
      <div class="bg-zinc-950/80 border border-zinc-800 p-8 rounded-2xl flex flex-col items-center space-y-4 shadow-2xl scale-[1.05] transition-transform">
        <div class="h-16 w-16 rounded-full bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div class="text-center">
          <h3 class="text-lg font-bold text-zinc-200">Drop files anywhere to open</h3>
          <p class="text-xs text-zinc-500 mt-1">Supports .ojn, .ojm, .opa, and .opi container files</p>
        </div>
      </div>
    </div>

    <!-- Choice routing Modal for .opa files -->
    <div 
      v-if="showOpaModal && pendingOpaFile"
      class="fixed inset-0 bg-black/60 backdrop-blur-md z-[250] flex items-center justify-center p-4 transition-all"
    >
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl scale-[1.02]">
        <div class="flex items-center space-x-3.5">
          <div class="h-12 w-12 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h3 class="text-md font-bold text-zinc-200 truncate max-w-[280px]" :title="pendingOpaFile.name">
              {{ pendingOpaFile.name }}
            </h3>
            <p class="text-xs text-zinc-500">Avatar item archive file detected</p>
          </div>
        </div>

        <div class="text-xs text-zinc-400 leading-relaxed bg-zinc-950/40 p-3 rounded-lg border border-zinc-850">
          How would you like to inspect this archive? Choose **Closet Studio** to try on sprite equipment layers, or **GodTool Explorer** to inspect raw sprite frames and boundary definitions.
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button 
            @click="handleOpaChoice('dressing')"
            class="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 px-4 text-xs font-semibold shadow-lg shadow-emerald-950/30 transition-all active:scale-95 duration-100 flex flex-col items-center justify-center space-y-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Closet Studio</span>
          </button>

          <button 
            @click="handleOpaChoice('godtool')"
            class="bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-xl py-3 px-4 text-xs font-semibold shadow-lg transition-all active:scale-95 duration-100 flex flex-col items-center justify-center space-y-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>GodTool Explorer</span>
          </button>
        </div>

        <button 
          @click="cancelOpaChoice"
          class="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors pt-2"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Unified Global Header -->
    <header 
      v-show="currentView !== 'landing'"
      class="flex justify-between items-center h-[60px] bg-zinc-900 border-b border-zinc-800 px-3 sm:px-4 md:px-6 flex-shrink-0 z-20 text-white select-none font-sans"
    >
      <!-- Left side: Song details (for player) OR Tool title (for dressing/godtool) -->
      <div class="flex items-center min-w-0 flex-grow sm:flex-grow-0">
        <div v-if="currentView === 'player' && loadedChart" class="flex items-center space-x-2.5 sm:space-x-4 min-w-0 w-full sm:w-auto">
          <!-- Level / Difficulty Badge on Leftest -->
          <span 
            :class="{
              'bg-rose-500/10 text-rose-400 border border-rose-500/20': selectedDifficulty === 'hard',
              'bg-amber-500/10 text-amber-400 border border-amber-500/20': selectedDifficulty === 'normal',
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': selectedDifficulty === 'easy'
            }"
            class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex-shrink-0 border"
          >
            <span>{{ selectedDifficulty === 'easy' ? 'EX' : selectedDifficulty === 'normal' ? 'NX' : 'HX' }}</span>
            Lv.{{ loadedChart.header?.difficulty?.[selectedDifficulty]?.level || 0 }}
          </span>

          <!-- Title and Artist stacked on mobile, row on desktop -->
          <div class="flex flex-col sm:flex-row sm:items-baseline text-left min-w-0 sm:space-x-2 text-sm sm:text-base md:text-lg lg:text-xl w-full sm:w-auto">
            <!-- Song Title -->
            <span class="text-white font-extrabold tracking-wide truncate max-w-[180px] xs:max-w-[220px] sm:max-w-[320px] select-text" :title="sanitizedTitle">
              {{ sanitizedTitle }}
            </span>
            <!-- Bullet separator on desktop -->
            <span class="text-zinc-700 hidden sm:inline select-none">•</span>
            <!-- Artist -->
            <span class="text-zinc-400 truncate max-w-[180px] xs:max-w-[220px] sm:max-w-[300px] text-xs sm:text-sm select-text font-medium" :title="sanitizedArtist">
              {{ sanitizedArtist }}
            </span>
            <!-- Divider dot -->
            <span class="text-zinc-700 select-none hidden xl:inline">•</span>
            <!-- Chart metadata chips -->
            <div class="hidden xl:flex items-center space-x-3 flex-shrink-0">
              <span v-if="sanitizedNoter" class="flex items-center space-x-1 max-w-[280px]">
                <span class="text-zinc-500 font-medium">obj:</span>
                <span class="text-zinc-100 font-bold truncate" :title="sanitizedNoter">{{ sanitizedNoter }}</span>
              </span>
              <span class="flex items-center space-x-1">
                <span class="text-zinc-500 font-medium">BPM:</span>
                <span class="text-zinc-100 font-bold">{{ formattedBpm }}</span>
              </span>
              <span class="flex items-center space-x-1">
                <span class="text-zinc-500 font-medium">Notes:</span>
                <span class="text-zinc-100 font-bold">{{ loadedChart.header?.difficulty?.[selectedDifficulty]?.note_count || 0 }}</span>
              </span>
              <span class="flex items-center space-x-1">
                <span class="text-zinc-500 font-medium">Time:</span>
                <span class="text-zinc-100 font-bold">{{ fancyTimeFormat(loadedChart.header?.difficulty?.[selectedDifficulty]?.duration || 0) }}</span>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col text-left">
          <span class="text-white text-base sm:text-xl font-extrabold tracking-wide uppercase">
            {{ activeWorkspaceLabel }}
          </span>
        </div>
      </div>

      <!-- Right side actions: workspace specific controls and Home/Exit button -->
      <!-- Right side actions: workspace specific controls and Home/Exit button -->
      <div class="flex items-center space-x-2 sm:space-x-6 flex-shrink-0 pl-2">
        <!-- Mobile/Tablet actions (hidden on desktop) -->
        <div class="flex xl:hidden items-center space-x-2">
          <!-- Play / Stop Button -->
          <button 
            v-show="currentView === 'player' && loadedChart"
            @click="handlePlaySongToggle" 
            :aria-label="isPlaying ? 'Stop' : 'Play'"
            :class="isPlaying ? 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'"
            class="w-10 h-10 border rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-md flex-shrink-0"
          >
            <!-- Stop Icon (Square) -->
            <svg v-if="isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <rect x="5" y="5" width="10" height="10" rx="1" />
            </svg>
            <!-- Play Icon (Triangle) -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
            </svg>
          </button>
          <!-- Settings Button -->
          <button 
            v-show="currentView === 'player' && loadedChart"
            @click="toggleSetting" 
            aria-label="Settings"
            class="w-10 h-10 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <!-- Exit Button (Only show in other views like dressing/godtool) -->
          <button 
            v-show="currentView !== 'player'"
            @click="unloadActiveWorkspace"
            aria-label="Home"
            class="w-10 h-10 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>

        <!-- Desktop actions (hidden on mobile/tablet) -->
        <div class="hidden xl:flex items-center space-x-6 flex-shrink-0">
          <!-- Player Controls inside header -->
          <div v-show="currentView === 'player' && loadedChart" class="flex items-center space-x-4 flex-shrink-0">
            <div class="flex items-center space-x-2 text-xl select-none mr-2">
              <span class="text-zinc-400 font-bold uppercase tracking-wider text-xs">Vol</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                v-model="volumeLevel"
                class="w-24 h-1.5 bg-zinc-700/90 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span class="w-8 text-right font-bold text-white text-sm">{{ Math.round(volumeLevel * 100) }}%</span>
            </div>
            <!-- Play / Stop Button -->
            <button 
              @click="handlePlaySongToggle" 
              :aria-label="isPlaying ? 'Stop' : 'Play'"
              :class="isPlaying ? 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'"
              class="w-10 h-10 border rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-md flex-shrink-0"
            >
              <!-- Stop Icon (Square) -->
              <svg v-if="isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <rect x="5" y="5" width="10" height="10" rx="1" />
              </svg>
              <!-- Play Icon (Triangle) -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
            </button>
            <!-- Settings Button -->
            <button 
              @click="toggleSetting" 
              aria-label="Settings"
              class="w-10 h-10 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <!-- Dressing Closet Controls inside header -->
          <div v-show="currentView === 'dressing'" class="flex items-center space-x-3">
            <button 
              @click="dressingWorkspaceRef?.exportPng"
              class="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center space-x-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export PNG</span>
            </button>
            <button 
              @click="dressingWorkspaceRef?.clearEquipments"
              class="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center space-x-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Reset Outfit</span>
            </button>
          </div>

          <!-- Exit/Unload button (far rightest) -->
          <button 
            @click="unloadActiveWorkspace"
            aria-label="Home"
            class="hidden xl:flex w-10 h-10 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl transition-all active:scale-95 items-center justify-center flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Workspace view selector -->
    <div class="flex-grow flex overflow-hidden w-full relative">
      <!-- 1. Landing View portal -->
      <div 
        v-if="currentView === 'landing'"
        class="flex-grow flex justify-center items-center p-6 bg-zinc-950"
      >
        <DropZone 
          class="w-full max-w-2xl text-center" 
          @files-dropped="onMainFilesDropped" 
          #default="{ dropZoneActive }"
        >
          <div
            :class="{
              'border-emerald-500 bg-zinc-900/60 scale-[1.01] shadow-emerald-950/20': dropZoneActive,
              'border-zinc-855 hover:border-zinc-800 bg-zinc-900/10': !dropZoneActive
            }"
            class="border-2 border-dashed rounded-3xl p-6 sm:p-16 flex flex-col items-center justify-center transition-all duration-200 shadow-2xl space-y-8 text-center w-full"
          >
            <!-- Title / Logo block -->
            <TitleScreen />

            <div class="space-y-2.5 max-w-md mx-auto">
              <h2 class="text-xl font-bold tracking-wide text-zinc-100">All-in-One Asset Hub</h2>
              <p class="text-xs text-zinc-500 leading-relaxed font-medium">
                Drag & Drop any resource file here:
              </p>
              <div class="flex justify-center gap-1.5 flex-wrap pt-2">
                <span class="text-[10px] bg-emerald-600/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-mono font-bold">.ojn / .ojm</span>
                <span class="text-[10px] bg-purple-600/10 text-purple-400 border border-purple-500/25 px-2.5 py-0.5 rounded-full font-mono font-bold">.opa (Avatar)</span>
                <span class="text-[10px] bg-blue-600/10 text-blue-400 border border-blue-500/25 px-2.5 py-0.5 rounded-full font-mono font-bold">.opi (Skins)</span>
              </div>
            </div>

            <!-- Browse button fallback -->
            <div class="flex justify-center pt-2">
              <label
                for="dashboard-file-input"
                class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-950/30 active:scale-95 duration-100 cursor-pointer"
              >
                Browse Game Resource
                <input
                  id="dashboard-file-input"
                  type="file"
                  class="hidden"
                  @change="onMainInputChange"
                  multiple
                />
              </label>
            </div>
            
            <!-- Quick entry to existing states if loaded -->
            <div 
              v-if="loadedChart || isArchiveLoaded || loadedGodtool"
              class="flex flex-col items-center space-y-3 pt-6 border-t border-zinc-900 w-full max-w-sm"
            >
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Active Workspaces</span>
              <div class="flex gap-2 w-full justify-center">
                <button 
                  v-if="loadedChart" 
                  @click="currentView = 'player'"
                  class="flex-grow bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold transition-all text-emerald-400"
                >
                  Rhythm Player
                </button>
                <button 
                  v-if="isArchiveLoaded" 
                  @click="currentView = 'dressing'"
                  class="flex-grow bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold transition-all text-purple-400"
                >
                  Avatar Closet
                </button>
                <button 
                  v-if="loadedGodtool" 
                  @click="currentView = 'godtool'"
                  class="flex-grow bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold transition-all text-blue-400"
                >
                  OPI Inspector
                </button>
              </div>
            </div>
          </div>
        </DropZone>
      </div>

      <!-- 2. Player workspace view -->
      <PlayerWorkspace 
        v-else-if="currentView === 'player' && loadedChart"
        :chart-data="loadedChart"
        :seek-offset="seekOffset"
        v-model:show-panel="showSettings"
        :is-playing="isPlaying"
        v-model:volume-level="volumeLevel"
        @seek="seekTo"
        @beforeDrag="onBeforeDrag"
        @afterDrag="onAfterDrag"
        @random="random"
        @toggleOhmMode="toggleOhmMode"
        @toggleNoLN="toggleNoLN"
        @toggleVerticalMode="toggleVerticalMode"
        @updateScaleW="updateScaleW"
        @updateScaleH="updateScaleH"
        @updateNoteHeight="updateNoteHeight"
        @changeDifficulty="onChangeDifficulty"
        @togglePlay="handlePlaySongToggle"
        @exit="exitToLanding"
      />

      <!-- 3. Dressing customizer view -->
      <DressingWorkspace 
        v-else-if="currentView === 'dressing' && isArchiveLoaded"
        ref="dressingWorkspaceRef"
        @exit="exitToLanding"
      />

      <!-- 4. Godtool inspector view -->
      <GodtoolWorkspace 
        v-else-if="currentView === 'godtool' && loadedGodtool"
        :initial-archive="loadedGodtool"
        @exit="exitToLanding"
      />
    </div>

    <!-- Loader spinning overlay -->
    <div
      class="fixed inset-0 overflow-y-auto z-[300] bg-black/60 backdrop-blur-sm"
      v-if="loading || isDecoding"
    >
      <div class="flex h-screen items-center flex-col justify-center text-white space-y-4">
        <LoadingSpinner />
        <div class="text-[15px] font-bold tracking-wide text-zinc-300" v-if="isDecoding">
          Decoding Audio: {{ decodingProgress }} / {{ decodingTotal }}
        </div>
        <div class="text-[15px] font-bold tracking-wide text-zinc-300" v-else>
          Processing game resource...
        </div>
      </div>
    </div>
  </div>
</template>
