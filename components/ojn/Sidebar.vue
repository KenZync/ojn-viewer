<template>
  <div class="pb-6">
    <button
      @click="$emit('close')"
      class="text-xl font-bold pt-4 w-full text-right hover:text-stone-300 transition-colors"
    >
      Close
    </button>

    <!-- Seed Selection -->
    <div class="mt-4 space-y-2">
      <div class="text-sm font-semibold text-stone-300">Seed / Ringcon</div>
      <div class="flex w-full space-x-2">
        <input
          v-model="seed"
          placeholder="seed"
          class="w-full text-black px-2 py-1 rounded text-sm bg-zinc-100 focus:bg-white focus:outline-none"
        />
        <img
          alt="random_ring"
          src="/random_ring.jpg"
          class="w-8 h-8 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          @click="$emit('random', true)"
        />
      </div>
    </div>

    <!-- Layout & Chart Modifiers -->
    <div class="mt-6 space-y-3 flex flex-col">
      <!-- Difficulty Selection -->
      <div class="space-y-1">
        <div class="text-sm font-semibold text-stone-300">Difficulty</div>
        <div class="grid grid-cols-3 gap-1">
          <button
            @click="$emit('changeDifficulty', 'easy')"
            :class="[
              selectedDifficulty === 'easy'
                ? 'bg-emerald-600 text-white font-bold border-2 border-emerald-400'
                : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700 border border-zinc-700',
            ]"
            class="py-1 px-1 rounded-md text-xs text-center transition-all duration-150"
          >
            EX - {{ headerData?.difficulty?.easy?.level ?? "–" }}
          </button>
          <button
            @click="$emit('changeDifficulty', 'normal')"
            :class="[
              selectedDifficulty === 'normal'
                ? 'bg-amber-600 text-white font-bold border-2 border-amber-400'
                : 'bg-zinc-800 text-amber-400 hover:bg-zinc-700 border border-zinc-700',
            ]"
            class="py-1 px-1 rounded-md text-xs text-center transition-all duration-150"
          >
            NX - {{ headerData?.difficulty?.normal?.level ?? "–" }}
          </button>
          <button
            @click="$emit('changeDifficulty', 'hard')"
            :class="[
              selectedDifficulty === 'hard'
                ? 'bg-rose-600 text-white font-bold border-2 border-rose-400'
                : 'bg-zinc-800 text-rose-400 hover:bg-zinc-700 border border-zinc-700',
            ]"
            class="py-1 px-1 rounded-md text-xs text-center transition-all duration-150"
          >
            HX - {{ headerData?.difficulty?.hard?.level ?? "–" }}
          </button>
        </div>
      </div>

      <!-- Playback Controls -->
      <div class="space-y-3 mt-1">
        <div class="text-sm font-semibold text-stone-300">
          Playback Controls
        </div>
        <!-- Volume Slider -->
        <div class="space-y-1">
          <div class="flex justify-between text-xs text-stone-400">
            <label for="sidebar-vol-slider"
              >Volume: {{ Math.round(sidebarVolume * 100) }}%</label
            >
          </div>
          <input
            id="sidebar-vol-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            v-model="sidebarVolume"
            class="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      <div class="text-sm font-semibold text-stone-300">Chart Settings</div>

      <!-- Long Notes Option -->
      <div class="space-y-1">
        <div class="text-xs text-stone-400">Long Notes</div>
        <div
          class="flex bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 select-none"
        >
          <button
            @click="setNoLN(false)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': !noLN,
              'text-stone-400 hover:text-stone-200': noLN,
            }"
            class="w-1/2 py-1 px-0.5 text-center rounded-md text-xs transition-all duration-150 flex items-center justify-center space-x-0.5"
          >
            <span
              v-if="!noLN"
              class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
            ></span>
            <span class="truncate">Show</span>
          </button>
          <button
            @click="setNoLN(true)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': noLN,
              'text-stone-400 hover:text-stone-200': !noLN,
            }"
            class="w-1/2 py-1 px-0.5 text-center rounded-md text-xs transition-all duration-150 flex items-center justify-center space-x-0.5"
          >
            <span
              v-if="noLN"
              class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
            ></span>
            <span class="truncate">Hide</span>
          </button>
        </div>
      </div>

      <!-- Layout Mode Option -->
      <div class="space-y-1">
        <div class="text-xs text-stone-400">Layout Mode</div>
        <div
          class="flex bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 select-none"
        >
          <button
            @click="setVerticalMode(false)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': !verticalMode,
              'text-stone-400 hover:text-stone-200': verticalMode,
            }"
            class="w-1/2 py-1 px-1 text-center rounded-md text-[11px] transition-all duration-150 flex items-center justify-center space-x-1"
          >
            <span
              v-if="!verticalMode"
              class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
            ></span>
            <span>Horizontal</span>
          </button>
          <button
            @click="setVerticalMode(true)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': verticalMode,
              'text-stone-400 hover:text-stone-200': !verticalMode,
            }"
            class="w-1/2 py-1 px-1 text-center rounded-md text-[11px] transition-all duration-150 flex items-center justify-center space-x-1"
          >
            <span
              v-if="verticalMode"
              class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
            ></span>
            <span>Vertical</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Chart Metadata info -->
    <div
      v-if="headerData"
      class="mt-6 border-t border-zinc-600 pt-4 space-y-2 text-sm text-stone-300"
    >
      <div class="text-sm font-semibold text-stone-200">Metadata</div>
      <div class="flex flex-col" v-if="route.query.server && route.query.id">
        <div class="flex justify-center my-2">
          <img alt="ohm" src="/ohm.png" class="w-16" />
        </div>
        <RadioGroup
          v-model="ohmMode"
          @update:model-value="$emit('toggleOhmMode', ohmMode)"
        />
      </div>
      <div>Song ID: {{ headerData.song_id }}</div>
      <div v-if="headerData.noter">Object: {{ headerData.noter }}</div>
      <div>BPM: {{ headerData.bpm }}</div>
      <div>
        Notes:
        {{ headerData.difficulty?.[selectedDifficulty]?.note_count || 0 }}
      </div>
      <div>
        Time:
        {{
          fancyTimeFormat(
            headerData.difficulty?.[selectedDifficulty]?.duration || 0,
          )
        }}
      </div>
      <div v-if="headerData.bmp" class="space-y-1">
        <div class="text-xs text-stone-400">BMP Info</div>
        <img
          :src="headerData.bmp"
          alt="BMP"
          class="rounded border border-stone-600"
        />
      </div>
      <div v-if="headerData.image" class="space-y-1">
        <div class="text-xs text-stone-400">Cover Image</div>
        <img
          :src="headerData.image"
          alt="Image"
          class="rounded border border-stone-600"
        />
      </div>
    </div>

    <!-- Scale Settings -->
    <div class="mt-6 border-t border-zinc-600 pt-4 space-y-4">
      <div class="text-sm font-semibold text-stone-300">Scale Settings</div>

      <!-- Lane Width -->
      <div class="space-y-1">
        <div class="flex justify-between text-xs text-stone-400">
          <label for="width-scale-slider">Lane Width: {{ scaleW }}</label>
        </div>
        <input
          id="width-scale-slider"
          type="range"
          min="4"
          max="24"
          step="1"
          v-model.number="scaleW"
          @input="$emit('updateScaleW', scaleW)"
          class="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <!-- Lane Height -->
      <div class="space-y-1">
        <div class="flex justify-between text-xs text-stone-400">
          <label for="height-scale-slider">Lane Height: {{ scaleH }}x</label>
        </div>
        <input
          id="height-scale-slider"
          type="range"
          min="0.5"
          max="20.0"
          step="0.1"
          v-model.number="scaleH"
          @input="$emit('updateScaleH', scaleH)"
          class="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <!-- Note Height -->
      <div class="space-y-1">
        <div class="flex justify-between text-xs text-stone-400">
          <label for="note-height-slider"
            >Note Height: {{ noteHeight }}px</label
          >
        </div>
        <input
          id="note-height-slider"
          type="range"
          min="2"
          max="30"
          step="1"
          v-model.number="noteHeight"
          @input="$emit('updateNoteHeight', noteHeight)"
          class="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <!-- Exit Workspace (Mobile/Squeeze viewport only) -->
      <div class="block xl:hidden mt-6 border-t border-zinc-700/50 pt-4">
        <button
          @click="$emit('exit')"
          class="w-full bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 py-2.5 px-3 rounded-xl text-sm font-semibold active:scale-95 transition-all duration-100 flex items-center justify-center space-x-1.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span>Exit Workspace</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fancyTimeFormat } from "~/utils/helpers/formatter";

