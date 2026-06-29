<template>
  <div class="flex-grow flex overflow-hidden w-full h-full bg-zinc-950">
    <!-- Main Studio View -->
    <div class="flex-grow bg-zinc-950 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      <!-- Checkerboard canvas wrapper -->
      <div class="relative checkerboard border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center bg-zinc-900/40 p-12 transition-all">
        <canvas
          ref="avatarCanvas"
          width="256"
          height="320"
          :style="{ transform: `scale(${zoomLevel})` }"
          class="image-rendering-pixelated origin-center transition-transform duration-200"
        ></canvas>
        
        <!-- Quick equipped checklist -->
        <div class="absolute bottom-4 left-4 right-4 flex gap-1.5 flex-wrap justify-center pointer-events-none">
          <span 
            v-for="(val, cat) in equippedItems"
            :key="cat"
            v-show="val && !['Body','LeftArm','RightArm','LeftHand','RightHand','Face'].includes(cat)"
            class="bg-zinc-950/80 backdrop-blur border border-zinc-800/80 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-mono text-center"
          >
            {{ cat }}
          </span>
        </div>
      </div>

      <!-- Animation Controls Bar -->
      <div class="mt-8 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex items-center space-x-6 w-full max-w-xl shadow-xl flex-shrink-0">
        <!-- Play/Pause -->
        <button 
          @click="togglePlay"
          class="h-10 w-10 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white flex items-center justify-center transition-colors active:scale-95 shadow-md shadow-emerald-950/30 flex-shrink-0"
        >
          <svg v-if="isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- Speed control -->
        <div class="flex-grow space-y-1">
          <div class="flex justify-between text-xs text-zinc-400 font-semibold font-mono">
            <span>Speed: {{ playbackFps }} FPS</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="30" 
            v-model="playbackFps"
            class="w-full bg-zinc-950 rounded-lg appearance-none h-1.5 focus:outline-none"
          />
        </div>

        <!-- Zoom control -->
        <div class="flex items-center space-x-1.5 border-l border-zinc-800 pl-4 flex-shrink-0">
          <button 
            @click="zoomLevel = Math.max(1, zoomLevel - 0.5)"
            class="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center transition-colors active:scale-95 text-sm font-bold"
          >
            -
          </button>
          <span class="text-xs font-bold font-mono w-10 text-center text-zinc-300">{{ zoomLevel.toFixed(1) }}x</span>
          <button 
            @click="zoomLevel = Math.min(4, zoomLevel + 0.5)"
            class="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center transition-colors active:scale-95 text-sm font-bold"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <!-- Customization Closet Column -->
    <div class="w-[400px] border-l border-zinc-800 bg-zinc-900/30 flex flex-col flex-shrink-0 overflow-hidden relative z-10">
      <!-- Top Switchers -->
      <div class="p-4 border-b border-zinc-800 bg-zinc-900/60 space-y-4">
        <!-- Gender Switcher -->
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-200">Gender</span>
          <div class="bg-zinc-950 p-1 rounded-lg border border-zinc-855 flex space-x-1">
            <button
              @click="gender = 'Male'"
              :class="gender === 'Male' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-300 hover:text-white'"
              class="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95"
            >
              Male
            </button>
            <button
              @click="gender = 'Female'"
              :class="gender === 'Female' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-300 hover:text-white'"
              class="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95"
            >
              Female
            </button>
          </div>
        </div>

        <!-- Instrument Switcher -->
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-200">Pose / Instrument</span>
          <div class="bg-zinc-950 p-1 rounded-lg border border-zinc-855 flex gap-0.5">
            <button
              v-for="inst in ['None', 'Guitar', 'Bass', 'Keyboard', 'Drum']"
              :key="inst"
              @click="instrument = inst"
              :class="instrument === inst ? 'bg-emerald-600/20 text-emerald-450 border-emerald-500/30' : 'border-transparent text-zinc-400 hover:text-white'"
              class="px-2 py-1 rounded text-[10px] font-bold border transition-all active:scale-95 uppercase font-mono"
            >
              {{ inst }}
            </button>
          </div>
        </div>

        <!-- Search and Filter Bar -->
        <div class="flex gap-2">
          <div class="relative flex-grow">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search items..."
              class="w-full bg-zinc-950 border border-zinc-855 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <label class="flex items-center space-x-2 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-855 text-[10px] font-bold text-zinc-350 cursor-pointer select-none">
            <input 
              type="checkbox" 
              v-model="showCompatibleOnly"
              class="rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500/20 bg-zinc-900"
            />
            <span>Gender match</span>
          </label>
        </div>
      </div>

      <!-- Category Selection List -->
      <div class="flex border-b border-zinc-800 bg-zinc-900/40 overflow-x-auto flex-shrink-0 scrollbar-none">
        <button
          v-for="cat in visibleCategories"
          :key="cat"
          @click="activeCategory = cat"
          :class="activeCategory === cat ? 'border-emerald-500 text-emerald-450 bg-zinc-900/20' : 'border-transparent text-zinc-400 hover:text-white'"
          class="flex-shrink-0 px-4 py-3 border-b-2 text-xs font-bold transition-all"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Item Catalog Grid -->
      <div class="flex-grow overflow-y-auto p-4 grid grid-cols-3 gap-2.5 content-start">
        <!-- Unequip slot button -->
        <div 
          v-show="equippedItems[activeCategory]"
          @click="unequipItem(activeCategory)"
          class="bg-zinc-900/60 border border-zinc-800 hover:border-red-950/40 hover:bg-red-950/10 rounded-xl p-3 flex flex-col items-center justify-center h-28 cursor-pointer transition-all hover:scale-[1.03] duration-150 relative group"
        >
          <div class="h-10 w-10 rounded-lg bg-zinc-950 flex items-center justify-center border border-zinc-855 text-zinc-400 group-hover:text-red-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div class="text-[10px] text-zinc-400 font-bold uppercase mt-2.5 group-hover:text-red-400 transition-colors">Unequip</div>
        </div>

        <!-- Catalog items -->
        <div 
          v-for="item in filteredCloset" 
          :key="item.id"
          @click="equipItem(item)"
          :class="{
            'border-emerald-500/50 bg-emerald-950/10 shadow-lg shadow-emerald-950/10': equippedItems[activeCategory]?.id === item.id,
            'border-zinc-850 bg-zinc-900/40 hover:border-zinc-750': equippedItems[activeCategory]?.id !== item.id
          }"
          class="border rounded-xl p-3 flex flex-col items-center justify-center h-28 cursor-pointer transition-all hover:scale-[1.03] duration-150 relative group"
        >
          <!-- Pixel art Image Thumbnail -->
          <div class="h-12 w-12 rounded-lg bg-zinc-950 flex items-center justify-center border border-zinc-850/60 overflow-hidden">
            <img 
              v-if="item.smallThumbnail && getItemThumbnailUrl(item.smallThumbnail)"
              :src="getItemThumbnailUrl(item.smallThumbnail)"
              class="max-h-full max-w-full image-rendering-pixelated transform scale-[1.3] object-contain"
            />
          </div>
          <div class="text-[10px] font-bold text-white text-center truncate w-full mt-2" :title="item.name">
            {{ item.name }}
          </div>
          
          <div class="absolute top-1.5 right-1.5 flex space-x-1">
            <span v-if="item.gender === 'Male'" class="text-[8px] bg-blue-600/20 text-blue-400 px-1 rounded font-mono font-bold">M</span>
            <span v-else-if="item.gender === 'Female'" class="text-[8px] bg-pink-600/20 text-pink-400 px-1 rounded font-mono font-bold">F</span>
          </div>
        </div>

        <!-- Empty state inside category -->
        <div 
          v-if="filteredCloset.length === 0" 
          class="col-span-3 py-12 flex flex-col items-center justify-center text-zinc-500 text-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-zinc-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <div class="text-xs font-semibold">No items available</div>
          <div class="text-[10px] text-zinc-600 mt-1">Try changing gender matching or search keywords</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { drawAvatar, getParsedSprite } from '../../utils/renderers/sprite-renderer';
