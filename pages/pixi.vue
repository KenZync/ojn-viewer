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
// const { data:json } = await useFetch('/test.json')

const pixiContainer = ref();

onMounted(async () => {
  // グローバル変数
  var leftMargin = 20;
  var rightMargin = leftMargin;
  var bottomMargin = 10;
  var headerHeight = 20;
  var thumbnailHeight = 50;
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

  // const test = new PIXI.Container

  const json: any = await $fetch("/test.json");
  var res = true;
  //   if (json.notes > 100000) {
  //     res = confirm(
  //       "10万ノーツ以上の譜面を開こうとしています\n続行するとブラウザがクラッシュする可能性があります"
  //     );
  //   }

  //   if (res) {

  thumbnailHeight = Math.max(window.innerHeight * 0.05, 25);
  headerHeight = 50; /* WORKAROUND */

  // if (stage == null) {
  // if (renderer != null) {
  //     renderer.destroy(true); // GPU メモリリーク対策
  // }
  // renderer = PIXI.autoDetectRenderer({width:window.innerHeight, height:window.innerHeight - headerHeight, backgroundColor:schemes.default.backgroundFill})
  // renderer.roundPixels = true;
  // renderer.clearBeforeRender = (schemes.default.backgroundFill != 0x000000);
  // renderer.preserveDrawingBuffer = true;

  // }

  // }
  renderer = PIXI.autoDetectRenderer({
    width: window.innerHeight*15,
    // width: window.innerHeight,
    height: window.innerHeight - headerHeight,
    backgroundColor: schemes.default.backgroundFill,
  });

  var initStage = false;
  if (stage == null) {
    initStage = true;
    stage = new PIXI.Container();
  }
  var posXinit = leftMargin;
  var posYinit = renderer.height - thumbnailHeight - bottomMargin;
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
  //     stage.hitArea = new PIXI.Rectangle(0, 0, stage.width, stage.height);
  //     stage.position.x = 0;
  //     stage.position.y = 0;

  // thumbnail = Thumbnail();

  // thumbnail.position.x = 0;
  // thumbnail.position.y = posYinit + bottomMargin;
  base = new PIXI.Container();
  base.addChild(stage);
  renderer.render(base);
  // base.addChild(thumbnail);

  // const app = new PIXI.Application({
  //   background: "#1099bb",
  //   resizeTo: window,
  // });
  // pixiContainer.value.appendChild(app.view);
  pixiContainer.value.appendChild(renderer.view);
});

