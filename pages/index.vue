<template>
  <div>
    <ClientOnly>
      <div
        v-if="jsonData && headerData"
        class="flex justify-between h-[50px] bg-black text-white text-xl font-bold p-4"
      >
        <div>
          {{
            `Lv.${headerData.difficulty.hard.level} ${jsonData.title} / ${
              jsonData.artist
            } / obj : ${jsonData.obj} / bpm: ${jsonData.bpm} / Notes: ${
              jsonData.notes
            } / Time: ${fancyTimeFormat(headerData.difficulty.hard.duration)}`
          }}
        </div>
        <button @click="toggleSetting">Setting</button>
      </div>
      <div
        v-else
        class="min-h-screen bg-zinc-900 flex justify-center items-center text-white font-bold flex-col"
      >
        <div class="">OJN Viewer by KenZ</div>
        <div class="flex flex-col text-center">
          <div>Credits</div>
          <a href="https://rodrig0v.github.io/webmania/#/"
            >https://rodrig0v.github.io/webmania/#/</a
          >
          <a href="http://www.ribbit.xyz/bms/score/"
            >http://www.ribbit.xyz/bms/score/</a
          >
          <div>Contributor</div>
          <div>Lelloq</div>
        </div>
      </div>
      <div
        v-if="showPanel"
        class="absolute bg-stone-700 top-0 right-0 px-5 w-48 h-screen flex flex-col text-white space-y-4 overflow-auto"
      >
        <button
          @click="toggleSetting"
          class="text-xl font-bold pt-4 w-full text-right"
        >
          Close
        </button>
        <div class="">Seed/Ringcon</div>
        <form class="flex w-full space-x-2" @submit.prevent="random(false)">
          <input v-model="seed" placeholder="seed" class="w-full text-black" />
          <img
            alt="random_ring"
            src="/random_ring.jpg"
            class="rounded-lg overflow-hidden cursor-pointer"
            @click="random(true)"
          />
        </form>

        <button
          type="submit"
          @click="random(false)"
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
                <span>Drop Them Here</span>
                <span>to add them</span>
              </span>
              <span v-else>
                <span>
                  Drag & Drop a .ojn file here or
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
          <div
            class="flex flex-col"
            v-if="route.query.server && route.query.id"
          >
            <div class="flex justify-center">
              <img alt="ohm" src="/ohm.png" class="w-16" />
            </div>
            <RadioGroup v-model="ohmMode" @update:model-value="toggleOhmMode" />
          </div>
          <div v-else></div>
          <div>ID : {{ headerData.song_id }}</div>
          <div>BMP</div>
          <img v-if="headerData.bmp" :src="headerData.bmp" alt="BMP" />
          <div>Image</div>
          <img v-if="headerData.image" :src="headerData.image" alt="Image" />
        </div>
        <button
          v-if="hitSounds && Object.keys(hitSounds).length !== 0"
          @click="playSong"
          class="border border-gray-400 rounded-lg text-center font-bold bg-zinc-700 py-2"
        >
          Play Song (W.I.P)
        </button>
      </div>
      <div
        class="fixed inset-0 overflow-y-auto z-[200] bg-black bg-opacity-50"
        v-if="loading"
      >
        <div class="flex h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    </ClientOnly>
    <div ref="pixiContainer"></div>
  </div>
</template>

<script setup lang="ts">
import * as PIXI from "pixi.js";
import FileParser from "~/utils/file-parser";
import { fancyTimeFormat } from "~/utils/formatter";
import { searchDeathPlayer, searchStringInDeathPoint } from "~/utils/search";
import {
  schemes,
  measureGridSize,
  measureLeftLaneSize,
  keyCh,
  rightMargin,
  bottomMargin,
} from "~/constants";

const playSong = async () => {
  const audioContext = new AudioContext();
  function scheduleSounds() {
    const currentTime = audioContext.currentTime * 1000; // Convert to milliseconds

    function scheduleNotes(notesArray: any[]) {
      for (const { hitSound, startTime } of notesArray) {
        if (hitSound === 0) continue;
        if (startTime >= currentTime) {
          const delay = (startTime - currentTime) / 1000; // Convert to seconds
          setTimeout(() => {
            new Audio(hitSounds.value[hitSound]).play();
          }, delay * 1000); // Convert back to milliseconds
        }
      }
    }
    scheduleNotes(hard.value.notes); // Schedule sounds from hard.value.notes
    scheduleNotes(hard.value.timeSounds); // Schedule sounds from hard.value.timeSounds
  }

  scheduleSounds();
};