import { type EquipmentCategory, type ItemMetadata } from '../../utils/parsers/itemdata-parser';

const {
  equippedItems,
  gender,
  instrument,
  frameTick,
  equipItem,
  unequipItem,
  clearEquipments,
  itemsCatalog
} = useAvatarState();

const activeCategory = ref<EquipmentCategory>("Hair");
const searchQuery = ref('');
const showCompatibleOnly = ref(true);
const playbackFps = ref(10);
const isPlaying = ref(true);
const zoomLevel = ref(1.5);

const avatarCanvas = ref<HTMLCanvasElement | null>(null);
let renderTimer: any = null;

const visibleCategories: EquipmentCategory[] = [
  "Hair",
  "Face",
  "Top",
  "Pants",
  "Shoes",
  "Costume",
  "Wings",
  "Keyboard",
  "Guitar",
  "Bass",
  "Drum",
  "LeftArm",
  "RightArm",
  "LeftHand",
  "RightHand",
  "Accessories"
];

const filteredCloset = computed(() => {
  if (itemsCatalog.value.length === 0) return [];
  
  return itemsCatalog.value.filter(item => {
    if (item.type !== activeCategory.value) return false;
    if (item.id >= 30 && item.id <= 36) return false;
    
    if (showCompatibleOnly.value) {
      if (item.gender !== "Any" && item.gender !== gender.value) return false;
    }
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchId = item.id.toString().includes(q);
      if (!matchName && !matchId) return false;
    }
    
    return true;
  });
});

