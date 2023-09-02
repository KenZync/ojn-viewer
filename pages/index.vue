<template>
  <div>
    <div
      v-if="jsonData"
      class="flex justify-between h-[50px] bg-black text-white text-xl font-bold p-4"
    >
      <div>
        {{
          `${jsonData.title} / ${jsonData.artist} / obj : ${jsonData.obj} / bpm: ${jsonData.bpm} / Notes: ${jsonData.notes}`
        }}
      </div>
      <button @click="toggleSetting">Setting</button>
    </div>
    <div
      v-else
      class="min-h-screen bg-gray-500 flex justify-center items-center text-white font-bold flex flex-col"
    >
      <div class="">OJN Viewer by KenZ</div>
      <div class="flex flex-col text-center">
        <div>Credits</div>
        <a href="https://rodrig0v.github.io/webmania/#/">https://rodrig0v.github.io/webmania/#/</a>
        <a href="http://www.ribbit.xyz/bms/score/">http://www.ribbit.xyz/bms/score/</a>
        <div>Contributer</div>
        <div>Lelloq</div>
      </div>
    </div>
    <div
      v-if="showPanel"
      class="absolute top-0 right-0 bg-stone-700 px-5 w-48 h-screen flex flex-col text-white space-y-4"
    >
      <button
        @click="toggleSetting"
        class="text-xl font-bold pt-4 w-full text-right"
      >
        Close
      </button>
      <div class="">Options</div>
      <div class="flex w-full space-x-2">
        <input v-model="seed" placeholder="seed" class="w-full text-black" />
        <button
          @click="random"
          class="border w-8 h-8 rounded-full text-center font-bold bg-gray-700"
        >
          R
        </button>
      </div>

      <button
        @click="renderNote"
        class="border rounded-lg text-center font-bold bg-gray-700 py-2"
      >
        OK
      </button>

      <DropZone
        class="drop-area text-center"
        @files-dropped="onInputChange"
        #default="{ dropZoneActive }"
      >
        <div class="border-dashed border-2 h-28 flex items-center">
          <label for="file-input" class="text-stone-200">
            <span v-if="dropZoneActive">
              <span>Drop Them Here</span>
              <span>to add them</span>
            </span>
            <span v-else>
              <span>Drag Your .ojn Here</span>
              <span>
                or <strong><em>click here</em></strong> to select file
              </span>
            </span>

            <input
              class="hidden"
              type="file"
              id="file-input"
              @change="onInputChange"
            />
          </label>
        </div>
      </DropZone>
      <div class=""></div>
    </div>
    <div ref="pixiContainer"></div>
  </div>
</template>

<script setup lang="ts">
import * as PIXI from "pixi.js";
import FileParser from "~/utils/file-parser";

useHead({
  title: "OJN Viewer",
  meta: [{ name: "description", content: "O2Jam Chart Viewer" }],
});

var schemes = {
  default: {
    backgroundFill: 0x000000,
    outerBound: 0xffffff,
    quarterLine: 0x808080,
    sixteenthLine: 0x404040,
    laneLine: 0x404040,
    labelFill: 0x808080,
    labelText: 0xffffff,
    bpmLine: 0x00ff00,
    bpmText: 0x00ff00,
    bpmTextStroke: 0x808080,
    stopLine: 0xff0000,
    stopText: null,
    stopTextStroke: null,
    noteBlueFill: 0x02ffff,
    noteBlueLine: null,
    noteWhiteFill: 0xffffff,
    noteWhiteLine: null,
    noteYellowFill: 0xe1c85b,
    noteYellowLine: null,
    lnoteBlueFill: 0x02ffff,
    lnoteBlueLine: null,
    lnoteWhiteFill: 0xffffff,
    lnoteWhiteLine: null,
    lnoteYellowFill: 0xe1c85b,
    lnoteYellowLine: null,
    mineRedFill: 0x700000,
    mineRedLine: 0x700000,
    lnWidthRatio: 0,
    bpmLineH: 1,
  },
  mono: {
    backgroundFill: 0xffffff,
    outerBound: 0x000000,
    quarterLine: 0x7f7f7f,
    sixteenthLine: 0xbfbfbf,
    laneLine: 0x7f7f7f,
    labelFill: 0xffffff,
    labelText: 0x000000,
    bpmText: 0x000000,
    bpmTextStroke: 0xffffff,
    stopLine: 0x000000,
    stopText: 0x000000,
    stopTextStroke: 0xffffff,
    noteBlueFill: 0x000000,
    noteBlueLine: 0x000000,
    noteWhiteFill: 0xffffff,
    noteWhiteLine: 0x000000,
    noteRedFill: 0x000000,
    noteRedLine: 0x000000,
    lnoteBlueFill: 0x000000,
    lnoteBlueLine: 0x000000,
    lnoteWhiteFill: 0xffffff,
    lnoteWhiteLine: 0x000000,
    lnoteRedFill: 0xffffff,
    lnoteRedLine: 0x000000,
    mineRedFill: 0x7f7f7f,
    mineRedLine: 0x7f7f7f,
    lnWidthRatio: 0.8,
    bpmLineH: 2,
  },
};