useHead({
  title: "OJN Viewer",
  meta: [{ name: "description", content: "O2Jam Chart Viewer" }],
});

const router = useRouter();
const route = useRoute();
const pixiContainer = ref();

const thumbnailHeight = ref(50);
const leftMargin = 0;

const renderer = ref();
const containerWidthShrinkRatio = ref();
const jsonData = ref<Ribbit>();
const headerData = ref<OJNHeader>();
const showPanel = ref(true);
const seed = ref("1234567");
const ohmMode = ref("all");

const hard = ref<any>();
const hitSounds = ref<any>();

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

var base: PIXI.Container<PIXI.DisplayObject>;
var stage: PIXI.Container<PIXI.DisplayObject> | null;
var thumbnail: PIXI.Container<PIXI.DisplayObject>;
var containerViewBox: PIXI.Container<PIXI.DisplayObject> | null = null;
var grayMask: PIXI.Graphics | null = null;
// グローバル変数
var headerHeight = 20;

var measures: any[] = [];

// - レンダリングパラメータ
var scaleW = 7;
var minScaleW = 4;
var maxScaleW = 10;
var scaleH = 2;
var minScaleH = 0.5;
var maxScaleH = 3.5;

var measureFrom = 0;
var measureTo = 0;

var justX = 0;
var justY = 0;

var measureNow = 0;

const { data: ojn } = useAsyncData(
  "ojn",
  async () => {
    if (route.query.server && route.query.id) {
      loading.value = true;
      try {
        const downloadedOjn = await $fetch(`/o2ma2703.ojn`, {
          method: "GET",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          responseType: "arrayBuffer",
        });
        const response = downloadedOjn as ArrayBuffer;
        let output: ConvertedOJN = convert(response, deathPoints.value, {});
        jsonData.value = output.ribbit;
        headerData.value = output.header;
        renderNote();
      } catch (error) {
        alert("OJN NOT FOUND");
        loading.value = false;
      }
    }
  },
  { server: false }
);

const renderNote = async () => {
  PIXI.settings.ROUND_PIXELS = true;
  if (!jsonData.value) return;

  thumbnailHeight.value = Math.max(window.innerHeight * 0.05, 25);
  headerHeight = 50; /* WORKAROUND */

  if (renderer.value != null) {
    stage = null;
    containerViewBox = null;
    renderer.value.destroy(true); // GPU メモリリーク対策
  }

  renderer.value = PIXI.autoDetectRenderer({
    width: window.innerHeight,
    height: window.innerHeight - headerHeight,
    backgroundColor: schemes.default.backgroundFill,
  });

  var initStage = false;
  if (stage == null) {
    initStage = true;
    stage = new PIXI.Container();
  }
  var posXinit = leftMargin;
  var posYinit = renderer.value.height - thumbnailHeight.value - bottomMargin;
  var posX = -15;
  var posY = posYinit;
  for (measureNow = 0; measureNow < jsonData.value.score.length; measureNow++) {
    var measure;
    if (measures[measureNow] == null || initStage) {
      var expLen =
        (jsonData.value.score[measureNow].length || jsonData.value.unit) *
        scaleH;
      measure = Measure({
        index: measureNow,
        score: jsonData.value.score[measureNow],
        lnmap: jsonData.value.lnmap,
        scaleW: scaleW,
        scaleH: scaleH,
        length: jsonData.value.score[measureNow].length || jsonData.value.unit,
        pattern: pattern.value,
        unit: jsonData.value.unit,
        exratio: expLen > posYinit ? (posYinit - 1) / expLen : 1,
      });
      measures[measureNow] = measure;
    } else {
      measure = measures[measureNow];
    }
    if (posY == posYinit || posY - justY > 0) {
      posY -= justY - 1;
    } else {
      posY = posYinit - justY - 1;
      posX += justX + posXinit;
    }
    measure.cacheAsBitmap = false;
    measure.position.x = posX;
    measure.position.y = posY;
    if (initStage) stage.addChild(measure);
    measure.cacheAsBitmap = true;
  }

  if (initStage) {
    stage.cursor = "pointer";
    stage.eventMode = "static";
    stage
      .on("mousedown", onDragStart)
      .on("touchstart", onDragStart)
      .on("mouseup", onDragEnd)
      .on("mouseupoutside", onDragEnd)
      .on("touchend", onDragEnd)
      .on("touchendoutside", onDragEnd)
      .on("mousemove", onDragMove)
      .on("touchmove", onDragMove);
  }

  stage.hitArea = new PIXI.Rectangle(0, 0, stage.width, stage.height + 50);
  stage.position.x = 0;
  stage.position.y = 0;
  renderer.value.resize(window.innerWidth, window.innerHeight - headerHeight);

  thumbnail = Thumbnail(renderer.value, stage);

  thumbnail.position.x = 0;
  thumbnail.position.y = posYinit + bottomMargin;

  base = new PIXI.Container();
  base.addChild(stage);
  base.addChild(thumbnail);
  renderer.value.render(base);
  pixiContainer.value.appendChild(renderer.value.view);
  loading.value = false;
};

