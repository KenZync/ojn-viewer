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
        <TitleScreen />
      </div>
      <Sidebar
        v-if="showPanel"
        class="absolute bg-stone-700 top-0 right-0 px-5 w-48 h-screen flex flex-col text-white space-y-3 overflow-auto"
        :hit-sounds="hitSounds"
        :header-data="headerData"
        @close="toggleSetting"
        @random="random"
        @upload="upload"
        @toggle-ohm-mode="toggleOhmMode"
        @play-song="playSong"
      />
      <div
        class="fixed inset-0 overflow-y-auto z-[200] bg-black bg-opacity-50"
        v-if="loading"
      >
        <div class="flex h-screen items-center">
          <LoadingSpinner />
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
const jsonData = ref<Ribbit>();
const headerData = ref<OJNHeader>();
const showPanel = ref(true);
const seed = useSeed();
const ohmMode = useOhm();

const hard = ref<any>();
const hitSounds = ref<any>();

var app: PIXI.Application<PIXI.ICanvas>;
var main: PIXI.Container<PIXI.DisplayObject> | null;
var thumbnail: PIXI.Container<PIXI.DisplayObject> | null;
var containerViewBox: PIXI.Container<PIXI.DisplayObject> | null = null;
var preview: PIXI.Graphics | null = null;
var grayMask: PIXI.Graphics | null = null;
// グローバル変数

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

let pHeight = 0;
let greenLine: any = {};

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
        const downloadUrl = await $fetch(
          `/api/${route.query.server}/${route.query.id}`,
          {
            query: {
              folder: route.query.folder,
            },
          }
        );
        const responseUrl = downloadUrl;
        const downloadedOjn = await $fetch(responseUrl, {
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
        alert("OJN NOT FOUND " + error);
        loading.value = false;
      }
    }
  },
  { server: false }
);

const playSong = async () => {
  function scheduleSounds() {
    function scheduleNotes(notesArray: any[]) {
      for (const { hitSound, startTime } of notesArray) {
        setTimeout(() => {
          if (hitSounds.value[hitSound] == null) return;
          if (hitSounds.value[hitSound].length == 82) {
            return;
          }
          new Audio(hitSounds.value[hitSound]).play();
        }, startTime);
      }
    }
    scheduleNotes(hard.value.notes); // Schedule sounds from hard.value.notes
    scheduleNotes(hard.value.timeSounds); // Schedule sounds from hard.value.timeSounds
  }
  scheduleSounds();
  runPreviewLine();
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
  setTimeout(() => {
    renderNote();
  }, 5);
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
    thumbnail.destroy(true);
    main.destroy(true);
    main = null;
    thumbnail = null;
    greenLine = [];
  }

  var initMain = false;
  if (main == null) {
    initMain = true;
    main = new PIXI.Container();
  }

  var posXinit = leftMargin;
  var posYinit = app.renderer.height - thumbnailHeight.value - bottomMargin;
  var posX = -15;
  var posY = posYinit;

  for (measureNow = 0; measureNow < jsonData.value.score.length; measureNow++) {
    var measure;
    if (measures[measureNow] == null || initMain) {
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
    if (initMain) main.addChild(measure);
    measure.cacheAsBitmap = true;
  }

  if (initMain) {
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
  }

  main.hitArea = new PIXI.Rectangle(0, 0, main.width, main.height + 50);
  main.position.x = 0;
  main.position.y = 0;

  thumbnail = Thumbnail(app.renderer, main);
  thumbnail.position.x = 0;
  thumbnail.position.y = posYinit + bottomMargin;

  var previewLineWidth = 1;

  pHeight = jsonData.value.unit * scaleH * 1;
  var pWidth = measureGridSize[7] * scaleW;

  var previewWidth = 1;
  var previewStart = 35;
  //   // コンテナサイズを決定

  preview = new PIXI.Graphics();
  preview.lineStyle(previewLineWidth, schemes.default.previewLine, 1);
  preview.moveTo(pWidth - previewWidth, pHeight - previewLineWidth);
  preview.lineTo(previewStart - 1, pHeight - previewLineWidth);
  preview.x = main.children[0].x;
  preview.y = main.children[0].y;

  main.addChild(preview);

  app.stage.addChild(main);
  app.stage.addChild(thumbnail);

  loading.value = false;
};

let offset = 0;
const runPreviewLine = () => {
  if (preview) {
    offset = preview.position.y - pHeight;
  }
  let anime: AnimeInstance;
  for (const room in greenLine) {
    const lines = greenLine[room];
    for (const line in lines) {
      setTimeout(() => {
        if (preview) {
          if (anime) {
            anime.seek(anime.duration);
          }
        }
        if (parseInt(line) == 0 && preview && main) {
          main.position.x = Math.min(
            Math.max(
              -measureLocation.value[parseInt(room)].x,
              app.renderer.width - main.width - leftMargin - rightMargin
            ),
            0
          );
          updateDrawbox();
          preview.position = measureLocation.value[parseInt(room)];
          offset = preview.position.y - pHeight + 1;
        }
        if (preview) {
          anime = $anime({
            targets: preview.position,
            y: greenLine[room][line].to + offset + 1,
            easing: "linear",
            duration: greenLine[room][line].duration,
          });
        }
      }, greenLine[room][line].startTime);
    }
  }
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
          if (!greenLine[measureNow]) {
            greenLine[measureNow] = [];
          }
          if (pos[2]) {
            greenLine[measureNow].push({
              y: gHeight - gGridY * pos[0] - lineH,
              to: gHeight - gGridY * pos[2] - lineH,
              duration: pos[3],
              startTime: pos[4],
            });
          }
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

  return container;
};

var curPosition: any;
var dragging = false;

function onClick(event: any) {
  if (event.target == grayMask && main) {
    curPosition = event.data.getLocalPosition(thumbnail);
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
  if (main && dragging && curPosition != null) {
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

const updateDrawbox = () => {
  if (containerViewBox && main) {
    containerViewBox.position.x =
      (-leftMargin - main.position.x) * containerWidthShrinkRatio.value;
    containerViewBox.position.y = 0;
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
  loading.value = true;
  setTimeout(() => {
    if (main != null) {
      let nowLocation = main?.position.x;
      renderNote();
      main.position.x = nowLocation;
    }
    updateDrawbox();
  }, 200);
};

onMounted(async () => {
  window.addEventListener("resize", onResize);
});

const onResize = async () => {
  setTimeout(() => {
    renderNote();
  }, 200);
};
</script>
