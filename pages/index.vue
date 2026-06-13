<template>
  <div>
    <ClientOnly>
      <div
        v-if="jsonData && headerData"
        class="flex justify-between items-center h-[50px] bg-black text-white text-xl font-bold px-4"
      >
        <div class="truncate mr-4">
          {{
            `Lv.${headerData.difficulty.hard.level} ${jsonData.title} / ${
              jsonData.artist
            } / obj : ${jsonData.obj} / bpm: ${jsonData.bpm} / Notes: ${
              jsonData.notes
            } / Time: ${fancyTimeFormat(headerData.difficulty.hard.duration)}`
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
        class="absolute bg-stone-700 top-0 right-0 px-5 w-48 h-screen flex flex-col text-white space-y-3 overflow-auto z-50"
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
import * as PIXI from "pixi.js";
import { shuffle } from "~/utils/random";
import { fancyTimeFormat } from "~/utils/formatter";
import { searchDeathPlayer, searchStringInDeathPoint } from "~/utils/search";
import FileParser from "~/utils/file-parser";
import {
  schemes,
  measureGridSize,
  measureLeftLaneSize,
  keyCh,
  rightMargin,
  bottomMargin,
  leftMargin,
  headerHeight,
} from "~/constants";
import { AnimeInstance } from "animejs";
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

const { $anime } = useNuxtApp();

const router = useRouter();
const route = useRoute();
const pixiContainer = ref();

const thumbnailHeight = ref(50);

const containerWidthShrinkRatio = ref();
const containerHeightShrinkRatio = ref();
const jsonData = ref<Ribbit>();
const headerData = ref<OJNHeader>();
const showPanel = ref(false);
const seed = useSeed();
const ohmMode = useOhm();
const noLN = useNoLN();
const verticalMode = useVerticalMode();
const noteHeight = useNoteHeight();

const hard = ref<any>();
const hitSounds = ref<any>();

var app: PIXI.Application<PIXI.ICanvas>;
var main: PIXI.Container<PIXI.DisplayObject> | null;
var thumbnail: PIXI.Container<PIXI.DisplayObject> | null;
var containerViewBox: PIXI.Container<PIXI.DisplayObject> | null = null;
var preview: PIXI.Graphics | null = null;
var grayMask: PIXI.Graphics | null = null;
// グローバル変数

// - レンダリングパラメータ
const scaleW = useScaleW();
const scaleH = useScaleH();

var measureFrom = 0;
var measureTo = 0;

var justX = 0;
var justY = 0;

var measureNow = 0;

let pHeight = 0;

// Web Audio API Playback States
const isPlaying = ref(false);
const seekOffset = ref(0); // in milliseconds
const isDecoding = ref(false);
const decodingProgress = ref(0);
const decodingTotal = ref(0);

const volumeLevel = ref(0.5); // Default master volume is 50%
const audioCtx = ref<AudioContext | null>(null);
const audioBuffers = ref<{ [key: string]: AudioBuffer }>({});
let startTimeOfPlayback = 0; // audioContext.currentTime seconds
let playingSources: AudioBufferSourceNode[] = [];
let animationFrameId: number | null = null;
let masterGain: GainNode | null = null;
var dragStartX = 0;
var dragStartY = 0;

const base64ToArrayBuffer = (base64: string) => {
  const commaIdx = base64.indexOf(",");
  const base64Data = commaIdx !== -1 ? base64.substring(commaIdx + 1) : base64;
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const initAudioContext = () => {
  if (!audioCtx.value || audioCtx.value.state === "closed") {
    audioCtx.value = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = null;
  }
  if (audioCtx.value.state === "suspended") {
    audioCtx.value.resume();
  }
  if (!masterGain && audioCtx.value) {
    masterGain = audioCtx.value.createGain();
    masterGain.gain.value = volumeLevel.value;
    masterGain.connect(audioCtx.value.destination);
  }
  return audioCtx.value;
};

watch(volumeLevel, (newVol) => {
  if (masterGain) {
    if (audioCtx.value) {
      masterGain.gain.setTargetAtTime(newVol, audioCtx.value.currentTime, 0.05);
    } else {
      masterGain.gain.value = newVol;
    }
  }
});

const decodeAllSounds = async () => {
  audioBuffers.value = {};
  isDecoding.value = false;
  if (!hitSounds.value || Object.keys(hitSounds.value).length === 0) return;
  
  const ctx = initAudioContext();
  isDecoding.value = true;
  decodingProgress.value = 0;
  
  const keys = Object.keys(hitSounds.value);
  decodingTotal.value = keys.length;
  
  const limit = 50;
  for (let i = 0; i < keys.length; i += limit) {
    const chunk = keys.slice(i, i + limit);
    await Promise.all(
      chunk.map(async (key) => {
        try {
          const base64 = hitSounds.value[key];
          if (!base64 || base64.length <= 150) return;
          
          const arrayBuf = base64ToArrayBuffer(base64);
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          audioBuffers.value[key] = audioBuf;
        } catch (err) {
          console.warn(`Failed to decode sample ${key}:`, err);
        } finally {
          decodingProgress.value++;
        }
      })
    );
  }
  isDecoding.value = false;
};

useHead({
  title: "OJN Viewer",
  meta: [{ name: "description", content: "O2Jam Chart Viewer" }],
});

const pattern = computed(() => {
  return seed.value.split("").map((char) => (parseInt(char) - 1).toString());
});
const loading = ref(false);

const deathPoints = ref<DeathPoint>({});
const deathPointPlayer = computed(() => {
  if (deathPoints.value && route.query.player) {
    return searchDeathPlayer(deathPoints.value, route.query.player?.toString());
  } else {
    return {};
  }
});

const { data: ojn } = useAsyncData(
  "ojn",
  async () => {
    if (route.query.server && route.query.id) {
      loading.value = true;
      if (route.query.server === "dmjam") {
        const resDeath = await $fetch(
          `/api/${route.query.server}/fail/${route.query.id}`
        );
        deathPoints.value = resDeath as DeathPoint;
      }
      try {
        // const downloadUrl = await $fetch(
        //   `/api/${route.query.server}/${route.query.id}`,
        //   {
        //     query: {
        //       folder: route.query.folder,
        //     },
        //   }
        // );
        // const responseUrl = downloadUrl;
        const responseUrl = `https://ojn-api.dmjam.net/ojn-api/o2ma${route.query.id}.ojn`
        const downloadedOjn = await $fetch(responseUrl, {
          // headers: {
          //   "Content-Type": "application/octet-stream",
          // },
          responseType: "arrayBuffer",
        });
        const response = downloadedOjn as ArrayBuffer;
        let output: ConvertedOJN = convert(response, deathPoints.value, {});
        jsonData.value = output.ribbit;
        headerData.value = output.header;
        showPanel.value = true;
        renderNote();
      } catch (error) {
        alert("OJN NOT FOUND " + error);
        loading.value = false;
      }
    }
  },
  { server: false }
);

const startAudioPlayback = (startTimeMs: number) => {
  const ctx = initAudioContext();
  stopAllAudio();
  
  isPlaying.value = true;
  seekOffset.value = startTimeMs;
  startTimeOfPlayback = ctx.currentTime - startTimeMs / 1000;
  
  const allNotes = [
    ...(hard.value?.notes || []),
    ...(hard.value?.timeSounds || []),
  ];
  
  for (const note of allNotes) {
    const buffer = audioBuffers.value[note.hitSound];
    if (!buffer) continue;
    
    // Calculate randomized panning if note has a key (playable note)
    let pan = note.pan !== undefined ? note.pan : 0.0;
    if (note.key !== undefined && pattern.value) {
      const visualCol = pattern.value.indexOf(note.key.toString());
      if (visualCol !== -1) {
        pan = (visualCol - 3) / 3;
      }
    }
    
    // Future Note
    if (note.startTime >= startTimeMs) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = note.volume !== undefined ? note.volume : 1.0;
      
      const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pannerNode) {
        pannerNode.pan.value = pan;
        source.connect(pannerNode).connect(gainNode).connect(masterGain);
      } else {
        source.connect(gainNode).connect(masterGain);
      }
      
      const playAt = startTimeOfPlayback + note.startTime / 1000;
      source.start(playAt);
      playingSources.push(source);
    }
    // Past overlapping Note (Contextual Seek)
    else {
      const durationMs = buffer.duration * 1000;
      if (note.startTime + durationMs > startTimeMs) {
        const offsetSec = (startTimeMs - note.startTime) / 1000;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = note.volume !== undefined ? note.volume : 1.0;
        
        const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pannerNode) {
          pannerNode.pan.value = pan;
          source.connect(pannerNode).connect(gainNode).connect(masterGain);
        } else {
          source.connect(gainNode).connect(masterGain);
        }
        
        source.start(ctx.currentTime, offsetSec);
        playingSources.push(source);
      }
    }
  }
  
  startPlayheadAnimation();
};