// 小節オブジェクト
const Measure = (param: {
  index: number;
  score: RibbitScore;
  lnmap: RibbitLNMap;
  scaleW: number;
  scaleH: number;
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
  var noteThickness = 4;
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
          }
          if (area[1][0] == gIndex) {
            lnEnd = area[1][1];
          }
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
      });
    }

    if (key in gScore) {
      gScore[key].forEach(function (value: [number, string | number]) {
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
  var ch = ["03", "08", "99"];

  ch.forEach((aKey: string) => {
    if (aKey in gScore && !(ohmMode.value === "off" && aKey === ch[2])) {
      gScore[aKey].forEach((pos) => {
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

  return measureContainer;
};

const Thumbnail = (
  inputRenderer: PIXI.IRenderer<PIXI.ICanvas>,
  stage: PIXI.Container<PIXI.DisplayObject>
) => {
  var lineWidth = 1;
  var container = new PIXI.Container();

  // サムネイル枠を作成
  var g = new PIXI.Graphics();
  g.beginFill(0x0);
  g.lineStyle(lineWidth, 0x404040, 1);
  g.moveTo(0, 0);
  g.lineTo(stage.width + lineWidth, 0);
  g.lineTo(stage.width + lineWidth, thumbnailHeight.value);
  g.lineTo(0, thumbnailHeight.value);
  g.lineTo(0, 0);
  g.endFill();
  container.addChild(g);

  // サムネイル作成
  containerWidthShrinkRatio.value = inputRenderer.width / stage.width;
  var containerHeightShrinkRatio = thumbnailHeight.value / stage.height;

  const texture = inputRenderer.generateTexture(stage, {
    resolution: 2 * containerWidthShrinkRatio.value,
    scaleMode: PIXI.SCALE_MODES.NEAREST,
  });
  var containerThumbnail = new PIXI.Sprite(texture);
  containerThumbnail.width = inputRenderer.width /*- leftMargin - rightMargin*/;
  containerThumbnail.height = thumbnailHeight.value;
  // CANVAS ではうまくスプライトが作成できない？ので無表示に
  if (inputRenderer.type != PIXI.RENDERER_TYPE.CANVAS)
    container.addChild(containerThumbnail);

  // 表示中領域の白枠を作成

  if (containerViewBox == null) {
    containerViewBox = new PIXI.Container();

    // グレーボックス
    grayMask = new PIXI.Graphics();
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
    // アルファ
    grayMask.alpha = 0.4;
    // クリック可能にする
    grayMask.cursor = "pointer";
    grayMask.eventMode = "static";
    grayMask.hitArea = new PIXI.Rectangle(
      -inputRenderer.width,
      0,
      2 * inputRenderer.width,
      thumbnailHeight.value + 50
    ); // +50: はみ出しクリック可能領域
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
    //枠の描画
    frame.moveTo(lineWidth, 0);
    frame.lineTo(inputRenderer.width * containerWidthShrinkRatio.value, 0);
    frame.lineTo(
      inputRenderer.width * containerWidthShrinkRatio.value,
      thumbnailHeight.value
    );
    frame.lineTo(lineWidth, thumbnailHeight.value);
    frame.lineTo(lineWidth, 0);
    // ドラッグ可能にする
    frame.cursor = "pointer";
    frame.eventMode = "static";
    frame.hitArea = new PIXI.Rectangle(
      lineWidth,
      0,
      inputRenderer.width * containerWidthShrinkRatio.value - lineWidth,
      thumbnailHeight.value + 50
    ); // +50: はみ出しクリック可能領域

    frame
      .on("mousedown", onDragStart)
      .on("touchstart", onDragStart)
      .on("mouseup", onDragEnd)
      .on("mouseupoutside", onDragEnd)
      .on("touchend", onDragEnd)
      .on("touchendoutside", onDragEnd)
      .on("mousemove", onDragMove)
      .on("touchmove", onDragMove);
    // frame.on('mousedown', onClick)

    containerViewBox.addChild(frame);

    container.addChild(containerViewBox);
  }

  return container;
};

var curPosition: any;
var dragging = false;

function onClick(event: any) {
  if (event.target == grayMask && stage) {
    curPosition = event.data.getLocalPosition(thumbnail);
    var posX =
      curPosition.x -
      (renderer.value.width * containerWidthShrinkRatio.value) / 2;
    stage.position.x = Math.min(
      Math.max(
        -posX / containerWidthShrinkRatio.value,
        renderer.value.width - stage.width - leftMargin - rightMargin
      ),
      0
    );
    updateDrawbox();
  }
}

let dragTarget: any = null;

function onDragStart(this: any, event: any) {
  dragTarget = this;
  dragging = true;
  curPosition = event.data.getLocalPosition(thumbnail);
}

function onDragEnd() {
  dragging = false;
  curPosition = null;
  dragTarget = null;
}

function onDragMove(this: any, event: any) {
  if (stage && dragging && curPosition != null) {
    var newPosition;
    var deltaX;
    if (dragTarget.parent.parent == thumbnail) {
      newPosition = event.data.getLocalPosition(thumbnail);
      deltaX = -curPosition.x + newPosition.x;
      deltaX /= -containerWidthShrinkRatio.value;
    } else {
      newPosition = event.data.getLocalPosition(dragTarget.parent);
      deltaX = -curPosition.x + newPosition.x;
    }

    stage.position.x = Math.min(
      Math.max(
        stage.position.x + deltaX,
        renderer.value.width - stage.width - leftMargin - rightMargin
      ),
      0
    );
    updateDrawbox();
    curPosition = newPosition;
  }
}

const updateDrawbox = () => {
  if (containerViewBox && stage) {
    containerViewBox.position.x =
      (-leftMargin - stage.position.x) * containerWidthShrinkRatio.value;
    containerViewBox.position.y = 0;
  }
  requestAnimationFrame(refresh);
};

var refresh = function () {
  renderer.value.render(base);
};

function shuffle(arr: string[]) {
  var i, j, tmp, length;
  for (length = arr.length, i = length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

const toggleSetting = () => {
  if (jsonData.value) {
    showPanel.value = !showPanel.value;
  }
};

const random = (random: Boolean) => {
  if (random) seed.value = shuffle("1234567".split("")).join("");
  if (stage != null) {
    loading.value = true;
    setTimeout(() => {
      if (stage != null) {
        let nowLocation = stage?.position.x;
        renderNote();
        stage.position.x = nowLocation;
        updateDrawbox();
      }
    }, 5);
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
    deathPoints.value = {};
    loading.value = true;
    jsonData.value = output.ribbit;
    headerData.value = output.header;
    hard.value = output.hard;
    hitSounds.value = output.hitSounds;
    router.replace("/");
    setTimeout(() => {
      renderNote();
    }, 5);
  } catch (err) {
    alert("err" + err);
  } finally {
  }
};

const toggleOhmMode = (event: string) => {
  if (event == "you" && Object.keys(deathPointPlayer.value).length === 0) {
    alert("NO DATA");
    return;
  }
  loading.value = true;
  setTimeout(() => {
    if (stage != null) {
      let nowLocation = stage?.position.x;
      renderNote();
      stage.position.x = nowLocation;
    }
    updateDrawbox();
  }, 200);
};
</script>
