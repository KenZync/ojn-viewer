<template>
  <div
    class="bg-gradient-26 w-screen h-screen flex flex-col items-center justify-center"
  >
    <video :src="video" controls />
    <br />
    <button @click="transcode">Start</button>
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
// import { defineComponent, ref } from 'vue';
import { FFmpeg } from "@ffmpeg/ffmpeg";
import type { LogEvent } from "@ffmpeg/ffmpeg/dist/esm/types";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const baseURL = "/_nuxt/node_modules/@ffmpeg/core/dist/esm/";
const videoURL = "/flame.avi";
const message = ref("Click Start to Transcode");
let video = ref("");

async function transcode() {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(`/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`/ffmpeg-core.wasm`, "applicaiton/wasm"),
  });
  message.value = "Start transcoding";
  await ffmpeg.writeFile("test.avi", await fetchFile(videoURL));
  await ffmpeg.exec(["-i", "test.avi", "test.mp4"]);
  message.value = "Complete transcoding";
  const data = await ffmpeg.readFile("test.mp4");
  video.value = URL.createObjectURL(
    new Blob([(data as Uint8Array).buffer], { type: "video/mp4" })
  );
}
</script>
