<template>
  <header 
    class="flex justify-between items-center h-[60px] bg-zinc-900 border-b border-zinc-800 px-3 sm:px-4 md:px-6 flex-shrink-0 z-20 text-white select-none font-sans"
  >
    <!-- Left side: Song details (for player/radio) OR Tool title (for dressing/godtool) -->
    <div class="flex items-center min-w-0 flex-grow sm:flex-grow-0">
      <div v-if="(currentView === 'player' || currentView === 'radio') && loadedChart" class="flex items-center space-x-2.5 sm:space-x-4 min-w-0 w-full sm:w-auto">
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
          <div class="hidden xl:flex items-center space-x-3 flex-shrink-0 text-xs">
            <span v-if="sanitizedNoter" class="flex items-center space-x-1 max-w-[280px]">
              <span class="text-zinc-500 font-medium">obj:</span>
              <span class="text-zinc-100 font-bold truncate" :title="sanitizedNoter">{{ sanitizedNoter }}</span>
            </span>
            <span class="flex items-center space-x-1">
              <span class="text-zinc-500 font-medium">BPM:</span>
              <span class="text-zinc-100 font-bold">{{ formattedBpm }}</span>
            </span>
            <span v-if="currentView === 'player'" class="flex items-center space-x-1">
              <span class="text-zinc-500 font-medium">Notes:</span>
              <span class="text-zinc-100 font-bold">{{ loadedChart.header?.difficulty?.[selectedDifficulty]?.note_count || 0 }}</span>
            </span>
            <span class="flex items-center space-x-1">
              <span class="text-zinc-500 font-medium">Time:</span>
              <span class="text-zinc-100 font-bold">
                <template v-if="currentView === 'radio' && currentTimeFormatted && totalTimeFormatted">
                  {{ currentTimeFormatted }} / {{ totalTimeFormatted }}
                </template>
                <template v-else>
                  {{ fancyTimeFormat(loadedChart.header?.difficulty?.[selectedDifficulty]?.duration || 0) }}
                </template>
              </span>
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
    <div class="flex items-center space-x-2 sm:space-x-6 flex-shrink-0 pl-2">
      <!-- Mobile/Tablet actions (hidden on desktop) -->
      <div class="flex xl:hidden items-center space-x-2">
        <!-- Play / Stop Button -->
        <button 
          v-show="(currentView === 'player' || currentView === 'radio') && loadedChart"
          @click="$emit('togglePlay')" 
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
          v-show="(currentView === 'player' || currentView === 'radio') && loadedChart"
          @click="$emit('toggleSetting')" 
          aria-label="Settings"
          class="w-10 h-10 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <!-- Exit Button -->
        <button 
          v-show="currentView !== 'player' && currentView !== 'radio'"
          @click="$emit('exit')"
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
        <!-- Radio-specific status indicator -->
        <div v-if="currentView === 'radio'" class="flex items-center space-x-4 pr-2">
          <!-- Connection status badge -->
          <div class="flex items-center space-x-1.5 bg-zinc-950/40 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] sm:text-xs">
            <span class="flex h-1.5 w-1.5 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            <span class="font-semibold text-zinc-300">
              {{ isHost ? 'Host' : 'Listener' }} ({{ peersCount || 0 }})
            </span>
          </div>
        </div>

        <!-- Player Controls inside header -->
        <div v-show="(currentView === 'player' || currentView === 'radio') && loadedChart" class="flex items-center space-x-4 flex-shrink-0">
          <div class="flex items-center space-x-2 text-xl select-none mr-2">
            <span class="text-zinc-400 font-bold uppercase tracking-wider text-xs">Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="volumeLevel"
              @input="onVolumeInput"
              class="w-24 h-1.5 bg-zinc-700/90 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span class="w-8 text-right font-bold text-white text-sm">{{ Math.round(volumeLevel * 100) }}%</span>
          </div>
          <!-- Play / Stop Button -->
          <button 
            @click="$emit('togglePlay')" 
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
            @click="$emit('toggleSetting')" 
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
            @click="$emit('exportPng')"
            class="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export PNG</span>
          </button>
          <button 
            @click="$emit('clearEquipments')"
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
          @click="$emit('exit')"
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
</template>

<script setup lang="ts">
import { computed } from "vue";
import { fancyTimeFormat } from "~/utils/helpers/formatter";
import type { ConvertedOJN } from "~/types/dmjam";

const props = defineProps<{
  currentView: "landing" | "player" | "dressing" | "godtool" | "radio";
  loadedChart: ConvertedOJN | null;
  selectedDifficulty: "easy" | "normal" | "hard";
  isPlaying: boolean;
  volumeLevel: number;
  showSettings: boolean;
  activeWorkspaceLabel?: string;
  // Radio Mode specific:
  isHost?: boolean;
  peersCount?: number;
  currentTimeFormatted?: string;
  totalTimeFormatted?: string;
}>();

const emit = defineEmits<{
  (e: "update:volumeLevel", val: number): void;
  (e: "update:showSettings", val: boolean): void;
  (e: "togglePlay"): void;
  (e: "toggleSetting"): void;
  (e: "exit"): void;
  (e: "exportPng"): void;
  (e: "clearEquipments"): void;
}>();

const onVolumeInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:volumeLevel", parseFloat(target.value));
};

const sanitizedTitle = computed(() => {
  if (!props.loadedChart?.header?.title) return "";
  return props.loadedChart.header.title.replace(/\.ojn$/i, "");
});

const sanitizedArtist = computed(() => {
  if (!props.loadedChart?.header?.artist) return "";
  return props.loadedChart.header.artist;
});

const sanitizedNoter = computed(() => {
  if (!props.loadedChart?.header?.noter) return "";
  return props.loadedChart.header.noter;
});

const formattedBpm = computed(() => {
  if (!props.loadedChart?.header?.bpm) return "0";
  return Math.round(props.loadedChart.header.bpm).toString();
});
</script>