const props = defineProps<{
  headerData?: OJNHeader;
  isPlaying: boolean;
  volumeLevel: number;
}>();

const selectedDifficulty = useSelectedDifficulty();

const emit = defineEmits<{
  close: [void];
  random: [value: boolean];
  toggleOhmMode: [value: string];
  toggleNoLn: [void];
  toggleVerticalMode: [void];
  updateScaleW: [value: number];
  updateScaleH: [value: number];
  updateNoteHeight: [value: number];
  changeDifficulty: [value: OjnDifficulty];
  togglePlay: [void];
  "update:volumeLevel": [value: number];
  exit: [void];
}>();

const sidebarVolume = computed({
  get: () => props.volumeLevel,
  set: (val) => emit("update:volumeLevel", val),
});

const route = useRoute();
const seed = useSeed();
const ohmMode = useOhm();
const noLN = useNoLN();
const verticalMode = useVerticalMode();
const scaleW = useScaleW();
const scaleH = useScaleH();
const noteHeight = useNoteHeight();

const setNoLN = (hide: boolean) => {
  if (noLN.value !== hide) {
    noLN.value = hide;
    emit("toggleNoLn");
  }
};

const setVerticalMode = (vertical: boolean) => {
  if (verticalMode.value !== vertical) {
    verticalMode.value = vertical;
    if (vertical) {
      if (window.innerWidth < 1280) {
        scaleW.value = 8;
        scaleH.value = 6;
        noteHeight.value = 10;
      } else {
        scaleW.value = 15;
        scaleH.value = 10;
        noteHeight.value = 20;
      }
    } else {
      scaleW.value = 7;
      scaleH.value = 2;
      noteHeight.value = 4;
    }
    emit("toggleVerticalMode");
  }
};
</script>
