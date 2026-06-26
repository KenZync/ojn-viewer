<template>
  <div>
    <ClientOnly>
      <div
        v-if="jsonData && headerData"
        class="flex justify-between items-center h-[50px] bg-black text-white text-xl font-bold px-4"
      >
        <div class="truncate mr-4">
          {{
            `Lv.${headerData.difficulty[selectedDifficulty].level} ${jsonData.title} / ${
              jsonData.artist
            } / obj : ${jsonData.obj} / bpm: ${jsonData.bpm} / Notes: ${
              jsonData.notes
            } / Time: ${fancyTimeFormat(headerData.difficulty[selectedDifficulty].duration)}`
          }}
        </div>
        <div class="flex items-center space-x-6 flex-shrink-0">
          <div class="flex items-center space-x-2 text-sm select-none">
            <span class="text-stone-400 font-medium">Vol:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              v-model="volumeLevel"
              class="w-20 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span class="w-8 text-right font-medium text-stone-300">{{ Math.round(volumeLevel * 100) }}%</span>
          </div>
          <button @click="togglePlay" class="text-emerald-400 hover:text-emerald-300 transition-colors">
            {{ isPlaying ? 'Pause (Space)' : 'Play (Space)' }}
          </button>
          <button @click="toggleSetting" class="hover:text-stone-300 transition-colors">Setting</button>
        </div>
      </div>
      <div
        v-else
        class="min-h-screen bg-zinc-900 flex justify-center items-center text-white font-bold flex-col w-full p-4 select-none"
      >
        <DropZone
          class="w-full max-w-xl text-center"
          @files-dropped="onMainFilesDropped"
          #default="{ dropZoneActive }"
        >
          <div
            :class="{
              'border-emerald-400 bg-zinc-800 scale-[1.02] shadow-emerald-950/30': dropZoneActive,
              'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50': !dropZoneActive
            }"
            class="border-4 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-200 shadow-2xl space-y-6"
          >
            <TitleScreen />
            <div class="text-sm font-medium text-stone-400 max-w-md">
              Drag & Drop your <span class="font-mono text-emerald-400 font-bold">.ojn</span> or <span class="font-mono text-emerald-400 font-bold">.ojm</span> files here, or browse to load a chart.
            </div>
            <label
              for="main-file-input"
              class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-md active:scale-95 duration-100"
            >
              Browse Files
              <input
                id="main-file-input"
                type="file"
                class="hidden"
                @change="onMainInputChange"
                multiple
              />
            </label>
          </div>
        </DropZone>
      </div>
      <Sidebar
        v-if="showPanel"
        class="absolute bg-stone-700 top-0 right-0 px-5 w-56 h-screen flex flex-col text-white space-y-3 overflow-auto z-50"
        :hit-sounds="hitSounds"
        :header-data="headerData"
        :is-playing="isPlaying"
        @close="toggleSetting"
        @random="random"
        @upload="upload"
        @toggle-ohm-mode="toggleOhmMode"
        @play-song="playSong"
        @toggle-no-ln="toggleNoLN"
        @toggle-vertical-mode="toggleVerticalMode"
        @update-scale-w="updateScaleW"
        @update-scale-h="updateScaleH"
        @update-note-height="updateNoteHeight"
        @change-difficulty="onChangeDifficulty"
      />
      <div
        class="fixed inset-0 overflow-y-auto z-[200] bg-black bg-opacity-50"
        v-if="loading || isDecoding"
      >
        <div class="flex h-screen items-center flex-col justify-center text-white space-y-4">
          <LoadingSpinner />
          <div class="text-xl font-bold" v-if="isDecoding">
            Decoding Audio: {{ decodingProgress }} / {{ decodingTotal }}
          </div>
        </div>
      </div>
    </ClientOnly>
    <div ref="pixiContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { OjnChartRenderer } from "~/utils/chart-renderer";
import FileParser from "~/utils/file-parser";
import OJMParser from "~/utils/ojm-parser";

const router = useRouter();
const route = useRoute();
const pixiContainer = ref<HTMLElement>();

// Model States
const jsonData = ref<Ribbit>();
const headerData = ref<OJNHeader>();
const hard = ref<HardType>();
const hitSounds = ref<HitSound>();
const rawOjnBuffer = ref<ArrayBuffer | null>(null);

const showPanel = ref(false);
const loading = ref(false);

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

const deathPoints = ref<DeathPoint>({});
const deathPointPlayer = computed(() => {
  if (deathPoints.value && route.query.player) {
    return searchDeathPlayer(deathPoints.value, route.query.player?.toString());
  }
  return {};
});

