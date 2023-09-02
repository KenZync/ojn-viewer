<template>
  <div>
    <div ref="pixiContainer"></div>
  </div>
</template>

<script setup lang="ts">
import * as PIXI from "pixi.js";

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
    noteBlueFill: 0x5074fe,
    noteBlueLine: null,
    noteWhiteFill: 0xbebebe,
    noteWhiteLine: null,
    noteRedFill: 0xe04a4a,
    noteRedLine: null,
    lnoteBlueFill: 0xb0c0ff,
    lnoteBlueLine: null,
    lnoteWhiteFill: 0xe6ffc2,
    lnoteWhiteLine: null,
    lnoteRedFill: 0xff9a9a,
    lnoteRedLine: null,
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

var colorScheme = "default";

const pixiContainer = ref();

const thumbnailHeight = ref(50);
const leftMargin = 20;

onMounted(async () => {
  PIXI.settings.ROUND_PIXELS = true;
  // グローバル変数
  var rightMargin = leftMargin;
  var bottomMargin = 10;
  var headerHeight = 20;

  var renderer = null;
  var base = null;
  var stage = null;
  var thumbnail = null;
  var measures = [];
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
  var pattern = null;
  var measureFrom = 0;
  var measureTo = 0;

  const json: any = await $fetch("/test.json");
  var res = true;
  //   if (json.notes > 100000) {
  //     res = confirm(
  //       "10万ノーツ以上の譜面を開こうとしています\n続行するとブラウザがクラッシュする可能性があります"
  //     );
  //   }

  //   if (res) {

  thumbnailHeight.value = Math.max(window.innerHeight * 0.05, 25);
  headerHeight = 50; /* WORKAROUND */

  renderer = PIXI.autoDetectRenderer({
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
  var posYinit = renderer.height - thumbnailHeight.value - bottomMargin;
  var posX = posXinit;
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
        pattern: pattern,
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
    // }
    // console.log(measure)
  }
  //   if (initStage) {
  //         stage.interactive = true;
  //         stage.buttonMode = true;
  //         stage.on('mousedown', onDragStart)
  //             .on('touchstart', onDragStart)
  //             .on('mouseup', onDragEnd)
  //             .on('mouseupoutside', onDragEnd)
  //             .on('touchend', onDragEnd)
  //             .on('touchendoutside', onDragEnd)
  //             .on('mousemove', onDragMove)
  //             .on('touchmove', onDragMove);
  //     }
  stage.hitArea = new PIXI.Rectangle(0, 0, stage.width, stage.height);
  stage.position.x = 0;
  stage.position.y = 0;
  renderer.resize(window.innerWidth, window.innerHeight - headerHeight);

  thumbnail = Thumbnail(renderer, stage);

  thumbnail.position.x = 0;
  thumbnail.position.y = posYinit + bottomMargin;

  base = new PIXI.Container();
  base.addChild(stage);
  base.addChild(thumbnail);
  renderer.render(base);
  pixiContainer.value.appendChild(renderer.view);
});

// 小節オブジェクト
const Measure = (param: any) => {
  var lineWidth = 1;
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
    g.moveTo(-1, gHeight - (measureGrid * i * gUnitLength) / 16 - lineWidth);
    g.lineTo(
      gWidth,
      gHeight - (measureGrid * i * gUnitLength) / 16 - lineWidth
    );

    //Draw Note Lines
    // ノート境界線を描画
    // SC:5, KEY:2, LABEL:2
    var grid = gGridX;
    var color = schemes.default.laneLine;
    var idx = gSide == 1 ? 5 : 2 * gKeys + 5;
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
    g.moveTo(-lineWidth, 0);
    g.lineTo(gWidth + lineWidth, 0);
    g.lineTo(gWidth + lineWidth, gHeight - lineWidth);
    g.lineTo(-lineWidth, gHeight - lineWidth);
    g.lineTo(-lineWidth, 0);
    //   };

    //Draw Notes
    var keych = keyCh[7];
    if (gPattern != null && gPattern.length == gKeys) {
      var temp = keych;
      keych = [];
      for (var i = 0; i < gKeys; i++) {
        keych.push(temp[gPattern[i]]);
      }
    }
    // ノート描画
    var noteThickness = 4;
    var blue = schemes.default.noteBlueFill;
    var white = schemes.default.noteWhiteFill; // 0x8b8b8b
    var red = schemes.default.noteRedFill;
    var blueLine = schemes.default.noteBlueLine;
    var whiteLine = schemes.default.noteWhiteLine;
    var redLine = schemes.default.noteRedLine;
    var lnWhite = schemes.default.lnoteWhiteFill;
    var lnBlue = schemes.default.lnoteBlueFill;
    var lnRed = schemes.default.lnoteRedFill;
    var lnWhiteLine = schemes.default.lnoteWhiteLine;
    var lnBlueLine = schemes.default.lnoteBlueLine;
    var lnRedLine = schemes.default.lnoteRedLine;
    var mineRed = schemes.default.mineRedFill;
    var mineRedLine = schemes.default.mineRedLine;
    var lnRatio = schemes.default.lnWidthRatio;

    // KEY
    var idx = gSide == 1 ? 5 : 0;
    var color = blue;
    var colorBlueLine = blueLine;
    var lnColor = lnBlue;
    var lnColorLine = lnBlueLine;

    keych.forEach(function (key) {
      if (color == blue) {
        color = white;
        colorBlueLine = whiteLine;
      } else {
        color = blue;
        colorBlueLine = blueLine;
      }
      if (lnColor == lnBlue) {
        lnColor = lnWhite;
        lnColorLine = lnWhiteLine;
      } else {
        lnColor = lnBlue;
        lnColorLine = lnBlueLine;
      }

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
            g.beginFill(lnColor);
            g.lineStyle(noteLineWidth, lnColorLine, noteLineAlpha);
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
        var _color = q[1];
        var _colorLine = q[2];
        if (_key in gScore) {
          gScore[_key].forEach(function (pos: number[]) {
            var noteLineWidth = _colorLine != null ? 1 : 0;
            var noteLineAlpha = _colorLine != null ? 1 : 0;
            g.beginFill(_color);
            g.lineStyle(noteLineWidth, _colorLine, noteLineAlpha);
            g.drawRect(
              idx * gGridX - (idx == 0 ? lineWidth : 0),
              gHeight - (gGridY * pos[0] + noteThickness) - lineWidth,
              2 * gGridX - (idx == 0 ? 0 : lineWidth) + noteLineWidth,
              noteThickness
            );
            g.endFill();
          });
        }
      });
      idx += 2;
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
          g.moveTo(-1, gHeight - gGridY * pos[0] - lineH);
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
  renderer: PIXI.IRenderer<PIXI.ICanvas>,
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
  var containerWidthShrinkRatio = renderer.width / stage.width;
  var containerHeightShrinkRatio = thumbnailHeight.value / stage.height;

  const texture = renderer.generateTexture(stage,{resolution: 2 * containerWidthShrinkRatio, scaleMode:PIXI.SCALE_MODES.NEAREST})
  var containerThumbnail = new PIXI.Sprite(texture);
  containerThumbnail.width = renderer.width /*- leftMargin - rightMargin*/ ;
  containerThumbnail.height = thumbnailHeight.value;
  // CANVAS ではうまくスプライトが作成できない？ので無表示に
    if (renderer.type != PIXI.RENDERER_TYPE.CANVAS) container.addChild(containerThumbnail);

  // 表示中領域の白枠を作成

  var containerViewBox = new PIXI.Container();

  // グレーボックス
  var grayMask = new PIXI.Graphics();
  //左
  grayMask.beginFill(0xffffff);
  grayMask.lineStyle(lineWidth, 0x404040, 1);
  grayMask.moveTo(0, 0);
  grayMask.lineTo(-renderer.width, 0);
  grayMask.lineTo(-renderer.width, thumbnailHeight.value);
  grayMask.lineTo(0, thumbnailHeight.value);
  grayMask.lineTo(0, 0);
  // 右
  grayMask.moveTo(renderer.width * containerWidthShrinkRatio, 0);
  grayMask.lineTo(renderer.width, 0);
  grayMask.lineTo(renderer.width, thumbnailHeight.value);
  grayMask.lineTo(
    renderer.width * containerWidthShrinkRatio,
    thumbnailHeight.value
  );
  grayMask.lineTo(renderer.width * containerWidthShrinkRatio, 0);
  grayMask.endFill();
  // アルファ
  grayMask.alpha = 0.4;
  // クリック可能にする
  // grayMask.buttonMode = true;
  // grayMask.interactive = true;
  grayMask.cursor = 'pointer';
  grayMask.eventMode = 'static';
  grayMask.hitArea = new PIXI.Rectangle(
    -renderer.width,
    0,
    2 * renderer.width,
    thumbnailHeight.value + 50

    
  ); // +50: はみ出しクリック可能領域
  // grayMask.on('mousedown', onClick)
  //     .on('touchstart', onClick);
  grayMask.on('pointerdown', onClick)

  containerViewBox.addChild(grayMask);

  var frame = new PIXI.Graphics();
  frame.lineStyle(lineWidth, 0xffffff, 1);
  //枠の描画
  frame.moveTo(lineWidth, 0);
  frame.lineTo(renderer.width * containerWidthShrinkRatio, 0);
  frame.lineTo(
    renderer.width * containerWidthShrinkRatio,
    thumbnailHeight.value
  );
  frame.lineTo(lineWidth, thumbnailHeight.value);
  frame.lineTo(lineWidth, 0);
  // ドラッグ可能にする
  // frame.buttonMode = true;
  // frame.interactive = true;
  frame.hitArea = new PIXI.Rectangle(
    lineWidth,
    0,
    renderer.width * containerWidthShrinkRatio - lineWidth,
    thumbnailHeight.value + 50
  ); // +50: はみ出しクリック可能領域
  // frame.on('mousedown', onDragStart)
  //     .on('touchstart', onDragStart)
  //     .on('mouseup', onDragEnd)
  //     .on('mouseupoutside', onDragEnd)
  //     .on('touchend', onDragEnd)
  //     .on('touchendoutside', onDragEnd)
  //     .on('mousemove', onDragMove)
  //     .on('touchmove', onDragMove);
  containerViewBox.addChild(frame);

  container.addChild(containerViewBox);

  containerViewBox.position.x =
    (-leftMargin - stage.position.x) * containerWidthShrinkRatio;
  containerViewBox.position.y = 0;

  return container;
};

function onClick(this: any, event:any) {
  console.log(event.data.x,event.data.y)
  // var posX = curPosition.x - renderer.width * thumbnail.widthShrinkRatio / 2;
    // console.log(this.this.parent.parent == thumbnail)
    // console.log(thumbnail.value)
    // if (this.parent.parent == thumbnail) {
    //     curPosition = this.data.getLocalPosition(thumbnail);
    //     var posX = curPosition.x - renderer.width * thumbnail.widthShrinkRatio / 2;
    //     stage.position.x = Math.min(Math.max(-posX / thumbnail.widthShrinkRatio, renderer.width - stage.width - leftMargin - rightMargin), 0);
    //     thumbnail.drawViewBox();
    //     requestAnimationFrame(refresh);
    // }
}
</script>

<style scoped></style>