// 小節オブジェクト
const Measure = (param: any) => {
  var lineWidth = 1;
  var container = new PIXI.Container();
  var g = new PIXI.Graphics();
  container.addChild(g);

  var cHeight = param.length * param.scaleH * param.exratio;
  var cWidth = measureGridSize[7] * param.scaleW;
  var gHeight = param.length * param.scaleH * param.exratio;
  var gWidth = measureGridSize[7] * param.scaleW;

  //   console.log(cHeight, cWidth, gHeight, gWidth);

  //   g.lineStyle(2, 0xFFFFFF, 1);
  //     g.beginFill(0xAA4F08);
  //     g.drawRect(530, 50, 140, 100);
  //     g.endFill();

  // console.log(container.innerHeight)
  //   // コンテナサイズを決定
  //   container.innerHeight = g.innerHeight =
  //     param.length * param.scaleH * param.exratio;
  //   container.innerWidth = g.innerWidth =
  //     measureGridSize[param.keys] * param.scaleW;

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
  //   // パラメータをセット
  //   g.logicalLength = param.length;
  //   g.unitLength = param.unit;
  //   g.index = param.index;
  //   g.score = param.score;
  //   g.lnmap = param.lnmap;
  //   g.keys = param.keys;
  //   g.gridX = param.scaleW;
  //   g.gridY = g.innerHeight / g.logicalLength;
  //   g.side = param.side;
  //   g.pattern = param.pattern;

  //   // 外枠描画メソッド
  //   g.drawOuterBound = function () {
  g.lineStyle(lineWidth, schemes.default.outerBound, 1);
  g.moveTo(-lineWidth, 0);
  g.lineTo(gWidth + lineWidth, 0);
  g.lineTo(gWidth + lineWidth, gHeight - lineWidth);
  g.lineTo(-lineWidth, gHeight - lineWidth);
  g.lineTo(-lineWidth, 0);
  //   };

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
    g.lineStyle(0, null, 1);
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
                lnColor = lnBlue
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
                            idx * gGridX - (idx == 0 ? lineWidth : 0) + lnRatio * gGridX / 2,
                            gHeight - (gGridY * lnEnd) - lineWidth + (lnEnd == gLogicalLength ? noteLineWidth : 0) ,
                            2 * gGridX - (idx == 0 ? 0 : lineWidth) - lnRatio * gGridX,
                            gGridY * (lnEnd - lnBegin) + (lnBegin == 0 ? lineWidth : 0) - lineWidth - (lnEnd == gLogicalLength ? noteLineWidth : 0) 
                        );
                        g.endFill();
                    }
                });
            }
            [['D' + key.charAt(1), mineRed, mineRed], [key, color, colorBlueLine]].forEach(function (q) {
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
    ch.forEach(function (key) {
      if (key in gScore) {
        gScore[key].forEach(function (pos: number[]) {
          g.lineStyle(lineH, colorLine, 1);
          g.moveTo(-1, g.height - gGridY * pos[0] - lineH);
          g.lineTo(
            gGridX * measureLeftLaneSize[7],
            gHeight - gGridY * pos[0] - lineH
          );

          // if (gKeys == 10 || gKeys == 14) {
          //     // for DP
          //     g.moveTo(gGridX * (measureGridSize[7] - measureLeftLaneSize[7]), gHeight - gGridY * pos[0] - lineH);
          //     g.lineTo(gGridX * measureGridSize[7], g.Height - gGridY * pos[0] - lineH);
          // }
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
  //   };

  //   // ノート境界線描画メソッド
  //   g.drawNoteLines = function () {
  //     switch (g.keys) {
  //       case 7:
  //         g.drawNoteLinesSP(g.keys);
  //         break;
  //       default:
  //         break;
  //     }
  //   };
  //   // ノート境界線SP
  //   g.drawNoteLinesSP = function (keys) {
  //     // ノート境界線を描画
  //     // SC:5, KEY:2, LABEL:2
  //     var grid = g.gridX;
  //     var color = schemes.default.laneLine;
  //     var idx = g.side == 1 ? 5 : 2 * keys + 5;
  //     // SC
  //     g.lineStyle(lineWidth, color, 1);
  //     g.moveTo(grid * idx, 0);
  //     g.lineTo(grid * idx, g.innerHeight - lineWidth);
  //     // KEY
  //     if (g.side == 2) idx = 0;
  //     for (var i = 0; i < keys; i++) {
  //       idx += 2;
  //       g.moveTo(grid * idx, 0);
  //       g.lineTo(grid * idx, g.innerHeight - lineWidth);
  //     }
  //     // LABEL
  //     idx = 2 * keys + 5;
  //     color = schemes.default.labelFill;
  //     g.beginFill(color);
  //     g.lineStyle(0, null, 1);
  //     g.moveTo(grid * idx, 0);
  //     g.lineTo(grid * idx, g.innerHeight - lineWidth);
  //     g.lineTo(grid * (4 + idx), g.innerHeight - lineWidth);
  //     g.lineTo(grid * (4 + idx), 0);
  //     g.endFill();
  //     if (g.logicalLength >= g.unitLength / 4 / param.scaleH) {
  //       idx += 2;
  //       var fontSetting = "bold " + grid * 2 + "px Arial";
  //       var labelText = new PIXI.Text(g.index, {
  //         font: fontSetting,
  //         fill: schemes.default.labelText,
  //       });
  //       labelText.anchor.x = 0.5;
  //       labelText.anchor.y = 0.5;
  //       labelText.x = grid * idx;
  //       labelText.y = g.innerHeight / 2;
  //       container.addChild(labelText);
  //     }
  //   };
  //   // ノート描画メソッド
  //   g.drawNotes = function () {
  //     switch (g.keys) {
  //       case 7:
  //         g.drawNotesSP(g.keys);
  //         break;
  //       default:
  //         break;
  //     }
  //   };

  //   // ノートSP
  //   g.drawNotesSP = function (keys) {
  //     // レーン入れ替え
  //     var keych = keyCh[keys];
  //     if (g.pattern != null && g.pattern.length == keys) {
  //       var temp = keych;
  //       keych = [];
  //       for (var i = 0; i < keys; i++) {
  //         keych.push(temp[g.pattern[i]]);
  //       }
  //     }

  //     // ノート描画
  //     var noteThickness = 4;
  //     var blue = schemes.default.noteBlueFill;
  //     var white = schemes.default.noteWhiteFill; // 0x8b8b8b
  //     var red = schemes.default.noteRedFill;
  //     var blueLine = schemes.default.noteBlueLine;
  //     var whiteLine = schemes.default.noteWhiteLine;
  //     var redLine = schemes.default.noteRedLine;
  //     var lnWhite = schemes.default.lnoteWhiteFill;
  //     var lnBlue = schemes.default.lnoteBlueFill;
  //     var lnRed = schemes.default.lnoteRedFill;
  //     var lnWhiteLine = schemes.default.lnoteWhiteLine;
  //     var lnBlueLine = schemes.default.lnoteBlueLine;
  //     var lnRedLine = schemes.default.lnoteRedLine;
  //     var mineRed = schemes.default.mineRedFill;
  //     var mineRedLine = schemes.default.mineRedLine;
  //     var lnRatio = schemes.default.lnWidthRatio;

  //     // KEY
  //     var idx = g.side == 1 ? 5 : 0;
  //     var color = blue;
  //     var colorLine = blueLine;
  //     var lnColor = lnBlue;
  //     var lnColorLine = lnBlueLine;
  //     keych.forEach(function (key) {
  //       if (color == blue) {
  //         color = white;
  //         colorLine = whiteLine;
  //       } else {
  //         color = blue;
  //         colorLine = blueLine;
  //       }
  //       if (lnColor == lnBlue) {
  //         lnColor = lnWhite;
  //         lnColorLine = lnWhiteLine;
  //       } else {
  //         lnColor = lnBlue;
  //         lnColorLine = lnBlueLine;
  //       }

  //       if (key in g.lnmap) {
  //         g.lnmap[key].forEach(function (area) {
  //           if (area[0][0] <= g.index && area[1][0] >= g.index) {
  //             var lnBegin = 0;
  //             var lnEnd = g.logicalLength;
  //             if (area[0][0] == g.index) {
  //               lnBegin = area[0][1];
  //             }
  //             if (area[1][0] == g.index) {
  //               lnEnd = area[1][1];
  //             }
  //             var noteLineWidth = lnColorLine != null ? 1 : 0;
  //             var noteLineAlpha = lnColorLine != null ? 1 : 0;
  //             g.beginFill(lnColor);
  //             g.lineStyle(noteLineWidth, lnColorLine, noteLineAlpha);
  //             g.drawRect(
  //               idx * g.gridX -
  //                 (idx == 0 ? lineWidth : 0) +
  //                 (lnRatio * g.gridX) / 2,
  //               g.innerHeight -
  //                 g.gridY * lnEnd -
  //                 lineWidth +
  //                 (lnEnd == g.logicalLength ? noteLineWidth : 0),
  //               2 * g.gridX - (idx == 0 ? 0 : lineWidth) - lnRatio * g.gridX,
  //               g.gridY * (lnEnd - lnBegin) +
  //                 (lnBegin == 0 ? lineWidth : 0) -
  //                 lineWidth -
  //                 (lnEnd == g.logicalLength ? noteLineWidth : 0)
  //             );
  //             g.endFill();
  //           }
  //         });
  //       }
  //       [
  //         ["D" + key.charAt(1), mineRed, mineRed],
  //         [key, color, colorLine],
  //       ].forEach(function (q) {
  //         var _key = q[0];
  //         var _color = q[1];
  //         var _colorLine = q[2];
  //         if (_key in g.score) {
  //           g.score[_key].forEach(function (pos) {
  //             var noteLineWidth = _colorLine != null ? 1 : 0;
  //             var noteLineAlpha = _colorLine != null ? 1 : 0;
  //             g.beginFill(_color);
  //             g.lineStyle(noteLineWidth, _colorLine, noteLineAlpha);
  //             g.drawRect(
  //               idx * g.gridX - (idx == 0 ? lineWidth : 0),
  //               g.innerHeight - (g.gridY * pos[0] + noteThickness) - lineWidth,
  //               2 * g.gridX - (idx == 0 ? 0 : lineWidth) + noteLineWidth,
  //               noteThickness
  //             );
  //             g.endFill();
  //           });
  //         }
  //       });
  //       idx += 2;
  //     });
  //   };
  //   // BPM描画メソッド
  //   g.drawBPM = function () {
  //     var colorLine = schemes.default.bpmLine;
  //     var colorText = schemes.default.bpmText;
  //     var colorStroke = schemes.default.bpmTextStroke;
  //     var lineH = schemes.default.bpmLineH;
  //     // BPM, exBPM
  //     var ch = ["03", "08"];
  //     ch.forEach(function (key) {
  //       if (key in g.score) {
  //         g.score[key].forEach(function (pos) {
  //           g.lineStyle(lineH, colorLine, 1);
  //           g.moveTo(-1, g.innerHeight - g.gridY * pos[0] - lineH);
  //           g.lineTo(
  //             g.gridX * measureLeftLaneSize[g.keys],
  //             g.innerHeight - g.gridY * pos[0] - lineH
  //           );

  //           if (g.keys == 10 || g.keys == 14) {
  //             // for DP
  //             g.moveTo(
  //               g.gridX * (measureGridSize[g.keys] - measureLeftLaneSize[g.keys]),
  //               g.innerHeight - g.gridY * pos[0] - lineH
  //             );
  //             g.lineTo(
  //               g.gridX * measureGridSize[g.keys],
  //               g.innerHeight - g.gridY * pos[0] - lineH
  //             );
  //           }
  //           if (colorText != null) {
  //             var fontSetting = "bold " + g.gridX * 1.5 + "px Arial";
  //             var labelText = new PIXI.Text(Math.round(pos[1] * 10) / 10, {
  //               font: fontSetting,
  //               fill: colorText,
  //               stroke: colorStroke,
  //               strokeThickness: colorStroke != null ? 2 : 0,
  //             });
  //             labelText.anchor.x = 0.5;
  //             labelText.anchor.y = 0.5;
  //             labelText.x = g.gridX * (measureLeftLaneSize[g.keys] + 2);
  //             labelText.y = g.innerHeight - g.gridY * pos[0] - lineWidth;
  //             container.addChild(labelText);
  //           }
  //         });
  //       }
  //     });
  //   };

  //   // STOP描画メソッド
  //   g.drawStop = function () {
  //     var colorLine = schemes.default.stopLine;
  //     var colorText = schemes.default.stopText;
  //     var colorStroke = schemes.default.stopTextStroke;
  //     var lineH = schemes.default.bpmLineH;
  //     // STOP
  //     var ch = ["09"];
  //     ch.forEach(function (key) {
  //       if (key in g.score) {
  //         g.score[key].forEach(function (pos) {
  //           g.lineStyle(lineH, colorLine, 1);
  //           g.moveTo(-1, g.innerHeight - g.gridY * pos[0] - lineH);
  //           g.lineTo(
  //             g.gridX * measureLeftLaneSize[g.keys],
  //             g.innerHeight - g.gridY * pos[0] - lineH
  //           );

  //           if (g.keys == 10 || g.keys == 14) {
  //             // for DP
  //             g.moveTo(
  //               g.gridX * (measureGridSize[g.keys] - measureLeftLaneSize[g.keys]),
  //               g.innerHeight - g.gridY * pos[0] - lineH
  //             );
  //             g.lineTo(
  //               g.gridX * measureGridSize[g.keys],
  //               g.innerHeight - g.gridY * pos[0] - lineH
  //             );
  //           }

  //           if (colorText != null) {
  //             var fontSetting = "bold " + g.gridX * 1.75 + "px Arial";
  //             var labelText = new PIXI.Text(
  //               /*Math.round(pos[1] * 10 / 48) / 10*/ "S",
  //               {
  //                 font: fontSetting,
  //                 fill: colorText,
  //                 stroke: colorStroke,
  //                 strokeThickness: colorStroke != null ? 2 : 0,
  //               }
  //             );
  //             labelText.anchor.x = 0.5;
  //             labelText.anchor.y = 0.5;
  //             labelText.x = g.gridX * (measureLeftLaneSize[g.keys] + 2);
  //             labelText.y = g.innerHeight - g.gridY * pos[0] - lineWidth;
  //             container.addChild(labelText);
  //           }
  //         });
  //       }
  //     });
  //   };

  //   g.drawMeasureLines();

  return container;
};

// function start(tempParam:string){

// }

// onUnmounted(() => {
//   app.destroy();
// });
</script>

<style scoped></style>