// 定数
var measureGridSize = {
  7: 23,
};

var measureLeftLaneSize = {
  7: measureGridSize[7] - 4,
};

var keypatInit = {
  7: "1234567",
};

var keyCh = {
  7: ["11", "12", "13", "14", "15", "18", "19"],
};

const pixiContainer = ref();

const thumbnailHeight = ref(50);
const leftMargin = 20;

const renderer = ref();
const containerWidthShrinkRatio = ref();
const jsonData = ref();
const showPanel = ref(true);
const seed = ref("1234567");
const pattern = computed(() => {
  return seed.value.split("").map((char) => (parseInt(char) - 1).toString());
});

var base: PIXI.Container<PIXI.DisplayObject>;
var stage: PIXI.Container<PIXI.DisplayObject> | null;
var thumbnail: PIXI.Container<PIXI.DisplayObject>;
var containerViewBox: PIXI.Container<PIXI.DisplayObject> | null = null;
var grayMask: PIXI.Graphics | null = null;
var rightMargin = leftMargin;
// グローバル変数
var bottomMargin = 10;
var headerHeight = 20;

// var renderer.value = null;

var measures: any[] = [];
var data = null;
var md5 = "";

// - レンダリングパラメータ
var urlParam = {};
var scaleW = 7;
var minScaleW = 4;
var maxScaleW = 10;
var scaleH = 2;
var minScaleH = 0.5;
var maxScaleH = 3.5;
var playSide = 1;
var measureFrom = 0;
var measureTo = 0;
const renderNote = async () => {
  PIXI.settings.ROUND_PIXELS = true;
  // var pattern = null
  // const json: any = await $fetch("/test.json");
  // jsonData.value = json;
  let json = jsonData.value;
  var res = true;
  //   if (json.notes > 100000) {
  //     res = confirm(
  //       "10万ノーツ以上の譜面を開こうとしています\n続行するとブラウザがクラッシュする可能性があります"
  //     );
  //   }

  //   if (res) {

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
  var posX = 0;
  var posY = posYinit;
  for (var x = 0; x < json.score.length; x++) {
    // console.log(x);
    // if (i >= measureFrom && i <= measureTo) {
    var measure;
    if (measures[x] == null || initStage) {
      var expLen = (json.score[x].length || json.unit) * scaleH;
      measure = Measure({
        index: x,
        score: json.score[x],
        lnmap: json.lnmap,
        scaleW: scaleW,
        scaleH: scaleH,
        length: json.score[x].length || json.unit,
        side: playSide,
        keys: 7,
        pattern: pattern.value,
        unit: json.unit,
        exratio: expLen > posYinit ? (posYinit - 1) / expLen : 1,
      });
      measures[x] = measure;
    } else {
      measure = measures[x];
    }
    if (posY == posYinit || posY - measure.height > 0) {
      posY -= measure.height - 1;
    } else {
      posY = posYinit - measure.height - 1;
      posX += measure.width + posXinit;
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

  stage.hitArea = new PIXI.Rectangle(0, 0, stage.width, stage.height);
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
};

// 小節オブジェクト
const Measure = (param: any) => {
  var lineWidth = 1;
  var lineStart = 35;
  var container = new PIXI.Container();
  var g = new PIXI.Graphics();
  container.addChild(g);

  //   // コンテナサイズを決定
  var cHeight = param.length * param.scaleH * param.exratio;
  var cWidth = measureGridSize[7] * param.scaleW;
  var gHeight = param.length * param.scaleH * param.exratio;
  var gWidth = measureGridSize[7] * param.scaleW;

  //   // パラメータをセット
  var gLogicalLength = param.length;
  var gUnitLength = param.unit;
  var gIndex = param.index;
  var gScore = param.score;
  var gLnmap = param.lnmap;
  var gKeys = param.keys;
  var gGridX = param.scaleW;
  var gGridY = gHeight / gLogicalLength;
  var gSide = param.side;
  var gPattern = param.pattern;
  // console.log(param)

  //   // 小節線描画メソッド
  //   g.drawMeasureLines = function () {
  var measureGrid = gHeight / gLogicalLength;

  for (var i = 1; (i * gUnitLength) / 16 < gLogicalLength; i++) {
    var color = schemes.default.sixteenthLine; //  16分音符
    if (i % 4 == 0) {
      color = schemes.default.quarterLine;
    } // 4分音符

    //Draw Measure Line
    g.lineStyle(lineWidth, color, 1);
    g.moveTo(lineStart - 1, gHeight - (measureGrid * i * gUnitLength) / 16 - lineWidth);
    g.lineTo(
      gWidth,
      gHeight - (measureGrid * i * gUnitLength) / 16 - lineWidth
    );

    //Draw Note Lines
    // ノート境界線を描画
    // SC:5, KEY:2, LABEL:2
    var grid = gGridX;
    var color = schemes.default.laneLine;
    var idx = 5;
    // console.log(idx)
    // SC
    g.lineStyle(lineWidth, color, 1);
    g.moveTo(grid * idx, 0);
    g.lineTo(grid * idx, gHeight - lineWidth);

    // KEY
    if (gSide == 2) idx = 0;
    // console.log(i,gSide,gKeys)
    for (var j = 0; j < gKeys; j++) {
      idx += 2;
      g.moveTo(grid * idx, 0);
      g.lineTo(grid * idx, gHeight - lineWidth);
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
      var fontSetting = "bold " + grid * 2 + "px Arial";
      var labelText = new PIXI.Text(gIndex, {
        fontSize: grid * 2,
        fontWeight: "bold",
        // font: fontSetting,
        fill: schemes.default.labelText,
      });
      labelText.anchor.x = 0.5;
      labelText.anchor.y = 0.5;
      labelText.x = grid * idx;
      labelText.y = gHeight / 2;
      container.addChild(labelText);
    }

    //   // 外枠描画メソッド
    //   g.drawOuterBound = function () {
    g.lineStyle(lineWidth, schemes.default.outerBound, 1);
    g.moveTo(lineStart - 1, 0);
    g.lineTo(gWidth + lineWidth, 0);
    g.lineTo(gWidth + lineWidth, gHeight - lineWidth);
    g.lineTo(lineStart - 1, gHeight - lineWidth);
    g.lineTo(lineStart - 1, 0);
    //   };

    // gPattern=['0','2','4,','1','3','5','6']
    // gPattern=[0,2,4,1,3,5,6]

    // console.log(gPattern)

    //Draw Notes
    var keych: string[] = [];
    if (gPattern != null && gPattern.length == gKeys) {
      for (var c = 0; c < gKeys; c++) {
        keych[c] = keyCh[7][parseInt(gPattern[c])];
      }
    } else {
      keych = keyCh[7];
    }
    // console.log(gPattern,keych)
    // ノート描画
    var noteThickness = 4;
    var blue = schemes.default.noteBlueFill;
    var white = schemes.default.noteWhiteFill; // 0x8b8b8b
    var yellow = schemes.default.noteYellowFill;
    var blueLine = schemes.default.noteBlueLine;
    var whiteLine = schemes.default.noteWhiteLine;
    var yellowLine = schemes.default.noteYellowLine;
    var lnWhite = schemes.default.lnoteWhiteFill;
    var lnBlue = schemes.default.lnoteBlueFill;
    var lnYellow = schemes.default.lnoteYellowFill;
    var lnWhiteLine = schemes.default.lnoteWhiteLine;
    var lnBlueLine = schemes.default.lnoteBlueLine;
    var lnYellowLine = schemes.default.lnoteYellowLine;
    var mineRed = schemes.default.mineRedFill;
    var mineRedLine = schemes.default.mineRedLine;
    var lnRatio = schemes.default.lnWidthRatio;

    // KEY
    var idx = 5;
    var color = blue;
    var colorBlueLine = blueLine;
    var lnColor = lnBlue;
    var lnColorLine = lnBlueLine;

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
            var noteLineWidth = lnColorLine != null ? 1 : 0;
            var noteLineAlpha = lnColorLine != null ? 1 : 0;
            g.beginFill(colSchemeLN[counter]);
            g.lineStyle(
              noteLineWidth,
              lnColorLine != null ? lnColorLine : 0,
              noteLineAlpha
            );
            g.drawRect(
              idx * gGridX -
                (idx == 0 ? lineWidth : 0) +
                (lnRatio * gGridX) / 2,
              gHeight -
                gGridY * lnEnd -
                lineWidth +
                (lnEnd == gLogicalLength ? noteLineWidth : 0),
              2 * gGridX - (idx == 0 ? 0 : lineWidth) - lnRatio * gGridX,
              gGridY * (lnEnd - lnBegin) +
                (lnBegin == 0 ? lineWidth : 0) -
                lineWidth -
                (lnEnd == gLogicalLength ? noteLineWidth : 0)
            );
            g.endFill();
          }
        });
      }
      [
        ["D" + key.charAt(1), mineRed, mineRed],
        [key, color, colorBlueLine],
      ].forEach(function (q) {
        var _key = q[0];
        var _colorLine = q[2];
        if (_key !== null) {
          if (_key in gScore) {
            gScore[_key].forEach(function (pos: number[]) {
              var noteLineWidth = _colorLine != null ? 1 : 0;
              var noteLineAlpha = _colorLine != null ? 1 : 0;
              g.beginFill(colScheme[counter]);
              g.lineStyle(
                noteLineWidth,
                _colorLine == null ? 0 : _colorLine,
                noteLineAlpha
              );
              g.drawRect(
                idx * gGridX - (idx == 0 ? lineWidth : 0),
                gHeight - (gGridY * pos[0] + noteThickness) - lineWidth,
                2 * gGridX - (idx == 0 ? 0 : lineWidth) + noteLineWidth,
                noteThickness
              );
              g.endFill();
            });
          }
        }
      });
      idx += 2;
      counter++;
    });

    //Draw BPM
    var colorLine = schemes.default.bpmLine;
    var colorText = schemes.default.bpmText;
    var colorStroke = schemes.default.bpmTextStroke;
    var lineH = schemes.default.bpmLineH;
    // BPM, exBPM
    var ch = ["03", "08"];
    ch.forEach(function (aKey) {
      if (aKey in gScore) {
        gScore[aKey].forEach(function (pos: number[]) {
          g.lineStyle(lineH, colorLine, 1);
          g.moveTo(lineStart, gHeight - gGridY * pos[0] - lineH);
          g.lineTo(
            gGridX * measureLeftLaneSize[7],
            gHeight - gGridY * pos[0] - lineH
          );

          if (colorText != null) {
            var fontSetting = "bold " + gGridX * 1.5 + "px Arial";
            var labelText = new PIXI.Text(Math.round(pos[1] * 10) / 10, {
              // font: fontSetting,
              fontSize: gGridX * 1.5,
              fontWeight: "bold",
              fill: colorText,
              stroke: colorStroke,
              strokeThickness: colorStroke != null ? 2 : 0,
            });
            labelText.anchor.x = 0.5;
            labelText.anchor.y = 0.5;
            labelText.x = gGridX * (measureLeftLaneSize[7] + 2);
            labelText.y = gHeight - gGridY * pos[0] - lineWidth;
            container.addChild(labelText);
          }
        });
      }
    });
  }

  return container;
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
    grayMask.on("mousedown", onClick).on("touchstart", onClick);

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
  // console.log(event.target == thumbnail)
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

