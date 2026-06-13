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
      <form
        class="flex w-full space-x-2"
        @submit.prevent="$emit('random', false)"
      >
        <input v-model="seed" placeholder="seed" class="w-full text-black px-2 py-1 rounded text-sm bg-zinc-100 focus:bg-white focus:outline-none" />
        <img
          alt="random_ring"
          src="/random_ring.jpg"
          class="w-8 h-8 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          @click="$emit('random', true)"
        />
      </form>
      <button
        type="submit"
        @click="$emit('random', false)"
        class="w-full border border-zinc-500 rounded-lg text-center font-bold bg-zinc-700 hover:bg-zinc-600 py-1 text-xs transition-colors"
      >
        Apply Seed
      </button>
    </div>

    <!-- Drag & Drop Zone -->
    <div class="mt-6">
      <DropZone
        class="drop-area text-center"
        @files-dropped="onInputChange"
        #default="{ dropZoneActive }"
      >
        <div class="flex items-center justify-center">
          <label
            for="file-input"
            class="text-stone-300 border-dashed border-2 border-stone-500 hover:border-stone-300 cursor-pointer py-4 px-2 w-full rounded transition-colors text-xs"
          >
            <span v-if="dropZoneActive">
              <div>Drop Them Here</div>
            </span>
            <span v-else>
              <div>Drag & Drop</div>
              <div class="text-stone-400 font-semibold mt-1">.ojn / .ojm files</div>
            </span>

            <input
              class="hidden"
              type="file"
              id="file-input"
              @change="onInputChange"
              multiple
            />
          </label>
        </div>
      </DropZone>
    </div>

    <!-- Playback Control -->
    <div class="mt-6 space-y-2" v-if="hitSounds && Object.keys(hitSounds).length !== 0">
      <div class="text-sm font-semibold text-stone-300">Playback</div>
      <button
        @click="$emit('playSong')"
        class="w-full border border-zinc-500 rounded-lg text-center font-bold bg-zinc-700 hover:bg-zinc-600 py-2 text-sm transition-colors"
      >
        {{ isPlaying ? 'Pause Song' : 'Play Song' }}
      </button>
    </div>

    <!-- Layout & Chart Modifiers -->
    <div class="mt-6 space-y-3 flex flex-col">
      <div class="text-sm font-semibold text-stone-300">Chart Settings</div>
      
      <!-- Long Notes Option -->
      <div class="space-y-1">
        <div class="text-xs text-stone-400">Long Notes</div>
        <div class="flex bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 select-none">
          <button
            @click="setNoLN(false)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': !noLN,
              'text-stone-400 hover:text-stone-200': noLN,
            }"
            class="w-1/2 py-1 text-center rounded-md text-xs transition-all duration-150 flex items-center justify-center space-x-1"
          >
            <span v-if="!noLN" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Show</span>
          </button>
          <button
            @click="setNoLN(true)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': noLN,
              'text-stone-400 hover:text-stone-200': !noLN,
            }"
            class="w-1/2 py-1 text-center rounded-md text-xs transition-all duration-150 flex items-center justify-center space-x-1"
          >
            <span v-if="noLN" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Hide</span>
          </button>
        </div>
      </div>

      <!-- Layout Mode Option -->
      <div class="space-y-1">
        <div class="text-xs text-stone-400">Layout Mode</div>
        <div class="flex bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 select-none">
          <button
            @click="setVerticalMode(false)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': !verticalMode,
              'text-stone-400 hover:text-stone-200': verticalMode,
            }"
            class="w-1/2 py-1 text-center rounded-md text-xs transition-all duration-150 flex items-center justify-center space-x-1"
          >
            <span v-if="!verticalMode" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Horizontal</span>
          </button>
          <button
            @click="setVerticalMode(true)"
            :class="{
              'bg-zinc-600 text-white font-semibold shadow-sm': verticalMode,
              'text-stone-400 hover:text-stone-200': !verticalMode,
            }"
            class="w-1/2 py-1 text-center rounded-md text-xs transition-all duration-150 flex items-center justify-center space-x-1"
          >
            <span v-if="verticalMode" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Vertical</span>
          </button>
        </div>
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
          <label for="note-height-slider">Note Height: {{ noteHeight }}px</label>
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
    </div>

    <!-- Chart Metadata info -->
    <div v-if="headerData" class="mt-6 border-t border-zinc-600 pt-4 space-y-2 text-sm text-stone-300">
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
      <div v-if="headerData.bmp" class="space-y-1">
        <div class="text-xs text-stone-400">BMP Info</div>
        <img :src="headerData.bmp" alt="BMP" class="rounded border border-stone-600" />
      </div>
      <div v-if="headerData.image" class="space-y-1">
        <div class="text-xs text-stone-400">Cover Image</div>
        <img :src="headerData.image" alt="Image" class="rounded border border-stone-600" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import FileParser from "~/utils/file-parser";

const props = defineProps<{
  headerData?: OJNHeader;
  hitSounds?: HitSound;
  isPlaying?: boolean;
}>();

const emit = defineEmits<{
  close: [void];
  random: [value: boolean];
  upload: [value: ConvertedOJN];
  toggleOhmMode: [value: string];
  playSong: [void];
  toggleNoLn: [void];
  toggleVerticalMode: [void];
  updateScaleW: [value: number];
  updateScaleH: [value: number];
  updateNoteHeight: [value: number];
}>();

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
      scaleW.value = 15;
      scaleH.value = 10;
      noteHeight.value = 20;
    } else {
      scaleW.value = 7;
      scaleH.value = 2;
      noteHeight.value = 4;
    }
    emit("toggleVerticalMode");
  }
};

const onInputChange = async (e: any) => {
  let originalFiles;
  let drop = false;
  if (e.target.files) {
    originalFiles = e.target.files;
  } else {
    originalFiles = e.dataTransfer.items;
    drop = true;
  }

  try {
    let files = [];
    if (drop) {
      for (let item of originalFiles) {
        if (item != null && item.kind == "file")
          files.push(item.webkitGetAsEntry());
      }
    } else {
      files = originalFiles;
    }
    let output: ConvertedOJN = await FileParser.parseFiles(files, drop);
    emit("upload", output);
  } catch (err) {
    alert("err" + err);
  } finally {
  }
};
</script>