const stopAllAudio = () => {
  for (const source of playingSources) {
    try {
      source.stop();
    } catch (e) {
      // already stopped
    }
  }
  playingSources = [];
};

const pauseAudioPlayback = () => {
  if (!isPlaying.value) return;
  isPlaying.value = false;
  
  if (audioCtx.value) {
    seekOffset.value = (audioCtx.value.currentTime - startTimeOfPlayback) * 1000;
  }
  
  stopAllAudio();
  stopPlayheadAnimation();
};

const stopSong = () => {
  isPlaying.value = false;
  seekOffset.value = 0;
  stopAllAudio();
  stopPlayheadAnimation();
  updatePlayheadPosition(0);
};

const getChartDurationMs = () => {
  if (!jsonData.value || !jsonData.value.score) return 0;
  const score = jsonData.value.score;
  for (let m = score.length - 1; m >= 0; m--) {
    const measure = score[m];
    const timingLines = measure["88"];
    if (timingLines && timingLines.length > 0) {
      const firstLine = timingLines[0];
      const measureStartTime = firstLine[4];
      const measureDuration = timingLines.reduce((acc: number, line: any) => acc + (line[3] || 0), 0);
      return measureStartTime + measureDuration;
    }
  }
  return 0;
};

const startPlayheadAnimation = () => {
  stopPlayheadAnimation();
  const update = () => {
    if (isPlaying.value && audioCtx.value) {
      const elapsed = (audioCtx.value.currentTime - startTimeOfPlayback) * 1000;
      
      const totalDurationMs = getChartDurationMs() || (headerData.value?.difficulty?.hard?.duration || 0) * 1000;
      if (elapsed >= totalDurationMs) {
        isPlaying.value = false;
        seekOffset.value = totalDurationMs;
        stopAllAudio();
        stopPlayheadAnimation();
        updatePlayheadPosition(totalDurationMs);
        return;
      }
      
      seekOffset.value = elapsed;
      updatePlayheadPosition(elapsed);
      animationFrameId = requestAnimationFrame(update);
    }
  };
  animationFrameId = requestAnimationFrame(update);
};

const stopPlayheadAnimation = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

const togglePlay = () => {
  if (!jsonData.value) return;
  if (isPlaying.value) {
    pauseAudioPlayback();
  } else {
    const totalDurationMs = getChartDurationMs() || (headerData.value?.difficulty?.hard?.duration || 0) * 1000;
    let currentMs = seekOffset.value || 0;
    if (currentMs >= totalDurationMs - 100) {
      currentMs = 0;
      seekOffset.value = 0;
      updatePlayheadPosition(0);
    }
    startAudioPlayback(currentMs);
  }
};

const playSong = () => {
  togglePlay();
};

const toggleSetting = () => {
  if (jsonData.value) {
    showPanel.value = !showPanel.value;
  }
};