function onDragStart(this: any, event: any) {
  dragging = true;
  curPosition = event.data.getLocalPosition(thumbnail);
}

function onDragEnd() {
  dragging = false;
  curPosition = null;
}

function onDragMove(this: any, event: any) {
  if (stage && dragging && curPosition != null) {
    var newPosition;
    var deltaX;
    if (this.parent.parent == thumbnail) {
      newPosition = event.data.getLocalPosition(thumbnail);
      deltaX = -curPosition.x + newPosition.x;
      deltaX /= -containerWidthShrinkRatio.value;
    } else {
      newPosition = event.data.getLocalPosition(this.parent);
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
  if(jsonData.value){
    showPanel.value = !showPanel.value;
  }
};

const random = () => {
  seed.value = shuffle("1234567".split("")).join("");
  renderNote();
};
function validateKeyPattern(p: any, k: any) {
  var isValid = false;
  var ret = [];
  var str = "";

  if (p == 0) {
    str = String(p);
    for (var i = 0; i < k; i++) {
      ret.push(i);
    }
    isValid = true;
  } else if (p == 1) {
    str = String(p);
    for (var i = 1; i <= k; i++) {
      ret.push(k - i);
    }
    isValid = true;
  } else {
    var ar = p.split("");
    if (ar.length == k) {
      ar = ar.filter(function (x: any, i: any, self: any) {
        return self.indexOf(x) === i && x >= 1 && x <= k;
      });
      if (ar.length == k) {
        ret = [];
        str = "";
        for (var i = 0; i < k; i++) {
          ret.push(ar[i] - 1);
          str += ar[i];
        }
        isValid = true;
      }
    }
  }
  return [isValid, ret, str];
}

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
    jsonData.value = await FileParser.parseFiles(files, drop);
    renderNote();
  } catch (err) {
    console.log("err", err);
  } finally {
  }
};
</script>
