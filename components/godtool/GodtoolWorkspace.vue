<template>
  <div class="flex-grow flex overflow-hidden w-full h-full bg-zinc-950">
    <!-- Sidebar Explorer Column -->
    <div class="w-[320px] border-r border-zinc-800 bg-zinc-900/30 flex flex-col flex-shrink-0 overflow-hidden relative z-10">
      <!-- Search and filters -->
      <div class="p-4 border-b border-zinc-800 bg-zinc-900/60 space-y-3 flex-shrink-0">
        <div class="relative">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search archive files..."
            class="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <!-- Extension Filters -->
        <div class="flex gap-1">
          <button
            v-for="filter in ['all', 'ojs', 'bnd', 'other']"
            :key="filter"
            @click="activeFilter = filter"
            :class="activeFilter === filter ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200'"
            class="px-2.5 py-1 rounded text-xs font-semibold capitalize border transition-all"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="flex-grow overflow-y-auto divide-y divide-zinc-800/40 p-2 space-y-1">
        <button
          v-for="file in visibleFiles"
          :key="file.id"
          @click="selectFile(file)"
          :class="selectedFile?.id === file.id ? 'bg-zinc-800 border-zinc-700 text-white' : 'hover:bg-zinc-800/30 text-zinc-400 hover:text-zinc-200 border-transparent'"
          class="w-full text-left px-3 py-2.5 rounded-lg border flex items-center justify-between transition-all group"
        >
          <div class="min-w-0 flex items-center space-x-2.5">
            <!-- Icon -->
            <div class="flex-shrink-0">
              <svg v-if="file.name.toLowerCase().endsWith('.ojs') || file.name.toLowerCase().endsWith('.oji') || file.name.toLowerCase().endsWith('.ojt')" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <svg v-else-if="file.name.toLowerCase().endsWith('.bnd')" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="truncate text-xs font-semibold" :title="file.name">
              {{ file.name }}
            </div>
          </div>
          <div class="text-[10px] text-zinc-500 font-mono font-bold flex-shrink-0 pl-2">
            {{ formatBytes(file.actualSize) }}
          </div>
        </button>

        <div v-if="filteredFiles.length > MAX_VISIBLE_FILES" class="text-center py-2 text-[10px] text-zinc-500 font-medium">
          Showing first {{ MAX_VISIBLE_FILES }} of {{ filteredFiles.length }} files
        </div>
      </div>
    </div>

    <!-- Inspector Viewport Column -->
    <div class="flex-grow flex overflow-hidden">
      <!-- Welcome state if no file selected -->
      <div v-if="!selectedFile" class="flex-grow flex flex-col items-center justify-center p-8 bg-zinc-950 text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-zinc-800 mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
        </svg>
        <h3 class="text-md font-bold text-zinc-400">Select an archive resource</h3>
        <p class="text-xs text-zinc-600 mt-1.5 max-w-xs text-center leading-relaxed">
          Choose a file from the sidebar tree to parse dynamic OJS animation cycles, visual boundaries grids, raw text, or hex dumps.
        </p>
      </div>

      <!-- OJS Sprite Viewer Workspace -->
      <div v-else-if="detectedType === 'ojs' && ojsData" class="flex-grow flex overflow-hidden">
        <!-- Render Viewport -->
        <div class="flex-grow flex flex-col items-center justify-center p-6 overflow-hidden relative">
          <!-- Canvas Viewport -->
          <div class="relative checkerboard border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center bg-zinc-900/40 p-12">
            <canvas
              ref="mainCanvas"
              :style="{ transform: `scale(${zoomLevel})` }"
              class="image-rendering-pixelated origin-center transition-transform duration-200"
            ></canvas>
            
            <div class="absolute bottom-4 left-4 bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-zinc-400 font-mono space-y-0.5 pointer-events-none">
              <div>Dimension: {{ activeFrame?.width ?? 0 }}x{{ activeFrame?.height ?? 0 }}</div>
              <div>Offset: X={{ activeFrame?.x ?? 0 }}, Y={{ activeFrame?.y ?? 0 }}</div>
            </div>
          </div>

          <!-- Controls Bar -->
          <div class="mt-8 bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex items-center space-x-6 w-full max-w-xl shadow-xl flex-shrink-0">
            <!-- Play/Pause -->
            <button
              @click="togglePlayback"
              class="h-10 w-10 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white flex items-center justify-center transition-colors active:scale-95 shadow-lg shadow-emerald-950/30 flex-shrink-0"
            >
              <svg v-if="isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <!-- Frame Selector -->
            <div class="flex items-center space-x-2 border-r border-zinc-800 pr-4 flex-shrink-0">
              <button @click="prevFrame" class="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold transition-all active:scale-95">&lt;</button>
              <span class="text-xs font-bold font-mono w-14 text-center text-zinc-300">
                {{ activeFrameIndex + 1 }} / {{ ojsData.frameCount }}
              </span>
              <button @click="nextFrame" class="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold transition-all active:scale-95">&gt;</button>
            </div>

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
            <div class="flex items-center space-x-1.5 pl-4 flex-shrink-0">
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

          <div class="mt-4 flex space-x-3 flex-shrink-0">
            <button
              @click="exportCurrentFrame"
              class="px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Frame PNG</span>
            </button>
          </div>
        </div>

        <!-- Frame Animation Playlist Sidebar -->
        <div class="w-[280px] border-l border-zinc-800 bg-zinc-900/30 flex flex-col flex-shrink-0 overflow-hidden">
          <div class="px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 flex-shrink-0">
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-400">OJS Frame List</h3>
          </div>
          <div class="flex-grow overflow-y-auto p-4 grid grid-cols-2 gap-2 content-start">
            <button
              v-for="(frame, idx) in ojsData.frames"
              :key="idx"
              :ref="el => { if (el) frameButtons[idx] = el as HTMLButtonElement }"
              @click="selectFrame(idx)"
              :class="activeFrameIndex === idx ? 'border-emerald-500 bg-emerald-950/15' : 'border-zinc-850 bg-zinc-950/50 hover:border-zinc-750'"
              class="border rounded-xl p-2.5 flex flex-col items-center justify-center h-24 transition-all relative group"
            >
              <div class="h-10 w-12 rounded-lg bg-zinc-950/70 border border-zinc-850 flex items-center justify-center overflow-hidden">
                <img :src="frame.previewUrl" class="max-h-full max-w-full image-rendering-pixelated transform scale-110" />
              </div>
              <div class="text-[9px] font-mono font-bold mt-2" :class="activeFrameIndex === idx ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'">
                Frame {{ idx + 1 }}
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- BND Boundaries Layout Visualizer Workspace -->
      <div v-else-if="detectedType === 'bnd' && bndData" class="flex-grow flex overflow-hidden">
        <!-- Visual Grid Area -->
        <div class="flex-grow flex flex-col items-center justify-center p-6 overflow-hidden relative bg-zinc-950">
          <div class="relative w-[360px] h-[360px] border-2 border-zinc-800 bg-zinc-900/20 rounded-2xl shadow-inner flex items-center justify-center">
            <!-- Box nodes scaled relative inside -->
            <div
              v-for="(bound, idx) in scaledBoundaries"
              :key="idx"
              @mouseenter="highlightedBoundIndex = idx"
              @mouseleave="highlightedBoundIndex = null"
              :style="{
                left: `${bound.left}%`,
                top: `${bound.top}%`,
                width: `${bound.width}%`,
                height: `${bound.height}%`
              }"
              :class="highlightedBoundIndex === idx ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/10' : 'border-blue-500 bg-blue-500/5'"
              class="absolute border-2 rounded transition-all cursor-pointer pointer-events-auto"
            >
              <span class="absolute -top-4 -left-1 text-[8px] font-bold font-mono px-1 rounded text-zinc-200" :class="highlightedBoundIndex === idx ? 'bg-emerald-600' : 'bg-blue-600'">
                #{{ idx }}
              </span>
            </div>
            
            <div v-if="bndData.count === 0" class="text-zinc-600 text-xs font-semibold">
              No boundary layout parameters defined
            </div>
          </div>
        </div>

        <!-- Coordinates list side panel -->
        <div class="w-[360px] border-l border-zinc-800 bg-zinc-900/30 flex flex-col flex-shrink-0 overflow-hidden">
          <div class="px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 flex-shrink-0">
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Boundary Boxes ({{ bndData.count }})</h3>
          </div>
          <div class="flex-grow overflow-y-auto">
            <div class="p-3">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800">
                    <th class="px-4 py-2">ID</th>
                    <th class="px-4 py-2 font-mono">X</th>
                    <th class="px-4 py-2 font-mono">Y</th>
                    <th class="px-4 py-2 font-mono">W</th>
                    <th class="px-4 py-2 font-mono">H</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/40 text-zinc-300 font-mono text-xs">
                  <tr
                    v-for="(bound, idx) in bndData.coordinates"
                    :key="idx"
                    @mouseenter="highlightedBoundIndex = idx"
                    @mouseleave="highlightedBoundIndex = null"
                    :class="highlightedBoundIndex === idx ? 'bg-zinc-800/40 text-white' : 'hover:bg-zinc-900/30'"
                    class="transition-colors group cursor-pointer"
                  >
                    <td class="px-4 py-2 font-bold text-zinc-500 group-hover:text-zinc-400">#{{ idx }}</td>
                    <td class="px-4 py-2">{{ bound.x }}</td>
                    <td class="px-4 py-2">{{ bound.y }}</td>
                    <td class="px-4 py-2">{{ bound.width }}</td>
                    <td class="px-4 py-2">{{ bound.height }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Plain Text Workspace -->
      <div v-else-if="detectedType === 'text'" class="flex-grow flex flex-col overflow-hidden bg-zinc-950 p-6">
        <pre class="flex-grow overflow-auto p-5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs font-mono text-zinc-300 select-text whitespace-pre leading-normal shadow-inner">{{ textContent }}</pre>
      </div>

      <!-- Native Images Workspace -->
      <div v-else-if="detectedType === 'image'" class="flex-grow flex items-center justify-center p-6 bg-zinc-950">
        <div class="relative max-w-full max-h-full border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl p-8 flex items-center justify-center checkerboard">
          <img :src="imageBlobUrl" class="max-h-[70vh] max-w-[80vw] object-contain rounded image-rendering-pixelated" />
        </div>
      </div>

      <!-- Audio Workspace -->
      <div v-else-if="detectedType === 'audio'" class="flex-grow flex items-center justify-center p-6 bg-zinc-950">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4">
          <div class="p-4 bg-emerald-600/10 text-emerald-400 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <audio controls :src="audioBlobUrl" class="w-full"></audio>
        </div>
      </div>

      <!-- Hex Binary Inspector Workspace (Fallback) -->
      <div v-else class="flex-grow flex flex-col overflow-hidden bg-zinc-950 p-6">
        <div class="text-xs bg-zinc-900/60 border border-zinc-850 rounded-lg p-3 font-mono text-zinc-400 space-y-1 mb-4 flex-shrink-0 flex justify-between">
          <div><strong>File Offset:</strong> {{ selectedFile.fileOffset }} bytes</div>
          <div><strong>Actual Size:</strong> {{ selectedFile.actualSize }} bytes</div>
        </div>
        <pre class="flex-grow overflow-auto p-4 bg-zinc-900 border border-zinc-850 rounded-lg text-xs font-mono text-zinc-400 select-text whitespace-pre leading-normal shadow-inner">{{ hexDump }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { parseOjs, type OjsData, type OjsFrame } from '../../utils/parsers/ojs-parser';
import { parseBnd, type BndData, type Boundary } from '../../utils/parsers/bnd-parser';
import { type OpiFile, type OpiArchive } from '../../utils/parsers/opi-parser';

interface Props {
  initialArchive: OpiArchive;
}

const props = defineProps<Props>();

// State variables
const opiArchive = ref<OpiArchive | null>(null);
const searchQuery = ref<string>('');
const activeFilter = ref<string>('all');
const selectedFile = ref<OpiFile | null>(null);

// Specific File Parsed Data
const ojsData = ref<OjsData | null>(null);
const bndData = ref<BndData | null>(null);

// Content Type Detection states
const detectedType = ref<'ojs' | 'bnd' | 'image' | 'text' | 'audio' | 'unknown'>('unknown');
const textContent = ref<string>('');
const imageBlobUrl = ref<string>('');
const audioBlobUrl = ref<string>('');
const hexDump = ref<string>('');

const cleanupUrls = () => {
  if (imageBlobUrl.value) {
    URL.revokeObjectURL(imageBlobUrl.value);
    imageBlobUrl.value = '';
  }
  if (audioBlobUrl.value) {
    URL.revokeObjectURL(audioBlobUrl.value);
    audioBlobUrl.value = '';
  }
};

// Highlight state for BND table/grid
const highlightedBoundIndex = ref<number | null>(null);

// Animation Player state
const isPlaying = ref<boolean>(false);
const activeFrameIndex = ref<number>(0);
const playbackFps = ref<number>(10);
const loopPlayback = ref<boolean>(true);
const zoomLevel = ref<number>(1.5);
let playbackTimer: ReturnType<typeof setInterval> | null = null;

// Refs
const mainCanvas = ref<HTMLCanvasElement | null>(null);
const frameButtons = ref<HTMLButtonElement[]>([]);

// Computeds
const MAX_VISIBLE_FILES = 150;

const filteredFiles = computed(() => {
  if (!opiArchive.value) return [];
  return opiArchive.value.files.filter(file => {
    const ext = getExtension(file.name).toLowerCase();
    const nameMatch = file.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    if (!nameMatch) return false;
    if (activeFilter.value === 'all') return true;
    if (activeFilter.value === 'ojs') return ext === 'ojs' || ext === 'oji' || ext === 'ojt';
    if (activeFilter.value === 'bnd') return ext === 'bnd';
    if (activeFilter.value === 'other') return ext !== 'ojs' && ext !== 'oji' && ext !== 'ojt' && ext !== 'bnd';
    return true;
  });
});

const visibleFiles = computed(() => {
  return filteredFiles.value.slice(0, MAX_VISIBLE_FILES);
});

const activeFrame = computed(() => {
  if (!ojsData.value || activeFrameIndex.value < 0 || activeFrameIndex.value >= ojsData.value.frameCount) {
    return null;
  }
  return ojsData.value.frames[activeFrameIndex.value];
});

// Scaled boundary coordinates for grid preview
const scaledBoundaries = computed(() => {
  if (!bndData.value || bndData.value.count === 0) return [];
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const b of bndData.value.coordinates) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  
  const widthSpan = maxX - minX || 256;
  const heightSpan = maxY - minY || 256;
  const globalMinX = minX === Infinity ? 0 : minX;
  const globalMinY = minY === Infinity ? 0 : minY;
  
  return bndData.value.coordinates.map(b => {
    const left = ((b.x - globalMinX) / widthSpan) * 90 + 5;
    const top = ((b.y - globalMinY) / heightSpan) * 90 + 5;
    const w = (b.width / widthSpan) * 90;
    const h = (b.height / heightSpan) * 90;
    return { left, top, width: w, height: h };
  });
});

// Methods
const getExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const selectFile = (file: OpiFile | null) => {
  selectedFile.value = file;
  ojsData.value = null;
  bndData.value = null;
  textContent.value = '';
  hexDump.value = '';
  cleanupUrls();
  activeFrameIndex.value = 0;
  highlightedBoundIndex.value = null;
  stopPlayback();
  
  if (!file) return;

  const buffer = file.data;
  let type: 'ojs' | 'bnd' | 'image' | 'text' | 'audio' | 'unknown' = 'unknown';

  if (buffer.length >= 8) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const rgbFormat = view.getUint32(0, true);
    if ((rgbFormat >> 16) === 0x0555) {
      type = 'ojs';
    }
  }

  if (type === 'unknown' && buffer.length >= 4) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    if (view.getInt32(0, true) === -1 && file.name.toLowerCase().endsWith('.bnd')) {
      type = 'bnd';
    }
  }

  if (type === 'unknown' && buffer.length >= 2) {
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isGif = buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isBmp = buffer[0] === 0x42 && buffer[1] === 0x4D;

    if (isJpeg || isPng || isGif || isBmp) {
      type = 'image';
    }
  }

  if (type === 'unknown' && buffer.length >= 4) {
    const isWav = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isMp3 = (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0);
    if (isWav || isMp3) {
      type = 'audio';
    }
  }

  if (type === 'unknown') {
    let isPlainTxt = true;
    const checkLen = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLen; i++) {
      const b = buffer[i];
      if (b < 32 && b !== 9 && b !== 10 && b !== 13) {
        isPlainTxt = false;
        break;
      }
    }
    if (isPlainTxt) {
      type = 'text';
    }
  }

  detectedType.value = type;

  if (type === 'ojs') {
    try {
      ojsData.value = parseOjs(buffer, file.name);
      activeFrameIndex.value = 0;
      nextTick(() => {
        drawActiveFrame();
      });
    } catch (err) {
      console.warn("Failed to parse OJS sprite, falling back to hex:", err);
      detectedType.value = 'unknown';
      generateHexDump(buffer);
    }
  } else if (type === 'bnd') {
    try {
      bndData.value = parseBnd(buffer);
    } catch (err) {
      console.warn("Failed to parse BND boundaries, falling back to hex:", err);
      detectedType.value = 'unknown';
      generateHexDump(buffer);
    }
  } else if (type === 'image') {
    let mimeType = 'image/jpeg';
    if (buffer[0] === 0x89) mimeType = 'image/png';
    else if (buffer[0] === 0x47) mimeType = 'image/gif';
    else if (buffer[0] === 0x42) mimeType = 'image/bmp';

    const blob = new Blob([buffer as any], { type: mimeType });
    imageBlobUrl.value = URL.createObjectURL(blob);
  } else if (type === 'audio') {
    const mimeType = buffer[0] === 0x52 ? 'audio/wav' : 'audio/mpeg';
    const blob = new Blob([buffer as any], { type: mimeType });
    audioBlobUrl.value = URL.createObjectURL(blob);
  } else if (type === 'text') {
    try {
      textContent.value = new TextDecoder('euc-kr').decode(buffer);
    } catch {
      textContent.value = new TextDecoder('utf-8').decode(buffer);
    }
  } else {
    generateHexDump(buffer);
  }
};