const upload = async (file: ConvertedOJN) => {
  deathPoints.value = {};
  loading.value = true;
  jsonData.value = file.ribbit;
  headerData.value = file.header;
  hard.value = file.hard;
  hitSounds.value = file.hitSounds;
  router.replace("/");
  
  stopSong();
  await decodeAllSounds();
  
  showPanel.value = true;
  setTimeout(() => {
    renderNote();
  }, 5);
};

const onMainInputChange = async (e: any) => {
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
    upload(output);
  } catch (err) {
    alert("err" + err);
  }
};

const onMainFilesDropped = async (e: any) => {
  await onMainInputChange(e);
};

const measureLocation = computed(() => {
  if (main) {
    const positions = [];

    for (let i = 0; i < main.children.length - 1; i++) {
      const measure = main.children[i];
      const position = {
        x: measure.position.x,
        y: measure.position.y,
      };
      positions.push(position);
    }

    return positions;
  }

  return [];
});

const renderNote = () => {
  PIXI.settings.ROUND_PIXELS = true;
  if (!jsonData.value) return;

  thumbnailHeight.value = Math.max(window.innerHeight * 0.05, 25);

  if (app == null) {
    app = new PIXI.Application({
      backgroundColor: schemes.default.backgroundFill,
      height: window.innerHeight - headerHeight,
      width: window.innerWidth,
    });
    pixiContainer.value.appendChild(app.view);
  }
  app.renderer.resize(window.innerWidth, window.innerHeight - headerHeight);

  if (main != null && thumbnail != null) {
    if (preview != null) {
      preview.destroy(true);
      preview = null;
    }
    thumbnail.destroy(true);
    main.destroy(true);
    main = null;
    thumbnail = null;
  }

  main = new PIXI.Container();

  var currentScaleW = verticalMode.value ? scaleW.value * 2 : scaleW.value;
  var colWidth = measureGridSize[7] * currentScaleW;

  var posXinit = leftMargin;
  var posYinit = app.renderer.height - (verticalMode.value ? bottomMargin : (thumbnailHeight.value + bottomMargin));
  var posX = verticalMode.value ? (app.renderer.width - colWidth) / 2 : -15;
  var posY = posYinit;

  justX = 0;
  justY = 0;
  for (measureNow = 0; measureNow < jsonData.value.score.length; measureNow++) {
    var expLen =
      (jsonData.value.score[measureNow].length || jsonData.value.unit) *
      scaleH.value;
    var measure = Measure({
      index: measureNow,
      score: jsonData.value.score[measureNow],
      lnmap: jsonData.value.lnmap,
      scaleW: currentScaleW,
      scaleH: scaleH.value,
      noteHeight: noteHeight.value,
      length: jsonData.value.score[measureNow].length || jsonData.value.unit,
      pattern: pattern.value,
      unit: jsonData.value.unit,
      exratio: verticalMode.value ? 1 : (expLen > posYinit ? (posYinit - 1) / expLen : 1),
    });
    if (verticalMode.value) {
      posY -= justY;
    } else {
      if (posY == posYinit || posY - justY > 0) {
        posY -= justY - 1;
      } else {
        posY = posYinit - justY + 1;
        posX += justX + posXinit;
      }
    }
    measure.cacheAsBitmap = false;
    measure.position.x = posX;
    measure.position.y = posY;
    main.addChild(measure);
    measure.cacheAsBitmap = true;
  }

  main.cursor = "pointer";
  main.eventMode = "static";
  main
    .on("mousedown", onDragStart)
    .on("touchstart", onDragStart)
    .on("mouseup", onDragEnd)
    .on("mouseupoutside", onDragEnd)
    .on("touchend", onDragEnd)
    .on("touchendoutside", onDragEnd)
    .on("mousemove", onDragMove)
    .on("touchmove", onDragMove);

  if (verticalMode.value) {
    main.hitArea = new PIXI.Rectangle(0, posYinit - main.height, colWidth, main.height + bottomMargin);
  } else {
    main.hitArea = new PIXI.Rectangle(0, 0, main.width, main.height + 50);
  }
  main.position.x = 0;
  main.position.y = 0;

  thumbnail = Thumbnail(app.renderer, main);
  if (verticalMode.value) {
    const thumbnailWidth = 60;
    thumbnail.position.x = Math.max(0, posX - thumbnailWidth - 10);
    thumbnail.position.y = 0;
  } else {
    thumbnail.position.x = 0;
    thumbnail.position.y = posYinit + bottomMargin;
  }

  var previewLineWidth = 1;

  pHeight = jsonData.value.unit * scaleH.value * 1;
  var pWidth = measureGridSize[7] * currentScaleW;

  var previewWidth = 1;
  var previewStart = 35;

  preview = new PIXI.Graphics();
  preview.lineStyle(previewLineWidth, schemes.default.previewLine, 1);
  preview.moveTo(pWidth - previewWidth, pHeight - previewLineWidth);
  preview.lineTo(previewStart - 1, pHeight - previewLineWidth);

  app.stage.addChild(main);
  if (verticalMode.value) {
    preview.x = posX;
    preview.y = posYinit - pHeight;
    app.stage.addChild(preview);
  } else {
    preview.x = main.children[0].x;
    preview.y = main.children[0].y;
    main.addChild(preview);
  }
  app.stage.addChild(thumbnail);
  
  updatePlayheadPosition(seekOffset.value);

  loading.value = false;
};