// Setup audio controller hook
const chartDataRef = computed<ConvertedOJN | undefined>(() => {
  if (!jsonData.value || !headerData.value || !hard.value) return undefined;
  return {
    header: headerData.value,
    ribbit: jsonData.value,
    hard: hard.value,
    hitSounds: hitSounds.value,
  };
});

let wasPlayingBeforeDrag = false;
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
  (timeMs) => {
    chartRenderer.value?.updatePlayheadPosition(timeMs);
  }
);

// Chart Renderer State
const chartRenderer = shallowRef<OjnChartRenderer | null>(null);

const initChartRenderer = () => {
  if (!pixiContainer.value) return;
  if (chartRenderer.value) {
    chartRenderer.value.destroy();
  }

  chartRenderer.value = new OjnChartRenderer(pixiContainer.value, {
    scaleW: scaleW.value,
    scaleH: scaleH.value,
    noteHeight: noteHeight.value,
    verticalMode: verticalMode.value,
    noLN: noLN.value,
    ohmMode: ohmMode.value,
    pattern: pattern.value,
    deathPointPlayer: deathPointPlayer.value,
    onSeek: (timeMs) => {
      seekTo(timeMs);
    },
    onBeforeDrag: () => {
      if (isPlaying.value) {
        wasPlayingBeforeDrag = true;
        pauseAudioPlayback();
      } else {
        wasPlayingBeforeDrag = false;
      }
    },
    onAfterDrag: () => {
      if (wasPlayingBeforeDrag) {
        startAudioPlayback(seekOffset.value);
        wasPlayingBeforeDrag = false;
      }
    }
  });
};

const triggerNoteRender = () => {
  if (!chartRenderer.value) {
    initChartRenderer();
  }

  if (chartRenderer.value && jsonData.value && headerData.value && hard.value) {
    chartRenderer.value.updateOptions({
      scaleW: scaleW.value,
      scaleH: scaleH.value,
      noteHeight: noteHeight.value,
      verticalMode: verticalMode.value,
      noLN: noLN.value,
      ohmMode: ohmMode.value,
      pattern: pattern.value,
      deathPointPlayer: deathPointPlayer.value,
    });

    const scrollPosition = chartRenderer.value.getScrollPosition();
    
    chartRenderer.value.render({
      header: headerData.value,
      ribbit: jsonData.value,
      hard: hard.value,
      hitSounds: hitSounds.value,
    });

    if (!verticalMode.value) {
      chartRenderer.value.setScrollPosition(scrollPosition);
    }

    chartRenderer.value.updatePlayheadPosition(seekOffset.value);
  }
  loading.value = false;
};

// URL parameters remote fetch handler
const { data: ojnData } = useAsyncData(
  "ojn",
  async () => {
    if (!route.query.server || !route.query.id) {
      return;
    }
    
    loading.value = true;
    if (route.query.server === "dmjam") {
      try {
        const failData = await $fetch(`/api/${route.query.server}/fail/${route.query.id}`);
        deathPoints.value = failData as DeathPoint;
      } catch (err) {
        console.warn("Failed to fetch deathpoints:", err);
      }
    }

    try {
      const ojnUrl = `https://ojn-api.dmjam.net/ojn-api/o2ma${route.query.id}.ojn`;
      const downloadedOjn = await $fetch(ojnUrl, {
        responseType: "arrayBuffer",
      });
      rawOjnBuffer.value = downloadedOjn as ArrayBuffer;
      selectedDifficulty.value = "hard";
      
      const convertedData = convert(downloadedOjn as ArrayBuffer, deathPoints.value, {}, "hard");
      jsonData.value = convertedData.ribbit;
      headerData.value = convertedData.header;
      hard.value = convertedData.hard;
      hitSounds.value = convertedData.hitSounds;
      showPanel.value = true;

      setTimeout(() => {
        triggerNoteRender();
      }, 5);
    } catch (error) {
      alert("OJN NOT FOUND " + error);
      loading.value = false;
    }
  },
  { server: false }
);

const handlePlaySongToggle = async () => {
  if (!jsonData.value || loading.value || isDecoding.value) return;

  if (isPlaying.value) {
    pauseAudioPlayback();
    return;
  }

  // Fetch OJM hit sound file if not yet loaded for DMJam
  if (
    route.query.server === "dmjam" &&
    route.query.id &&
    (!hitSounds.value || Object.keys(hitSounds.value).length === 0)
  ) {
    loading.value = true;
    try {
      const ojmUrl = `https://ojn-api.dmjam.net/ojn-api/o2ma${route.query.id}.ojm`;
      const downloadedOjm = await $fetch(ojmUrl, {
        responseType: "arrayBuffer",
      });
      hitSounds.value = OJMParser.parseContent(downloadedOjm as ArrayBuffer) as HitSound;
      await decodeAllSounds();
    } catch (error) {
      console.error("Failed to download or parse OJM:", error);
      alert("OJM download failed: " + error);
      return;
    } finally {
      loading.value = false;
    }
  }

  togglePlay();
};