const generateHexDump = (buffer: Uint8Array) => {
  const lines: string[] = [];
  const bytesPerLine = 16;
  const maxBytes = Math.min(buffer.length, 1024);
  
  for (let i = 0; i < maxBytes; i += bytesPerLine) {
    const chunk = buffer.slice(i, i + bytesPerLine);
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
    lines.push(`${i.toString(16).padStart(6, '0')}:  ${hex.padEnd(48)}  |${ascii}|`);
  }
  if (buffer.length > maxBytes) {
    lines.push('... truncated (showing first 1KB) ...');
  }
  hexDump.value = lines.join('\n');
};

const drawActiveFrame = () => {
  const canvas = mainCanvas.value;
  if (!canvas || !activeFrame.value) return;
  
  const frame = activeFrame.value;
  canvas.width = frame.width;
  canvas.height = frame.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (frame.width === 0 || frame.height === 0) return;

  if (frame.canvas) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame.canvas, 0, 0);
  } else if (frame.previewUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
    };
    img.src = frame.previewUrl;
  }
};

const selectFrame = (index: number) => {
  activeFrameIndex.value = index;
  drawActiveFrame();
  nextTick(() => {
    const btn = frameButtons.value[index];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
};

const exportCurrentFrame = () => {
  if (!activeFrame.value || !activeFrame.value.previewUrl) return;
  
  const link = document.createElement('a');
  link.download = `${selectedFile.value?.name || 'frame'}_f${activeFrameIndex.value}.png`;
  link.href = activeFrame.value.previewUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const nextFrame = () => {
  if (!ojsData.value) return;
  let idx = activeFrameIndex.value + 1;
  if (idx >= ojsData.value.frameCount) {
    idx = 0;
  }
  selectFrame(idx);
};

const prevFrame = () => {
  if (!ojsData.value) return;
  let idx = activeFrameIndex.value - 1;
  if (idx < 0) {
    idx = ojsData.value.frameCount - 1;
  }
  selectFrame(idx);
};

const togglePlayback = () => {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    startPlayback();
  }
};

const startPlayback = () => {
  if (!ojsData.value || ojsData.value.frameCount <= 1) return;
  isPlaying.value = true;
  
  const runTimer = () => {
    const interval = 1000 / playbackFps.value;
    playbackTimer = setTimeout(() => {
      if (!isPlaying.value) return;
      
      let nextIdx = activeFrameIndex.value + 1;
      if (nextIdx >= (ojsData.value?.frameCount || 0)) {
        if (!loopPlayback.value) {
          stopPlayback();
          return;
        }
        nextIdx = 0;
      }
      
      selectFrame(nextIdx);
      runTimer();
    }, interval);
  };
  
  runTimer();
};

const stopPlayback = () => {
  isPlaying.value = false;
  if (playbackTimer) {
    clearTimeout(playbackTimer);
    playbackTimer = null;
  }
};

watch(playbackFps, () => {
  if (isPlaying.value) {
    stopPlayback();
    startPlayback();
  }
});

watch(activeFrameIndex, () => {
  drawActiveFrame();
});

watch(ojsData, (newVal) => {
  if (newVal) {
    nextTick(() => {
      drawActiveFrame();
    });
  }
});

watch(() => props.initialArchive, (newVal) => {
  if (newVal) {
    opiArchive.value = newVal;
    selectFile(null);
  }
}, { immediate: true });

onUnmounted(() => {
  stopPlayback();
  cleanupUrls();
});
</script>

<style scoped>
/* Checkerboard background */
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