const findMeasureAndOffsetAtTime = (timeMs: number) => {
  if (!jsonData.value || !jsonData.value.score) return null;
  const score = jsonData.value.score;
  
  for (let m = 0; m < score.length; m++) {
    const measure = score[m];
    const timingLines = measure["88"];
    if (!timingLines || timingLines.length === 0) continue;
    
    const firstLine = timingLines[0];
    const measureStartTime = firstLine[4];
    const measureDuration = timingLines.reduce((acc: number, line: any) => acc + line[3], 0);
    const measureEndTime = measureStartTime + measureDuration;
    
    if (timeMs >= measureStartTime && timeMs <= measureEndTime) {
      for (let i = 0; i < timingLines.length; i++) {
        const line = timingLines[i];
        const beatNow = line[0];
        const beatNext = line[2];
        const duration = line[3];
        const timeCount = line[4];
        
        if (timeMs >= timeCount && timeMs <= timeCount + duration) {
          const elapsed = timeMs - timeCount;
          const progress = duration > 0 ? elapsed / duration : 0;
          const beatInMeasure = beatNow + progress * (beatNext - beatNow);
          return {
            measureIndex: m,
            beatInMeasure,
            measureLength: measure.length || jsonData.value.unit,
          };
        }
      }
    }
  }
  
  const lastMeasureIdx = score.length - 1;
  const lastMeasure = score[lastMeasureIdx];
  if (lastMeasure) {
    const length = lastMeasure.length || jsonData.value.unit;
    return {
      measureIndex: lastMeasureIdx,
      beatInMeasure: length,
      measureLength: length,
    };
  }
  
  return null;
};

const updatePlayheadPosition = (timeMs: number) => {
  if (!preview || !main || !jsonData.value) return;
  
  const info = findMeasureAndOffsetAtTime(timeMs);
  if (!info) return;
  
  const { measureIndex, beatInMeasure, measureLength } = info;
  
  const measureContainer = main.children[measureIndex] as PIXI.Container;
  if (!measureContainer || measureContainer === preview) return;
  
  const measureX = measureContainer.position.x;
  const measureY = measureContainer.position.y;
  const measureHeight = (measureContainer as any).measureHeight || (jsonData.value.unit * scaleH.value);
  
  const yOffset = (beatInMeasure / measureLength) * measureHeight;
  const targetX = measureX;
  const targetY = measureY + measureHeight - yOffset;
  
  if (verticalMode.value) {
    // In vertical mode, preview playhead is statically placed at posYinit.
    // We scroll the main container vertically instead.
    if (!dragging) {
      const posYinit = app.renderer.height - bottomMargin;
      main.position.y = Math.min(Math.max(posYinit - targetY, 0), main.height);
      main.position.x = 0;
      updateDrawbox();
    }
  } else {
    preview.x = targetX;
    preview.y = targetY - pHeight;
    
    if (!dragging) {
      const activeMeasureX = measureX;
      const targetScrollX = -activeMeasureX + (app.renderer.width / 2) - (measureContainer.width / 2);
      
      main.position.x = Math.min(
        Math.max(
          targetScrollX,
          app.renderer.width - main.width - leftMargin - rightMargin
        ),
        0
      );
      updateDrawbox();
    }
  }
};

const seekToY = (targetY: number) => {
  if (!main || !jsonData.value) return;
  
  // Find which measure contains targetY
  let targetMeasure = null;
  let targetMeasureIndex = -1;
  for (let i = 0; i < main.children.length; i++) {
    const measure = main.children[i] as any;
    if (measure.measureIndex !== undefined) {
      const measureY = measure.position.y;
      const measureHeight = measure.measureHeight || (jsonData.value.unit * scaleH.value);
      if (targetY >= measureY && targetY <= measureY + measureHeight) {
        targetMeasure = measure;
        targetMeasureIndex = measure.measureIndex;
        break;
      }
    }
  }
  
  if (targetMeasureIndex === -1) return;
  
  const measureHeight = targetMeasure.measureHeight || (jsonData.value.unit * scaleH.value);
  const localY = targetY - targetMeasure.position.y;
  const score = jsonData.value.score;
  const measureLength = score[targetMeasureIndex].length || jsonData.value.unit;
  const beatInMeasure = ((measureHeight - localY) / measureHeight) * measureLength;
  
  const timingLines = score[targetMeasureIndex]["88"];
  if (!timingLines || timingLines.length === 0) return;
  
  let targetTime = 0;
  for (let i = 0; i < timingLines.length; i++) {
    const line = timingLines[i];
    const beatNow = line[0];
    const beatNext = line[2];
    const duration = line[3];
    const timeCount = line[4];
    
    if (beatInMeasure >= beatNow && beatInMeasure <= beatNext) {
      const elapsed = ((beatInMeasure - beatNow) / (beatNext - beatNow)) * duration;
      targetTime = timeCount + elapsed;
      break;
    }
  }
  
  seekTo(targetTime);
};

const seekToMeasureClick = (event: any, measureContainer: any, measureIndex: number) => {
  const localPos = event.data.getLocalPosition(measureContainer);
  const localY = localPos.y;
  const measureHeight = measureContainer.measureHeight;
  if (localY < 0 || localY > measureHeight) return;
  
  const score = jsonData.value?.score;
  if (!score) return;
  
  const measureLength = score[measureIndex].length || jsonData.value.unit;
  const beatInMeasure = ((measureHeight - localY) / measureHeight) * measureLength;
  
  const timingLines = score[measureIndex]["88"];
  if (!timingLines || timingLines.length === 0) return;
  
  let targetTime = 0;
  for (let i = 0; i < timingLines.length; i++) {
    const line = timingLines[i];
    const beatNow = line[0];
    const beatNext = line[2];
    const duration = line[3];
    const timeCount = line[4];
    
    if (beatInMeasure >= beatNow && beatInMeasure <= beatNext) {
      const elapsed = ((beatInMeasure - beatNow) / (beatNext - beatNow)) * duration;
      targetTime = timeCount + elapsed;
      break;
    }
  }
  
  seekTo(targetTime);
};

const seekTo = (targetTimeMs: number) => {
  seekOffset.value = targetTimeMs;
  if (isPlaying.value) {
    startAudioPlayback(targetTimeMs);
  } else {
    updatePlayheadPosition(targetTimeMs);
  }
};