const playSong = () => {
  handlePlaySongToggle();
};

const toggleSetting = () => {
  if (jsonData.value) {
    showPanel.value = !showPanel.value;
  }
};

const upload = async (uploadedFile: ConvertedOJN) => {
  deathPoints.value = {};
  selectedDifficulty.value = "hard";
  loading.value = true;
  jsonData.value = uploadedFile.ribbit;
  headerData.value = uploadedFile.header;
  hard.value = uploadedFile.hard;
  hitSounds.value = uploadedFile.hitSounds;
  rawOjnBuffer.value = uploadedFile.rawOjnBuffer || null;
  
  router.replace("/");
  stopSong();
  
  await decodeAllSounds();
  
  showPanel.value = true;
  setTimeout(() => {
    triggerNoteRender();
  }, 5);
};

const handleFileInputProcess = async (event: any) => {
  let fileList;
  let isDropped = false;
  if (event.target.files) {
    fileList = event.target.files;
  } else {
    fileList = event.dataTransfer.items;
    isDropped = true;
  }

  try {
    let parsedFiles = [];
    if (isDropped) {
      for (const item of fileList) {
        if (item != null && item.kind === "file") {
          parsedFiles.push(item.webkitGetAsEntry());
        }
      }
    } else {
      parsedFiles = fileList;
    }
    
    const output = await FileParser.parseFiles(parsedFiles, isDropped);
    upload(output);
  } catch (err) {
    alert("Parsing failed: " + err);
  }
};

const onMainInputChange = async (event: any) => {
  await handleFileInputProcess(event);
};

const onMainFilesDropped = async (event: any) => {
  await handleFileInputProcess(event);
};

const random = (isRandom: boolean) => {
  if (isRandom) {
    seed.value = shuffle("1234567".split("")).join("");
  }
  
  loading.value = true;
  setTimeout(() => {
    triggerNoteRender();
  }, 5);
};

const toggleOhmMode = (ohmModeValue: string) => {
  if (ohmModeValue === "you" && Object.keys(deathPointPlayer.value).length === 0) {
    alert("NO DATA");
    return;
  }
  
  loading.value = true;
  setTimeout(() => {
    triggerNoteRender();
  }, 200);
};

const toggleNoLN = () => {
  loading.value = true;
  setTimeout(() => {
    triggerNoteRender();
  }, 200);
};

const toggleVerticalMode = () => {
  loading.value = true;
  setTimeout(() => {
    triggerNoteRender();
  }, 200);
};

const updateScaleW = () => {
  triggerNoteRender();
};

const updateScaleH = () => {
  triggerNoteRender();
};

const updateNoteHeight = () => {
  triggerNoteRender();
};

const onChangeDifficulty = async (difficulty: "easy" | "normal" | "hard") => {
  if (!rawOjnBuffer.value) return;
  
  const wasPlaying = isPlaying.value;
  const currentOffset = seekOffset.value;
  
  if (wasPlaying) {
    pauseAudioPlayback();
  }
  
  selectedDifficulty.value = difficulty;
  loading.value = true;
  
  try {
    const convertedData = convert(rawOjnBuffer.value, deathPoints.value, hitSounds.value || {}, difficulty);
    jsonData.value = convertedData.ribbit;
    headerData.value = convertedData.header;
    hard.value = convertedData.hard;
    
    await decodeAllSounds();
    
    // Calculate max chart duration and clamp seek offset
    const maxDurationSec = headerData.value?.difficulty?.[difficulty]?.duration || 0;
    const chartDurationMs = getChartDurationMs() || maxDurationSec * 1000;
    const clampedOffset = Math.max(0, Math.min(currentOffset, chartDurationMs));
    
    // Seek back to the clamped offset in the new difficulty layout
    seekTo(clampedOffset);
    
    if (wasPlaying) {
      startAudioPlayback(clampedOffset);
    }
    
    setTimeout(() => {
      triggerNoteRender();
    }, 5);
  } catch (error) {
    console.error("Failed to swap difficulty:", error);
    alert("Failed to swap difficulty: " + error);
    loading.value = false;
  }
};

onMounted(() => {
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener("keydown", handleKeyDown);
  
  if (chartRenderer.value) {
    chartRenderer.value.destroy();
    chartRenderer.value = null;
  }
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
      return;
    }
    e.preventDefault();
    handlePlaySongToggle();
  }
};

const onResize = () => {
  setTimeout(() => {
    chartRenderer.value?.resize();
  }, 200);
};
</script>