const getItemThumbnailUrl = (fileName: string | null): string => {
  if (!fileName) return '';
  const archiveFiles = (window as any).__O2JAM_ARCHIVE_FILES__ || {};
  const ojs = getParsedSprite(fileName, archiveFiles);
  if (ojs && ojs.frames[0]) {
    return ojs.frames[0].previewUrl || '';
  }
  return '';
};

const togglePlay = () => {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    startAnimationTimer();
  } else {
    stopAnimationTimer();
  }
};

const startAnimationTimer = () => {
  if (renderTimer) clearInterval(renderTimer);
  
  const updateFrame = () => {
    frameTick.value++;
    drawAvatarComposite();
  };

  renderTimer = setInterval(updateFrame, 1000 / playbackFps.value);
};

const stopAnimationTimer = () => {
  if (renderTimer) {
    clearInterval(renderTimer);
    renderTimer = null;
  }
};

watch(playbackFps, () => {
  if (isPlaying.value) {
    startAnimationTimer();
  }
});

const drawAvatarComposite = () => {
  const canvas = avatarCanvas.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  drawAvatar(
    ctx,
    canvas.width,
    canvas.height,
    equippedItems.value,
    gender.value,
    instrument.value,
    frameTick.value,
    -22,
    30
  );
};

watch(equippedItems, () => {
  drawAvatarComposite();
}, { deep: true });

watch(gender, () => {
  drawAvatarComposite();
});

watch(instrument, () => {
  drawAvatarComposite();
});

const exportPng = () => {
  const canvas = avatarCanvas.value;
  if (!canvas) return;
  
  const link = document.createElement('a');
  link.download = `O2Jam_Avatar_${gender.value}_${Date.now()}.png`;
  link.href = canvas.toDataURL();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

onMounted(() => {
  drawAvatarComposite();
  if (isPlaying.value) {
    startAnimationTimer();
  }
});

onUnmounted(() => {
  stopAnimationTimer();
});

defineExpose({
  exportPng,
  clearEquipments
});
</script>

<style scoped>
.checkerboard {
  background-color: #0c0c0e;
  background-image: linear-gradient(45deg, #050506 25%, transparent 25%),
                    linear-gradient(-45deg, #050506 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #050506 75%),
                    linear-gradient(-45deg, transparent 75%, #050506 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  border: 1px solid #047857;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  border: 1px solid #047857;
}
</style>