// 小節オブジェクト
const Measure = (param: {
  index: number;
  score: RibbitScore;
  lnmap: RibbitLNMap;
  scaleW: number;
  scaleH: number;
  noteHeight: number;
  length: number;
  pattern: string[];
  unit: number;
  exratio: number;
}) => {
  var lineWidth = 1;
  var lineStart = 35;
  var measureContainer = new PIXI.Container();
  var g = new PIXI.Graphics();
  measureContainer.addChild(g);

  //   // コンテナサイズを決定
  var gHeight = param.length * param.scaleH * param.exratio;
  var gWidth = measureGridSize[7] * param.scaleW;

  //   // パラメータをセット
  var gLogicalLength = param.length;
  var gUnitLength = param.unit;
  var gIndex = param.index;
  var gScore = param.score;
  var gLnmap = param.lnmap;
  var gKeys = 7;
  var gGridX = param.scaleW;
  var gGridY = gHeight / gLogicalLength;
  var gPattern = param.pattern;

  //Draw Note Lines
  // ノート境界線を描画
  var grid = gGridX;
  var color = schemes.default.laneLine;
  var idx = 5;

  g.lineStyle(lineWidth, color, 1);
  g.moveTo(grid * idx, 0);
  g.lineTo(grid * idx, gHeight - lineWidth);

  // KEY
  for (var j = 0; j < gKeys; j++) {
    idx += 2;
    g.moveTo(grid * idx, 0);
    g.lineTo(grid * idx, gHeight - lineWidth);
  }

  //   // 小節線描画メソッド
  var measureGrid = gHeight / gLogicalLength;

  for (var beat = 1; (beat * gUnitLength) / 16 < gLogicalLength; beat++) {
    var color = schemes.default.sixteenthLine; //  16分音符
    if (beat % 4 == 0) {
      color = schemes.default.quarterLine;
    } // 4分音符

    //Draw Measure Line
    g.lineStyle(lineWidth, color, 1);
    g.moveTo(
      lineStart - 1,
      gHeight - (measureGrid * beat * gUnitLength) / 16 - lineWidth
    );
    g.lineTo(
      gWidth,
      gHeight - (measureGrid * beat * gUnitLength) / 16 - lineWidth
    );
  }

  // LABEL
  idx = 2 * gKeys + 5;
  color = schemes.default.labelFill;
  g.beginFill(color);
  g.lineStyle(0, undefined, 1);
  g.moveTo(grid * idx, 0);
  g.lineTo(grid * idx, gHeight - lineWidth);
  g.lineTo(grid * (4 + idx), gHeight - lineWidth);
  g.lineTo(grid * (4 + idx), 0);
  g.endFill();
  if (gLogicalLength >= gUnitLength / 4 / param.scaleH) {
    idx += 2;
    var labelText = new PIXI.Text(gIndex, {
      fontSize: grid * 2,
      fontWeight: "bold",
      // font: fontSetting,
      fill: schemes.default.labelText,
      stroke: color,
      strokeThickness: 2,
    });
    labelText.anchor.x = 0.5;
    labelText.anchor.y = 0.5;
    labelText.x = grid * idx;
    labelText.y = gHeight / 2;
    measureContainer.addChild(labelText);
  }

  //   // 外枠描画メソッド
  //   Draw outer bound
  g.lineStyle(lineWidth, schemes.default.outerBound, 1);
  g.moveTo(lineStart - 1, 0);
  g.lineTo(gWidth + lineWidth, 0);
  g.lineTo(gWidth + lineWidth, gHeight - lineWidth);
  g.lineTo(lineStart - 1, gHeight - lineWidth);
  g.lineTo(lineStart - 1, 0);

  // ノート描画
  var noteThickness = param.noteHeight;
  var blue = schemes.default.noteBlueFill;
  var white = schemes.default.noteWhiteFill; // 0x8b8b8b
  var yellow = schemes.default.noteYellowFill;
  var lnWhite = schemes.default.lnoteWhiteFill;
  var lnBlue = schemes.default.lnoteBlueFill;
  var lnYellow = schemes.default.lnoteYellowFill;
  var mineRedLine = schemes.default.mineRedLine;
  var lnRatio = schemes.default.lnWidthRatio;

  // KEY
  var idx = 5;
  var color = blue;

  var colScheme = [white, blue, white, yellow, white, blue, white];
  var colSchemeLN = [
    lnWhite,
    lnBlue,
    lnWhite,
    lnYellow,
    lnWhite,
    lnBlue,
    lnWhite,
  ];
  var counter = 0;

  //Draw Notes
  var keych: string[] = [];
  if (gPattern != null) {
    for (var c = 0; c < gKeys; c++) {
      keych[c] = keyCh[7][parseInt(gPattern[c])];
    }
  } else {
    keych = keyCh[7];
  }

  keych.forEach(function (key) {
    if (key in gLnmap) {
      gLnmap[key].forEach(function (area: any[][]) {
        if (area[0][0] <= gIndex && area[1][0] >= gIndex) {
          var lnBegin = 0;
          var lnEnd = gLogicalLength;
          if (area[0][0] == gIndex) {
            lnBegin = area[0][1];
            if(noLN.value){
              g.beginFill(colSchemeLN[counter]);
              g.lineStyle(0, 0, 0);
              g.drawRect(
                idx * gGridX - (idx == 0 ? lineWidth : 0) + (lnRatio * gGridX) / 2,
                gHeight - gGridY * lnBegin - noteThickness - lineWidth,
                2 * gGridX - (idx == 0 ? 0 : lineWidth) - lnRatio * gGridX,
                noteThickness
              );
              g.endFill();
            }
          }
          if (area[1][0] == gIndex) {
            lnEnd = area[1][1];
          }

          if (!noLN.value) {
            g.beginFill(colSchemeLN[counter]);
            g.lineStyle(0, 0, 0);
            g.drawRect(
              idx * gGridX - (idx == 0 ? lineWidth : 0) + (lnRatio * gGridX) / 2,
              gHeight - gGridY * lnEnd - lineWidth,
              2 * gGridX - (idx == 0 ? 0 : lineWidth) - lnRatio * gGridX,
              gGridY * (lnEnd - lnBegin) +
                (lnBegin == 0 ? lineWidth : 0) -
                lineWidth
            );
            g.endFill();
          }

          
        }
      });
    }

    if (key in gScore) {
      gScore[key].forEach(function (
        value: [number, string | number, number?, number?, number?]
      ) {
        const pos: number[] = value as number[];
        g.beginFill(colScheme[counter]);
        g.lineStyle(0, 0, 0);
        g.drawRect(
          idx * gGridX - (idx == 0 ? lineWidth : 0),
          gHeight - (gGridY * pos[0] + noteThickness) - lineWidth,
          2 * gGridX - (idx == 0 ? 0 : lineWidth),
          noteThickness
        );
        g.endFill();
      });
    }

    idx += 2;
    counter++;
  });

  justX = gWidth;
  justY = gHeight;

  //Draw BPM
  var colorLine = schemes.default.bpmLine;
  var colorText = schemes.default.bpmText;
  var colorStroke = schemes.default.bpmTextStroke;
  var lineH = schemes.default.bpmLineH;
  // BPM, exBPM
  var ch = ["03", "08", "99", "88"];

  ch.forEach((aKey: string) => {
    if (aKey in gScore && !(ohmMode.value === "off" && aKey === ch[2])) {
      gScore[aKey].forEach((pos) => {
        if (aKey == ch[3]) {
          return;
        }
        if (
          aKey === ch[2] &&
          ohmMode.value === "you" &&
          !searchStringInDeathPoint(deathPointPlayer.value, pos[1].toString())
        ) {
          return;
        }

        g.lineStyle(lineH, aKey === ch[2] ? mineRedLine : colorLine, 1);
        g.moveTo(lineStart, gHeight - gGridY * pos[0] - lineH);
        g.lineTo(
          gGridX * measureLeftLaneSize[7],
          gHeight - gGridY * pos[0] - lineH
        );

        const labelText: PIXI.Text = new PIXI.Text(
          aKey === ch[2]
            ? pos[1].toString()
            : (Math.round(Number(pos[1]) * 10) / 10).toString(),
          {
            fontSize: gGridX * 1.5,
            fontWeight: "bold",
            fill: aKey === ch[2] ? mineRedLine : colorText,
            stroke: aKey === ch[2] ? lnWhite : colorStroke,
            strokeThickness: colorStroke !== null ? 2 : 0,
          }
        );
        labelText.anchor.x = 0.5;
        labelText.anchor.y = 0.5;
        labelText.x = gGridX * (measureLeftLaneSize[7] + 2);
        labelText.y = gHeight - gGridY * pos[0] - lineWidth;
        measureContainer.addChild(labelText);
      });
    }
  });

  (measureContainer as any).measureHeight = gHeight;
  (measureContainer as any).measureIndex = gIndex;
  measureContainer.eventMode = "static";
  measureContainer.hitArea = new PIXI.Rectangle(0, 0, gWidth, gHeight);

  return measureContainer;
};

