<template>
  <div>
    <button
      @click="$emit('close')"
      class="text-xl font-bold pt-4 w-full text-right"
    >
      Close
    </button>
    <div class="">Seed/Ringcon</div>
    <form
      class="flex w-full space-x-2"
      @submit.prevent="$emit('random', false)"
    >
      <input v-model="seed" placeholder="seed" class="w-full text-black" />
      <img
        alt="random_ring"
        src="/random_ring.jpg"
        class="rounded-lg overflow-hidden cursor-pointer"
        @click="$emit('random', true)"
      />
    </form>
    <button
      type="submit"
      @click="$emit('random', false)"
      class="border border-gray-400 rounded-lg text-center font-bold bg-zinc-700 py-2"
    >
      OK
    </button>
    <DropZone
      class="drop-area text-center"
      @files-dropped="onInputChange"
      #default="{ dropZoneActive }"
    >
      <div class="flex items-center">
        <label
          for="file-input"
          class="text-stone-200 border-dashed border-2 cursor-pointer py-8 px-2"
        >
          <span v-if="dropZoneActive">
            <span>Drop Them Here </span>
            <span>to add them</span>
          </span>
          <span v-else>
            <div>Drag & Drop</div>
            <span>
              .ojn & ojm files here or
              <span class="font-bold italic">click</span>
            </span>
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
    <div v-if="headerData" class="space-y-1">
      <div class="flex flex-col" v-if="route.query.server && route.query.id">
        <div class="flex justify-center">
          <img alt="ohm" src="/ohm.png" class="w-16" />
        </div>
        <RadioGroup
          v-model="ohmMode"
          @update:model-value="$emit('toggleOhmMode', ohmMode)"
        />
      </div>
      <div>ID : {{ headerData.song_id }}</div>
      <div>BMP</div>
      <img v-if="headerData.bmp" :src="headerData.bmp" alt="BMP" />
      <div>Image</div>
      <img v-if="headerData.image" :src="headerData.image" alt="Image" />
    </div>
    <button
      v-if="hitSounds && Object.keys(hitSounds).length !== 0"
      @click="$emit('playSong')"
      class="border border-gray-400 rounded-lg text-center font-bold bg-zinc-700 py-2"
    >
      Play Song (W.I.P)
    </button>
    <button
      @click="toggleNoLN"
      :class="{
        'bg-zinc-700': !noLN,
        'bg-blue-600': noLN,
      }"
      class="border border-gray-400 rounded-lg text-center font-bold py-2"
    >
      Toggle No LN
    </button>
  </div>
</template>

<script setup lang="ts">
import FileParser from "~/utils/file-parser";

const props = defineProps<{
  headerData?: OJNHeader;
  hitSounds?: HitSound;
}>();

const emit = defineEmits<{
  close: [void];
  random: [value: boolean];
  upload: [value: ConvertedOJN];
  toggleOhmMode: [value: string];
  playSong: [void];
  toggleNoLn: [void];
}>();

const route = useRoute();
const seed = useSeed();
const ohmMode = useOhm();
const noLN = useNoLN();

const toggleNoLN = () => {
  emit("toggleNoLn");
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
