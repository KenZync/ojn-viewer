<template>
  <div class="min-h-screen bg-zinc-900">
    <div class="container mx-auto">
      <div class="flex justify-center">
        <div>
          <div class="pt-8 text-center text-stone-200">
            <span class="text-5xl">O2Jam OJN/OJM Viewer</span>
            <span class="pl-2 text-sm">
              <NuxtLink to="/">go back</NuxtLink></span
            >
          </div>
          <label
            for="formFile"
            class="form-label inline-block mb-2 text-stone-200"
          ></label>

          <DropZone
            class="drop-area text-center"
            @files-dropped="onInputChange"
            #default="{ dropZoneActive }"
          >
            <label for="file-input" class="text-stone-200">
              <span v-if="dropZoneActive">
                <span>Drop Them Here</span>
                <span>to add them</span>
              </span>
              <span v-else>
                <span>Drag Your Files Here</span>
                <span>
                  or <strong><em>click here</em></strong> to select files
                </span>
              </span>

              <input
                class="hidden"
                type="file"
                id="file-input"
                multiple
                @change="onInputChange"
              />
            </label>
          </DropZone>
          <div class="text-stone-200" v-if="output">
            <div v-if="output">
              <div>
                <div class="text-stone-200" v-if="output[2]">
                  <div class="flex flex-col">
                    <!-- <div>Song ID : {{ output[2].songid }}</div> -->
                    <!-- <div>Genre ID : {{ output[2].genre }}</div> -->
                    <!-- <div>Genre : {{ output[2].genreString }}</div> -->
                    <div>
                      <div>Title : {{ output[2].beatmap.title }}</div>
                      <div>Artist : {{ output[2].beatmap.artist }}</div>
                      <div>Level : {{ output[2].beatmap.difficultyName }}</div>
                      <div>BPM : {{ output[2].beatmap.bpm }}</div>
                      <!-- <div>NoteCount : {{ output[2].note_count }}</div> -->
                      <!-- <div>Noter : {{ output[2].noter }}</div> -->
                      <div>Time : {{ output[2].beatmap.length }}</div>
                    </div>
                    <div class="flex justify-center">
                      <audio class="w-96" controls autoplay :src="output[2].mainMusic" />
                      <img :src="output[2].bmp" alt="" />
                    </div>
                  </div>
                </div>
                <!-- <div>Cover Resolution : {{ output[2].coverResolution }}</div> -->
                <img :src="output[2].image" alt="" />
                <!-- <div>BMP Resolution : {{ output[2].bmpResolution }}</div> -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import _ from "struct-fu";
import FileParser from "../utils/file-parser";

useHead({
  title: "OJN/OJM Viewer",
  meta: [{ name: "description", content: "Reading O2Jam Music Files" }],
});


const output = ref();

const onInputChange = async (e) => {
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

    let difficulty = await FileParser.parseFiles(files, drop);

    for (let diff in difficulty) {
      const longestValue = Object.keys(difficulty[diff].hitSounds).reduce(
        (a, b) =>
          difficulty[diff].hitSounds[a].length >
          difficulty[diff].hitSounds[b].length
            ? a
            : b
      );

      difficulty[diff].mainMusic = difficulty[diff].hitSounds[longestValue];
    }
    output.value = difficulty;
  } catch (err) {
    console.log("err", err);
  } finally {
  }
};
</script>