const Thumbnail = (
  inputRenderer: PIXI.IRenderer<PIXI.ICanvas>,
  stage: PIXI.Container<PIXI.DisplayObject>
) => {
  var lineWidth = 1;
  var container = new PIXI.Container();

  const thumbnailWidth = 60;
  const thumbnailHeightVal = inputRenderer.height - bottomMargin;

  if (verticalMode.value) {
    containerHeightShrinkRatio.value = thumbnailHeightVal / stage.height;
    containerWidthShrinkRatio.value = thumbnailWidth / stage.width;
  } else {
    containerWidthShrinkRatio.value = inputRenderer.width / stage.width;
    containerHeightShrinkRatio.value = thumbnailHeight.value / stage.height;
  }

  // サムネイル枠を作成
  var g = new PIXI.Graphics();
  g.beginFill(0x0);
  g.lineStyle(lineWidth, 0x404040, 1);
  g.moveTo(0, 0);
  if (verticalMode.value) {
    g.lineTo(thumbnailWidth, 0);
    g.lineTo(thumbnailWidth, thumbnailHeightVal);
    g.lineTo(0, thumbnailHeightVal);
  } else {
    g.lineTo(inputRenderer.width, 0);
    g.lineTo(inputRenderer.width, thumbnailHeight.value);
    g.lineTo(0, thumbnailHeight.value);
  }
  g.lineTo(0, 0);
  g.endFill();
  container.addChild(g);

  // サムネイル作成
  const texture = inputRenderer.generateTexture(stage, {
    resolution: 2 * (verticalMode.value ? containerHeightShrinkRatio.value : containerWidthShrinkRatio.value),
    scaleMode: PIXI.SCALE_MODES.NEAREST,
  });
  var containerThumbnail = new PIXI.Sprite(texture);
  if (verticalMode.value) {
    containerThumbnail.width = thumbnailWidth;
    containerThumbnail.height = thumbnailHeightVal;
  } else {
    containerThumbnail.width = inputRenderer.width;
    containerThumbnail.height = thumbnailHeight.value;
  }
  // CANVAS ではうまくスプライトが作成できない？ので無表示に
  if (inputRenderer.type != PIXI.RENDERER_TYPE.CANVAS)
    container.addChild(containerThumbnail);

  // 表示中領域の白枠を作成

  containerViewBox = new PIXI.Container();

  // グレーボックス
  grayMask = new PIXI.Graphics();
  
  if (verticalMode.value) {
    // Above view box
    grayMask.beginFill(0xffffff);
    grayMask.lineStyle(lineWidth, 0x404040, 1);
    grayMask.moveTo(0, 0);
    grayMask.lineTo(thumbnailWidth, 0);
    grayMask.lineTo(thumbnailWidth, -thumbnailHeightVal);
    grayMask.lineTo(0, -thumbnailHeightVal);
    grayMask.lineTo(0, 0);
    
    // Below view box
    const viewBoxHeight = inputRenderer.height * containerHeightShrinkRatio.value;
    grayMask.moveTo(0, viewBoxHeight);
    grayMask.lineTo(thumbnailWidth, viewBoxHeight);
    grayMask.lineTo(thumbnailWidth, thumbnailHeightVal);
    grayMask.lineTo(0, thumbnailHeightVal);
    grayMask.lineTo(0, viewBoxHeight);
    grayMask.endFill();
  } else {
    //左
    grayMask.beginFill(0xffffff);
    grayMask.lineStyle(lineWidth, 0x404040, 1);
    grayMask.moveTo(0, 0);
    grayMask.lineTo(-inputRenderer.width, 0);
    grayMask.lineTo(-inputRenderer.width, thumbnailHeight.value);
    grayMask.lineTo(0, thumbnailHeight.value);
    grayMask.lineTo(0, 0);
    // 右
    grayMask.moveTo(inputRenderer.width * containerWidthShrinkRatio.value, 0);
    grayMask.lineTo(inputRenderer.width, 0);
    grayMask.lineTo(inputRenderer.width, thumbnailHeight.value);
    grayMask.lineTo(
      inputRenderer.width * containerWidthShrinkRatio.value,
      thumbnailHeight.value
    );
    grayMask.lineTo(inputRenderer.width * containerWidthShrinkRatio.value, 0);
    grayMask.endFill();
  }
  
  // アルファ
  grayMask.alpha = 0.4;
  // クリック可能にする
  grayMask.cursor = "pointer";
  grayMask.eventMode = "static";
  
  if (verticalMode.value) {
    grayMask.hitArea = new PIXI.Rectangle(
      -50,
      -thumbnailHeightVal,
      thumbnailWidth + 100,
      2 * thumbnailHeightVal + 100
    );
  } else {
    grayMask.hitArea = new PIXI.Rectangle(
      -inputRenderer.width,
      0,
      2 * inputRenderer.width,
      thumbnailHeight.value + 50
    ); // +50: はみ出しクリック可能領域
  }
  
  grayMask
    .on("mousedown", onClick)
    .on("touchstart", onClick)
    .on("mousedown", onDragStart)
    .on("touchstart", onDragStart)
    .on("mousemove", onDragMove)
    .on("touchmove", onDragMove)
    .on("mouseup", onDragEnd)
    .on("mouseupoutside", onDragEnd)
    .on("touchend", onDragEnd)
    .on("touchendoutside", onDragEnd);

  containerViewBox.addChild(grayMask);

  var frame = new PIXI.Graphics();
  frame.lineStyle(lineWidth, 0xffffff, 1);
  
  if (verticalMode.value) {
    const viewBoxHeight = inputRenderer.height * containerHeightShrinkRatio.value;
    frame.moveTo(0, 0);
    frame.lineTo(thumbnailWidth, 0);
    frame.lineTo(thumbnailWidth, viewBoxHeight);
    frame.lineTo(0, viewBoxHeight);
    frame.lineTo(0, 0);
  } else {
    //枠の描画
    frame.moveTo(lineWidth, 0);
    frame.lineTo(inputRenderer.width * containerWidthShrinkRatio.value, 0);
    frame.lineTo(
      inputRenderer.width * containerWidthShrinkRatio.value,
      thumbnailHeight.value
    );
    frame.lineTo(lineWidth, thumbnailHeight.value);
    frame.lineTo(lineWidth, 0);
  }
  
  // ドラッグ可能にする
  frame.cursor = "pointer";
  frame.eventMode = "static";
  
  if (verticalMode.value) {
    const viewBoxHeight = inputRenderer.height * containerHeightShrinkRatio.value;
    frame.hitArea = new PIXI.Rectangle(
      -50,
      0,
      thumbnailWidth + 100,
      viewBoxHeight
    );
  } else {
    frame.hitArea = new PIXI.Rectangle(
      lineWidth,
      0,
      inputRenderer.width * containerWidthShrinkRatio.value - lineWidth,
      thumbnailHeight.value + 50
    ); // +50: はみ出しクリック可能領域
  }

  frame
    .on("mousedown", onDragStart)
    .on("touchstart", onDragStart)
    .on("mouseup", onDragEnd)
    .on("mouseupoutside", onDragEnd)
    .on("touchend", onDragEnd)
    .on("touchendoutside", onDragEnd)
    .on("mousemove", onDragMove)
    .on("touchmove", onDragMove);

  containerViewBox.addChild(frame);

  container.addChild(containerViewBox);

  return container;
};

var curPosition: any;
var dragging = false;
var wasPlayingBeforeDrag = false;

function onClick(event: any) {
  if (event.target == grayMask && main) {
    curPosition = event.data.getLocalPosition(thumbnail);
    if (verticalMode.value) {
      const thumbnailHeightVal = app.renderer.height - bottomMargin;
      const viewBoxHeight = app.renderer.height * containerHeightShrinkRatio.value;
      const scrollRange = thumbnailHeightVal - viewBoxHeight;
      const posY = curPosition.y - viewBoxHeight / 2;
      const posY_clamped = Math.min(Math.max(posY, 0), scrollRange);
      let targetPositionY = 0;
      if (scrollRange > 0) {
        targetPositionY = main.height * (1 - posY_clamped / scrollRange);
      }
      main.position.y = targetPositionY;
      seekToY(app.renderer.height - bottomMargin - targetPositionY);
    } else {
      var posX =
        curPosition.x -
        (app.renderer.width * containerWidthShrinkRatio.value) / 2;
      main.position.x = Math.min(
        Math.max(
          -posX / containerWidthShrinkRatio.value,
          app.renderer.width - main.width - leftMargin - rightMargin
        ),
        0
      );
    }
    updateDrawbox();
  }
}

let dragTarget: any = null;

function onDragStart(this: any, event: any) {
  dragTarget = this;
  dragging = true;
  if (isPlaying.value) {
    wasPlayingBeforeDrag = true;
    pauseAudioPlayback();
  } else {
    wasPlayingBeforeDrag = false;
  }
  if (dragTarget && dragTarget.parent && dragTarget.parent.parent == thumbnail) {
    curPosition = event.data.getLocalPosition(thumbnail);
  } else {
    curPosition = event.data.getLocalPosition(dragTarget.parent);
  }
  if (event && event.data && event.data.global) {
    dragStartX = event.data.global.x;
    dragStartY = event.data.global.y;
  }
}

function onDragEnd(event: any) {
  if (dragging && event && event.data && event.data.global) {
    const dragEndX = event.data.global.x;
    const dragEndY = event.data.global.y;
    const dist = Math.hypot(dragEndX - dragStartX, dragEndY - dragStartY);
    if (dist < 5) {
      let target = event.target;
      while (target && target !== main && target.parent !== main) {
        target = target.parent;
      }
      if (target && target.measureIndex !== undefined) {
        seekToMeasureClick(event, target, target.measureIndex);
      }
    }
  }
  dragging = false;
  curPosition = null;
  dragTarget = null;
  
  if (wasPlayingBeforeDrag) {
    startAudioPlayback(seekOffset.value);
    wasPlayingBeforeDrag = false;
  }
}

function onDragMove(this: any, event: any) {
  if (main && dragging && curPosition != null) {
    var newPosition;
    if (verticalMode.value) {
      var deltaY;
      if (dragTarget.parent.parent == thumbnail) {
        newPosition = event.data.getLocalPosition(thumbnail);
        deltaY = -curPosition.y + newPosition.y;
        const thumbnailHeightVal = app.renderer.height - bottomMargin;
        const viewBoxHeight = app.renderer.height * containerHeightShrinkRatio.value;
        const scrollRange = thumbnailHeightVal - viewBoxHeight;
        if (scrollRange > 0) {
          deltaY *= -main.height / scrollRange;
        } else {
          deltaY = 0;
        }
      } else {
        newPosition = event.data.getLocalPosition(dragTarget.parent);
        deltaY = -curPosition.y + newPosition.y;
      }

      main.position.y = Math.min(
        Math.max(
          main.position.y + deltaY,
          0
        ),
        main.height
      );
      updateDrawbox();
      curPosition = newPosition;
      
      seekToY(app.renderer.height - bottomMargin - main.position.y);
    } else {
      var deltaX;
      if (dragTarget.parent.parent == thumbnail) {
        newPosition = event.data.getLocalPosition(thumbnail);
        deltaX = -curPosition.x + newPosition.x;
        deltaX /= -containerWidthShrinkRatio.value;
      } else {
        newPosition = event.data.getLocalPosition(dragTarget.parent);
        deltaX = -curPosition.x + newPosition.x;
      }

      main.position.x = Math.min(
        Math.max(
          main.position.x + deltaX,
          app.renderer.width - main.width - leftMargin - rightMargin
        ),
        0
      );
      updateDrawbox();
      curPosition = newPosition;
    }
  }
}

const updateDrawbox = () => {
  if (containerViewBox && main) {
    if (verticalMode.value) {
      const viewBoxHeight = app.renderer.height * containerHeightShrinkRatio.value;
      const thumbnailHeightVal = app.renderer.height - bottomMargin;
      const val = (thumbnailHeightVal - viewBoxHeight) * (1 - main.position.y / main.height);
      containerViewBox.position.y = Math.min(Math.max(val, 0), thumbnailHeightVal - viewBoxHeight);
      containerViewBox.position.x = 0;
    } else {
      containerViewBox.position.x =
        (-leftMargin - main.position.x) * containerWidthShrinkRatio.value;
      containerViewBox.position.y = 0;
    }
  }
};

const random = (random: Boolean) => {
  if (random) seed.value = shuffle("1234567".split("")).join("");
  if (main != null) {
    loading.value = true;
    setTimeout(() => {
      if (main != null) {
        let nowLocation = main?.position.x;
        renderNote();
        main.position.x = nowLocation;
        updateDrawbox();
      }
    }, 5);
  }
};

const toggleOhmMode = (event: string) => {
  if (event == "you" && Object.keys(deathPointPlayer.value).length === 0) {
    alert("NO DATA");
    return;
  }
  if (main != null) {
    loading.value = true;
    setTimeout(() => {
      if (main != null) {
        let nowLocation = main.position.x;
        renderNote();
        main.position.x = nowLocation;
      }
      updateDrawbox();
    }, 200);
  }
};

const toggleNoLN = () => {
  noLN.value = !noLN.value;
  if (main != null) {
    loading.value = true;
    setTimeout(() => {
      if (main != null) {
        let nowLocation = main.position.x;
        renderNote();
        main.position.x = nowLocation;
      }
      updateDrawbox();
    }, 200);
  }
};

const toggleVerticalMode = () => {
  if (main != null) {
    loading.value = true;
    setTimeout(() => {
      if (main != null) {
        renderNote();
        updatePlayheadPosition(seekOffset.value);
      }
      updateDrawbox();
    }, 200);
  }
};

const updateScaleW = () => {
  if (main != null) {
    renderNote();
    updatePlayheadPosition(seekOffset.value);
  }
  updateDrawbox();
};

const updateScaleH = () => {
  if (main != null) {
    renderNote();
    updatePlayheadPosition(seekOffset.value);
  }
  updateDrawbox();
};

const updateNoteHeight = () => {
  if (main != null) {
    renderNote();
    updatePlayheadPosition(seekOffset.value);
  }
  updateDrawbox();
};

onMounted(async () => {
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener("keydown", handleKeyDown);
  stopPlayheadAnimation();
  stopAllAudio();
  if (audioCtx.value) {
    audioCtx.value.close();
  }
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === "Space") {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
      return;
    }
    e.preventDefault();
    togglePlay();
  }
};

const onResize = async () => {
  setTimeout(() => {
    renderNote();
  }, 200);
};</script>
