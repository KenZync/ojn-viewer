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
var colorScheme = "default";

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
    7: ['11', '12', '13', '14', '15', '18', '19'],
};
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
        bpmLineH: 1
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
        bpmLineH: 2
    }
};



// 小節オブジェクト
function Measure(param) {
    var lineWidth = 1;
    var container = new PIXI.Container();
    var g = new PIXI.Graphics();
    container.addChild(g);

    // コンテナサイズを決定
    container.innerHeight = g.innerHeight = param.length * param.scaleH * param.exratio;
    container.innerWidth = g.innerWidth = measureGridSize[param.keys] * param.scaleW;

    // パラメータをセット
    g.logicalLength = param.length;
    g.unitLength = param.unit;
    g.index = param.index;
    g.score = param.score;
    g.lnmap = param.lnmap;
    g.keys = param.keys;
    g.gridX = param.scaleW;
    g.gridY = g.innerHeight / g.logicalLength;
    g.side = param.side;
    g.pattern = param.pattern;


    // 外枠描画メソッド
    g.drawOuterBound = function () {
        g.lineStyle(lineWidth, schemes[colorScheme].outerBound, 1);
        g.moveTo(-lineWidth, 0);
        g.lineTo(g.innerWidth + lineWidth, 0);
        g.lineTo(g.innerWidth + lineWidth, g.innerHeight - lineWidth);
        g.lineTo(-lineWidth, g.innerHeight - lineWidth);
        g.lineTo(-lineWidth, 0);
    };

    // 小節線描画メソッド
    g.drawMeasureLines = function () {
        var grid = g.innerHeight / g.logicalLength;
        for (var i = 1; i * g.unitLength / 16 < g.logicalLength; i++) {
            var color = schemes[colorScheme].sixteenthLine; //  16分音符
            if (i % 4 == 0) {
                color = schemes[colorScheme].quarterLine;
            } // 4分音符
            g.lineStyle(lineWidth, color, 1);
            g.moveTo(-1, g.innerHeight - grid * i * g.unitLength / 16 - lineWidth);
            g.lineTo(g.innerWidth, g.innerHeight - grid * i * g.unitLength / 16 - lineWidth);
        }
    };

    // ノート境界線描画メソッド
    g.drawNoteLines = function () {
        switch (g.keys) {
        case 7:
            g.drawNoteLinesSP(g.keys);
            break;
        default:
            break;
        }
    };
    // ノート境界線SP
    g.drawNoteLinesSP = function (keys) {
        // ノート境界線を描画
        // SC:5, KEY:2, LABEL:2
        var grid = g.gridX;
        var color = schemes[colorScheme].laneLine;
        var idx = g.side == 1 ? 5 : 2 * keys + 5;
        // SC
        g.lineStyle(lineWidth, color, 1);
        g.moveTo(grid * idx, 0);
        g.lineTo(grid * idx, g.innerHeight - lineWidth);
        // KEY
        if (g.side == 2) idx = 0;
        for (var i = 0; i < keys; i++) {
            idx += 2;
            g.moveTo(grid * idx, 0);
            g.lineTo(grid * idx, g.innerHeight - lineWidth);
        }
        // LABEL
        idx = 2 * keys + 5;
        color = schemes[colorScheme].labelFill;
        g.beginFill(color);
        g.lineStyle(0, null, 1);
        g.moveTo(grid * idx, 0);
        g.lineTo(grid * idx, g.innerHeight - lineWidth);
        g.lineTo(grid * (4 + idx), g.innerHeight - lineWidth);
        g.lineTo(grid * (4 + idx), 0);
        g.endFill();
        if (g.logicalLength >= g.unitLength / 4 / param.scaleH) {
            idx += 2;
            var fontSetting = 'bold ' + grid * 2 + 'px Arial';
            var labelText = new PIXI.Text(g.index, {
                font: fontSetting,
                fill: schemes[colorScheme].labelText
            });
            labelText.anchor.x = 0.5;
            labelText.anchor.y = 0.5;
            labelText.x = grid * idx;
            labelText.y = g.innerHeight / 2;
            container.addChild(labelText);
        }
    };
    // ノート描画メソッド
    g.drawNotes = function () {
        switch (g.keys) {
        case 7:
            g.drawNotesSP(g.keys);
            break;
        default:
            break;
        }
    };
    // ノートSP
    g.drawNotesSP = function (keys) {
        // レーン入れ替え
        var keych = keyCh[keys];
        if (g.pattern != null && g.pattern.length == keys) {
            var temp = keych;
            keych = [];
            for (var i = 0; i < keys; i++) {
                keych.push(temp[g.pattern[i]]);
            }
        }

        // ノート描画
        var noteThickness = 4;
        var blue = schemes[colorScheme].noteBlueFill;
        var white = schemes[colorScheme].noteWhiteFill; // 0x8b8b8b
        var red = schemes[colorScheme].noteRedFill;
        var blueLine = schemes[colorScheme].noteBlueLine;
        var whiteLine = schemes[colorScheme].noteWhiteLine;
        var redLine = schemes[colorScheme].noteRedLine;
        var lnWhite = schemes[colorScheme].lnoteWhiteFill;
        var lnBlue = schemes[colorScheme].lnoteBlueFill;
        var lnRed = schemes[colorScheme].lnoteRedFill;
        var lnWhiteLine = schemes[colorScheme].lnoteWhiteLine;
        var lnBlueLine = schemes[colorScheme].lnoteBlueLine;
        var lnRedLine = schemes[colorScheme].lnoteRedLine;
        var mineRed = schemes[colorScheme].mineRedFill;
        var mineRedLine = schemes[colorScheme].mineRedLine;
        var lnRatio = schemes[colorScheme].lnWidthRatio;

        // KEY
        var idx = g.side == 1 ? 5 : 0;
        var color = blue;
        var colorLine = blueLine;
        var lnColor = lnBlue;
        var lnColorLine = lnBlueLine;
        keych.forEach(function (key) {
            if (color == blue) {
                color = white;
                colorLine = whiteLine;
            } else {
                color = blue;
                colorLine = blueLine;
            }
            if (lnColor == lnBlue) {
                lnColor = lnWhite;
                lnColorLine = lnWhiteLine;
            } else {
                lnColor = lnBlue
                lnColorLine = lnBlueLine;
            }

            if (key in g.lnmap) {
                g.lnmap[key].forEach(function (area) {
                    if (area[0][0] <= g.index && area[1][0] >= g.index) {
                        var lnBegin = 0;
                        var lnEnd = g.logicalLength;
                        if (area[0][0] == g.index) {
                            lnBegin = area[0][1];
                        }
                        if (area[1][0] == g.index) {
                            lnEnd = area[1][1];
                        }
                        var noteLineWidth = lnColorLine != null ? 1 : 0;
                        var noteLineAlpha = lnColorLine != null ? 1 : 0;
                        g.beginFill(lnColor);
                        g.lineStyle(noteLineWidth, lnColorLine, noteLineAlpha);
                        g.drawRect(
                            idx * g.gridX - (idx == 0 ? lineWidth : 0) + lnRatio * g.gridX / 2,
                            g.innerHeight - (g.gridY * lnEnd) - lineWidth + (lnEnd == g.logicalLength ? noteLineWidth : 0) ,
                            2 * g.gridX - (idx == 0 ? 0 : lineWidth) - lnRatio * g.gridX,
                            g.gridY * (lnEnd - lnBegin) + (lnBegin == 0 ? lineWidth : 0) - lineWidth - (lnEnd == g.logicalLength ? noteLineWidth : 0) 
                        );
                        g.endFill();
                    }
                });
            }
            [['D' + key.charAt(1), mineRed, mineRed], [key, color, colorLine]].forEach(function (q) {
                var _key = q[0];
                var _color = q[1];
                var _colorLine = q[2];
                if (_key in g.score) {
                    g.score[_key].forEach(function (pos) {
                        var noteLineWidth = _colorLine != null ? 1 : 0;
                        var noteLineAlpha = _colorLine != null ? 1 : 0;
                        g.beginFill(_color);
                        g.lineStyle(noteLineWidth, _colorLine, noteLineAlpha);
                        g.drawRect(
                            idx * g.gridX - (idx == 0 ? lineWidth : 0),
                            g.innerHeight - (g.gridY * pos[0] + noteThickness) - lineWidth,
                            2 * g.gridX - (idx == 0 ? 0 : lineWidth) + noteLineWidth,
                            noteThickness
                        );
                        g.endFill();
                    });
                }
            });
            idx += 2;
        });
    };
    // BPM描画メソッド
    g.drawBPM = function () {
        var colorLine = schemes[colorScheme].bpmLine;
        var colorText = schemes[colorScheme].bpmText;
        var colorStroke = schemes[colorScheme].bpmTextStroke;
        var lineH = schemes[colorScheme].bpmLineH;
        // BPM, exBPM
        var ch = ['03', '08'];
        ch.forEach(function (key) {
            if (key in g.score) {
                g.score[key].forEach(function (pos) {
                    g.lineStyle(lineH, colorLine, 1);
                    g.moveTo(-1, g.innerHeight - g.gridY * pos[0] - lineH);
                    g.lineTo(g.gridX * measureLeftLaneSize[g.keys], g.innerHeight - g.gridY * pos[0] - lineH);

                    if (g.keys == 10 || g.keys == 14) {
                        // for DP
                        g.moveTo(g.gridX * (measureGridSize[g.keys] - measureLeftLaneSize[g.keys]), g.innerHeight - g.gridY * pos[0] - lineH);
                        g.lineTo(g.gridX * measureGridSize[g.keys], g.innerHeight - g.gridY * pos[0] - lineH);
                    }
                    if (colorText != null) {
                        var fontSetting = 'bold ' + g.gridX * 1.5 + 'px Arial';
                        var labelText = new PIXI.Text(Math.round(pos[1] * 10) / 10, {
                            font: fontSetting,
                            fill: colorText,
                            stroke: colorStroke,
                            strokeThickness: colorStroke != null ? 2 : 0
                        });
                        labelText.anchor.x = 0.5;
                        labelText.anchor.y = 0.5;
                        labelText.x = g.gridX * (measureLeftLaneSize[g.keys] + 2);
                        labelText.y = g.innerHeight - g.gridY * pos[0] - lineWidth;
                        container.addChild(labelText);
                    }
                });
            }
        });
    };

    // STOP描画メソッド
    g.drawStop = function () {
        var colorLine = schemes[colorScheme].stopLine;
        var colorText = schemes[colorScheme].stopText;
        var colorStroke = schemes[colorScheme].stopTextStroke;
        var lineH = schemes[colorScheme].bpmLineH;
        // STOP
        var ch = ['09'];
        ch.forEach(function (key) {
            if (key in g.score) {
                g.score[key].forEach(function (pos) {
                    g.lineStyle(lineH, colorLine, 1);
                    g.moveTo(-1, g.innerHeight - g.gridY * pos[0] - lineH);
                    g.lineTo(g.gridX * measureLeftLaneSize[g.keys], g.innerHeight - g.gridY * pos[0] - lineH);

                    if (g.keys == 10 || g.keys == 14) {
                        // for DP
                        g.moveTo(g.gridX * (measureGridSize[g.keys] - measureLeftLaneSize[g.keys]), g.innerHeight - g.gridY * pos[0] - lineH);
                        g.lineTo(g.gridX * measureGridSize[g.keys], g.innerHeight - g.gridY * pos[0] - lineH);
                    }

                    if (colorText != null) {
                        var fontSetting = 'bold ' + g.gridX * 1.75 + 'px Arial';
                        var labelText = new PIXI.Text(/*Math.round(pos[1] * 10 / 48) / 10*/ "S", {
                            font: fontSetting,
                            fill: colorText,
                            stroke: colorStroke,
                            strokeThickness: colorStroke != null ? 2 : 0
                        });
                        labelText.anchor.x = 0.5;
                        labelText.anchor.y = 0.5;
                        labelText.x = g.gridX * (measureLeftLaneSize[g.keys] + 2);
                        labelText.y = g.innerHeight - g.gridY * pos[0] - lineWidth;
                        container.addChild(labelText);
                    }
                });
            }
        });
    };

    // 描画
    g.drawMeasureLines();
    g.drawNoteLines();
    g.drawOuterBound();
    g.drawBPM();
    g.drawStop();
    g.drawNotes();

    return container;
}





// サムネイルオブジェクト
function Thumbnail(param) {
    console.log("CALL THUMBNAIL")

    var lineWidth = 1;
    var container = new PIXI.Container();

    // サムネイル枠を作成
    g = new PIXI.Graphics();
    g.beginFill(0x0);
    g.lineStyle(lineWidth, 0x404040, 1);
    g.moveTo(0, 0);
    g.lineTo(renderer.width + lineWidth, 0);
    g.lineTo(renderer.width + lineWidth, thumbnailHeight);
    g.lineTo(0, thumbnailHeight);
    g.lineTo(0, 0);
    g.endFill();
    container.addChild(g);

    // サムネイル作成
    container.widthShrinkRatio = renderer.width / stage.width;
    container.heightShrinkRatio = thumbnailHeight / stage.height;
    var texture = stage.generateTexture(renderer, 2 * container.widthShrinkRatio, PIXI.SCALE_MODES.NEAREST);
    container.thumbnail = new PIXI.Sprite(texture);
    container.thumbnail.width = renderer.width /*- leftMargin - rightMargin*/ ;
    container.thumbnail.height = thumbnailHeight;
    // CANVAS ではうまくスプライトが作成できない？ので無表示に
    if (renderer.type != PIXI.RENDERER_TYPE.CANVAS) container.addChild(container.thumbnail);

    // 表示中領域の白枠を作成
    container.drawViewBox = function () {
        if (container.viewBox == null) {
            container.viewBox = new PIXI.Container();

            // グレーボックス
            var grayMask = new PIXI.Graphics();
            //左
            grayMask.beginFill(0xffffff);
            grayMask.lineStyle(lineWidth, 0x404040, 1);
            grayMask.moveTo(0, 0);
            grayMask.lineTo(-renderer.width, 0);
            grayMask.lineTo(-renderer.width, thumbnailHeight);
            grayMask.lineTo(0, thumbnailHeight);
            grayMask.lineTo(0, 0);
            // 右
            grayMask.moveTo(renderer.width * container.widthShrinkRatio, 0);
            grayMask.lineTo(renderer.width, 0);
            grayMask.lineTo(renderer.width, thumbnailHeight);
            grayMask.lineTo(renderer.width * container.widthShrinkRatio, thumbnailHeight);
            grayMask.lineTo(renderer.width * container.widthShrinkRatio, 0);
            grayMask.endFill();
            // アルファ
            grayMask.alpha = 0.4;
            // クリック可能にする
            grayMask.buttonMode = true;
            grayMask.interactive = true;
            grayMask.hitArea = new PIXI.Rectangle(-renderer.width, 0, 2 * renderer.width, thumbnailHeight + 50); // +50: はみ出しクリック可能領域
            grayMask.on('mousedown', onClick)
                .on('touchstart', onClick);

            container.viewBox.addChild(grayMask);

            var frame = new PIXI.Graphics();
            frame.lineStyle(lineWidth, 0xffffff, 1);
            //枠の描画
            frame.moveTo(lineWidth, 0);
            frame.lineTo(renderer.width * container.widthShrinkRatio, 0);
            frame.lineTo(renderer.width * container.widthShrinkRatio, thumbnailHeight);
            frame.lineTo(lineWidth, thumbnailHeight);
            frame.lineTo(lineWidth, 0);
            // ドラッグ可能にする
            frame.buttonMode = true;
            frame.interactive = true;
            frame.hitArea = new PIXI.Rectangle(lineWidth, 0, renderer.width * container.widthShrinkRatio - lineWidth, thumbnailHeight + 50); // +50: はみ出しクリック可能領域
            frame.on('mousedown', onDragStart)
                .on('touchstart', onDragStart)
                .on('mouseup', onDragEnd)
                .on('mouseupoutside', onDragEnd)
                .on('touchend', onDragEnd)
                .on('touchendoutside', onDragEnd)
                .on('mousemove', onDragMove)
                .on('touchmove', onDragMove);
            container.viewBox.addChild(frame);

            container.addChild(container.viewBox);
        }
        container.viewBox.position.x = (-leftMargin - stage.position.x) * container.widthShrinkRatio;
        container.viewBox.position.y = 0;
        console.log("DRAW VIEWBOX")
    };
    container.drawViewBox();
    return container;
}

function render() {
    // show loading spinner
    HoldOn.open();

    thumbnailHeight = Math.max(window.innerHeight * 0.05, 25);
    //     headerHeight = $("#header").height();
    headerHeight = 50; /* WORKAROUND */

    if (stage == null) {
        // update canvas
        if (renderer != null) {
            renderer.destroy(true); // GPU メモリリーク対策
        }
        renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight - headerHeight, {
            backgroundColor: schemes[colorScheme].backgroundFill
        });
        // for performance optimization
        renderer.roundPixels = true;
        renderer.clearBeforeRender = (schemes[colorScheme].backgroundFill != 0x000000);
        renderer.preserveDrawingBuffer = true;
        if (renderer.type == PIXI.RENDERER_TYPE.CANVAS) {
            // CANVAS では透明オブジェクトの描画がおかしくなるので元に戻す
            renderer.clearBeforeRender = true;
        }

        $("#content").append(renderer.view);
    } else {
        // window resize
        if (renderer != null) {
            renderer.resize(window.innerWidth, window.innerHeight - headerHeight);
        }
    }

    // コンテナに追加
    var initStage = false;
    if (stage == null) {
        initStage = true;
        stage = new PIXI.Container();

    }
    var posXinit = leftMargin;
    var posYinit = renderer.height - thumbnailHeight - bottomMargin;
    var posX = posXinit;
    var posY = posYinit;
    for (var i = 0; i < data.score.length; i++) {
        if (i >= measureFrom && i <= measureTo) {
            var measure;
            if (measures[i] == null || initStage) {
                var expLen = (data.score[i].length || data.unit) * scaleH;
                measure = Measure({
                    index: i,
                    score: data.score[i],
                    lnmap: data.lnmap,
                    scaleW: scaleW,
                    scaleH: scaleH,
                    length: data.score[i].length || data.unit,
                    side: playSide,
                    keys: 7,
                    pattern: pattern,
                    unit: data.unit,
                    exratio: expLen > posYinit ? (posYinit - 1) / expLen : 1,
                });
                measures[i] = measure;
            } else {
                measure = measures[i];
            }
            if (posY == posYinit || posY - measure.innerHeight > 0) {
                posY -= measure.innerHeight - 1;
            } else {
                posY = posYinit - measure.innerHeight - 1;
                posX += measure.innerWidth + posXinit;
            }

            //measure.children[0].cacheAsBitmap = null;
            measure.children[0].cacheAsBitmap = false;
            measure.position.x = posX;
            measure.position.y = posY;
            if (initStage) stage.addChild(measure);
            measure.children[0].cacheAsBitmap = true;
        }
    }
    // if (initStage) {
    //     stage.interactive = true;
    //     stage.buttonMode = true;
    //     stage.on('mousedown', onDragStart)
    //         .on('touchstart', onDragStart)
    //         .on('mouseup', onDragEnd)
    //         .on('mouseupoutside', onDragEnd)
    //         .on('touchend', onDragEnd)
    //         .on('touchendoutside', onDragEnd)
    //         .on('mousemove', onDragMove)
    //         .on('touchmove', onDragMove);
    // }
    // stage.hitArea = new PIXI.Rectangle(0, 0, stage.width, stage.height);
    // stage.position.x = 0;
    // stage.position.y = 0;

    // サムネイルオブジェクトを作成
    thumbnail = Thumbnail();

    thumbnail.position.x = 0;
    thumbnail.position.y = posYinit + bottomMargin;

    // 不要なレンダリングを無効化
    //for (var i = 0; i < stage.children.length; i++) {
    //    if (-stage.position.x - stage.children[i].width <= stage.children[i].position.x && stage.children[i].position.x <= -stage.position.x + 2 * renderer.width) stage.children[i].visible = true;
    //    else stage.children[i].visible = false;
    //}

    // コンテナに追加とレンダリング
    base = new PIXI.Container();
    base.addChild(stage);
    base.addChild(thumbnail);
    renderer.render(base);

    // close loading spinner
    HoldOn.close();
};

var refresh = function () {
    renderer.render(base);
};

var updateRender = function () {
    stage = null;
    render();
}

var dragStartPos = null;
var startPos = null;
var curPosition = null;

function onDragStart(event) {
    // store a reference to the data
    // the reason for this is because of multitouch
    // we want to track the movement of this particular touch
    this.data = event.data;
    this.dragging = true;
    if (this.parent.parent == thumbnail) {
        curPosition = this.data.getLocalPosition(thumbnail);
    } else {
        curPosition = this.data.getLocalPosition(this.parent);
    }
}

function onDragEnd() {
    this.dragging = false;

    // set the interaction data to null
    this.data = null;
    curPosition = null;
}

function onDragMove() {
    if (this.dragging && curPosition != null) {
        var newPosition;
        var deltaX;
        if (this.parent.parent == thumbnail) {
            newPosition = this.data.getLocalPosition(thumbnail);
            deltaX = -curPosition.x + newPosition.x;
            deltaX /= -thumbnail.widthShrinkRatio;
        } else {
            newPosition = this.data.getLocalPosition(this.parent);
            deltaX = -curPosition.x + newPosition.x;
        }
        stage.position.x = Math.min(Math.max(stage.position.x + deltaX, renderer.width - stage.width - leftMargin - rightMargin), 0);
        console.log(stage.position.x)
        thumbnail.drawViewBox();
        requestAnimationFrame(refresh);
        curPosition = newPosition;
    }
}

function onClick(event) {
    this.data = event.data;
    if (this.parent.parent == thumbnail) {
        curPosition = this.data.getLocalPosition(thumbnail);
        var posX = curPosition.x - renderer.width * thumbnail.widthShrinkRatio / 2;
        console.log(curPosition, posX)
        stage.position.x = Math.min(Math.max(-posX / thumbnail.widthShrinkRatio, renderer.width - stage.width - leftMargin - rightMargin), 0);
        thumbnail.drawViewBox();
        requestAnimationFrame(refresh);
    }
}

var resizeTimeout = false;
$(window).resize(function () {
    if (renderer == null || (window.innerHeight - headerHeight == renderer.height && window.innerWidth == renderer.width)) return;
    if (resizeTimeout !== false) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(render, 200);
});

function getUrlParam() {
    var vars = [],
        hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function setUrlParam() {
    if (urlParam == null || Object.keys(urlParam).length == 0) return;
    var pathName = location.pathname + "?";
    pathName += $.map(urlParam, function (value, key) {
        return key + "=" + value;
    }).join("&");
    history.replaceState("", "", pathName);
    // tweetボタンのリンク先を同期
    $("#tweet_button").attr("href", "http://twitter.com/share?url=" + encodeURIComponent(location.href) + "&text=" + encodeURI(data.title));
}

function validateKeyPattern(p, k) {
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
            ar = ar.filter(function (x, i, self) {
                return self.indexOf(x) === i &&
                    x >= 1 &&
                    x <= k;
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

function shuffle(arr) {
    var i, j, tmp, length;
    for (length = arr.length, i = length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

function randomizeKeyPatternStr(str, keys) {
    if (keys == 10 || keys == 14) {
        // DP
        var ar1 = str.split("");
        var ar2 = ar1.splice(keys / 2, keys / 2);
        ar1 = shuffle(ar1);
        ar2 = shuffle(ar2);
        return ar1.join("") + ar2.join("");
    } else {
        // SP
        var ar = shuffle(str.split(""));
        return ar.join("");
    }
}

function start(tempParam) {
    // URLパラメータのセット
    // - md5: hash
    if (tempParam.md5 != null) {
        urlParam.md5 = md5 = tempParam.md5;
    }
    // - w: scale width
    if (tempParam.w != null && tempParam.w >= minScaleW && tempParam.w <= maxScaleW) {
        urlParam.w = scaleW = parseInt(tempParam.w);
    }
    // - h: scale height
    if (tempParam.h != null && tempParam.h >= minScaleH && tempParam.h <= maxScaleH) {
        urlParam.h = scaleH = parseInt(2 * tempParam.h) / 2;
    }
    // - p: play side or flip
    if (tempParam.p != null && (tempParam.p == "1" || tempParam.p == "2")) {
        urlParam.p = playSide = parseInt(tempParam.p);
    }
    // - k: key nums (hidden option)
    if (tempParam.k != null && (tempParam.k == "5" || tempParam.k == "7" || tempParam.k == "9" || tempParam.k == "10" || tempParam.k == "14")) {
        urlParam.k = keys = parseInt(tempParam.k);
    } else {
        keys = data.keys;
    }
    // - c: color scheme
    if (tempParam.c != null && (tempParam.c == "mono")) {
         urlParam.c = colorScheme = "mono";
    }

    // - o: keys pattern
    // ランダム配置初期パターン
    $("#random_pattern_input").val(randomizeKeyPatternStr(keypatInit[keys], keys >= 10 ? keys / 2 : keys));
    $("#random_pattern_input_2p").val(randomizeKeyPatternStr(keypatInit[keys], keys >= 10 ? keys / 2 : keys));
    // 互換性確保
    if (tempParam.o != null && keys >= 10 && tempParam.o.length == keys) {
      tempParam.o2 = tempParam.o.substr(keys / 2);
      tempParam.o  = tempParam.o.substr(0, keys / 2);
    }
    // pattern 初期化
    const default_pattern = validateKeyPattern(0, keys >= 10 ? keys / 2 : keys)[1];
    pattern = keys >= 10 ? default_pattern.concat(default_pattern) : default_pattern;
    if (tempParam.o != null && tempParam.o > 0) {
        var result = validateKeyPattern(tempParam.o, keys >= 10 ? keys / 2 : keys);
        if (result[0]) {
            urlParam.o = result[2];
            pattern = keys >= 10 ? result[1].concat(pattern.slice(keys / 2)) : result[1];
            if (urlParam.o >= 2) {
                $("#random_pattern_input").val(result[2]);
            }
        }
    }
    if (keys >= 10 && tempParam.o2 != null && tempParam.o2 > 0) {
        var result = validateKeyPattern(tempParam.o2, keys >= 10 ? keys / 2 : keys);
        if (result[0]) {
            urlParam.o2 = result[2];
            pattern = pattern.slice(0, keys / 2).concat(result[1]);
            if (urlParam.o2 >= 2) {
                $("#random_pattern_input_2p").val(result[2]);
            }
        }
    }
     // - f
    measureFrom = 0;
    if (tempParam.f != null && tempParam.f > 0 && tempParam.f < data.score.length) {
        urlParam.f = measureFrom = parseInt(tempParam.f);
    }
    // - t
    measureTo = data.score.length - 1;
    if (tempParam.t != null && tempParam.t >= measureFrom && tempParam.t < data.score.length - 1) {
        urlParam.t = measureTo = parseInt(tempParam.t);
    }
    // - replace url
    setUrlParam();

    // render canvas
    render();

    // menu
    $("#header").css("visibility", "visible");
    $("#menu").css("visibility", "visible");
    $("#menu").mmenu({
        // options
        "slidingSubmenus": false,
        "extensions": [
            "pagedim-black",
            "theme-dark",
        ],
        "offCanvas": {
            "position": "right",
            zposition: "front",
        },
        "navbars": [{
            "position": "bottom",
            "content": [
                '<a id="tweet_button" href="http://twitter.com/share?" target="_blank"><i class="fa fa-twitter fa-lg"></i></a>',
                '<a id="save_ss_button" href="#" onclick="screenshot();"><i class="fa fa-camera-retro fa-lg"></a>',
             ]
        }],
    }, {
        // configurations
    });

    // 楽曲情報の設定
    document.title = document.title + data.title;
    $("#title").text(data.title);
    $("#artist").text(data.artist);
    $("#bpm").text(data.bpm);
    $("#totalnotes").text(data.notes);
    $("#total").text(data.total);
    $("#link_to_lr2ir").attr("href", "http://www.dream-pro.info/~lavalse/LR2IR/search.cgi?mode=ranking&bmsmd5=" + md5);
    $("#tweet_button").attr("href", "http://twitter.com/share?url=" + encodeURIComponent(location.href) + "&text=" + encodeURI(data.title));

    // menu events
    $('#menu_button').on('click', function (e) {
        e.preventDefault();
        if ($('html').hasClass('mm-opened')) {
            $("#menu").data("mmenu").close();
        } else {
            $("#menu").data("mmenu").open();
        }
    });

    // sliders
    // - scaleW
    $("#scaleW-slider").ionRangeSlider({
        type: "single",
        min: minScaleW,
        max: maxScaleW,
        from: scaleW,
        step: 1,
        onFinish: function (data) {
            console.log("onFinish");
            urlParam.w = scaleW = data.from;
            updateRender();
            setUrlParam();
        },
    });
    // - scaleH
    $("#scaleH_slider").ionRangeSlider({
        type: "single",
        min: minScaleH,
        max: maxScaleH,
        from: scaleH,
        step: 0.5,
        onFinish: function (data) {
            urlParam.h = scaleH = data.from;
            updateRender();
            setUrlParam();
        },
    });
    // - play side
    $(playSide == 2 ? "#playside_2p" : "#playside_1p")[0].checked = true;
    $("#playside_button").find("input").on("change", function (event) {
        urlParam.p = playSide = parseInt(this.value);
        updateRender();
        setUrlParam();
    });
    if (keys == 10 || keys == 14) {
        // DP 用にオプション表記を変更
        $("#playside_text").text("flip: ");
        $("#playside_text_1p").text("OFF");
        $("#playside_text_2p").text("ON");
    } else if (keys == 9) {
        // PMS にサイドはない
        $("#playside_option").css("display", "none");
    }
    // - option 1P
    if (keys >= 10) {
        $("#option_text").text("option 1P:");
    } else {
        $("#menu_box_option_2p").css("display", "none");
    }
    $("#random_pattern_input").attr('maxlength', keys >= 10 ? keys / 2 : keys); // 文字数制限=KEY数
    if (!urlParam.o || urlParam.o == 0) {
        $("#option_off")[0].checked = true;
    } else if (urlParam.o == 1) {
        $("#option_mirror")[0].checked = true;
    } else {
        $("#option_random")[0].checked = true;
    }
    $("#option_button").find("input").on("change", function (event) {
        switch (this.value) {
        case "0":
            $("#option_off")[0].checked = true;
            delete urlParam.o;
            pattern = keys >= 10 ? default_pattern.concat(pattern.slice(keys / 2)) : null;
            updateRender();
            setUrlParam();
            break;
        case "1":
            $("#option_mirror")[0].checked = true;
            urlParam.o = 1;
            pattern = keys >= 10 ? validateKeyPattern(1, keys / 2)[1].concat(pattern.slice(keys / 2)) : validateKeyPattern(1, keys)[1];
            updateRender();
            setUrlParam();
            break;
        case "2":
            $("#option_random")[0].checked = true;
            var result = validateKeyPattern($("#random_pattern_input").val(), keys >= 10 ? keys / 2 : keys);
            if (result[0]) {
                pattern = keys >= 10 ? result[1].concat(pattern.slice(keys / 2)) : result[1];
                urlParam.o = result[2];
                updateRender();
                setUrlParam();
            } else {
                $("#option_off").trigger("change");
            }
            break;
        default:
            break;
        }
    });
    $("#random_pattern_auto_button").on("click", function (event) {
        $("#random_pattern_input").val(randomizeKeyPatternStr(keypatInit[keys], keys >= 10 ? keys / 2 : keys));
        $("#option_random").trigger("change");
    });
    $("#random_pattern_input").on("change", function (event) {
        $("#option_random").trigger("change");
    });
    
    $("#random_pattern_auto_button_2p").on("click", function (event) {
        $("#random_pattern_input_2p").val(randomizeKeyPatternStr(keypatInit[keys], keys >= 10 ? keys / 2 : keys));
        $("#option_random_2p").trigger("change");
    });
    $("#random_pattern_input_2p").on("change", function (event) {
        $("#option_random_2p").trigger("change");
    });

    // - clip
    $("#clip_slider").ionRangeSlider({
        type: "double",
        min: 0,
        max: Math.max(data.score.length - 1, 0),
        from: measureFrom,
        to: measureTo,
        step: 1,
        onFinish: function (data) {
            urlParam.f = measureFrom = data.from;
            urlParam.t = measureTo = data.to;
            updateRender();
            setUrlParam();
        },
    });

    // - color scheme
    $(colorScheme == "mono" ? "#color_mono" : "#color_default")[0].checked = true;
    $("#color_button").find("input").on("change", function (event) {
        colorScheme = this.value;
        if (this.value != "default") {
            urlParam.c = colorScheme;
        } else {
            delete urlParam.c;
        }
        updateRender();
        setUrlParam();

    });

    // - open BMS
    $('#filer_input').filer({
        changeInput: '<div class="jFiler-input-dragDrop"><div class="jFiler-input-inner"><div class="jFiler-input-icon"><i class="icon-jfi-cloud-up-o"></i></div><div class="jFiler-input-text">Drag & Drop a BMS file here or click</div></div></div>',
        showThumbs: false,
        theme: "dragdropbox",
        dragDrop: {
            dragEnter: null,
            dragLeave: null,
            drop: null,
        },
        uploadFile: {
            url: "register",
            data: null,
            type: 'POST',
            enctype: 'multipart/form-data',
            beforeSend: function () {},
            success: null,
            error: null,
            statusCode: null,
            onProgress: null,
            onComplete: reloadPage,
        },
        limit: 1,
        maxSize: 10,
        extensions: ["bms", "bme", "bml", "pms"],
        captions: {
            errors: {
                filesLimit: "Only {{fi-limit}} files are allowed to be uploaded.",
                filesType: "Only BMS/BME/BML/PMS are allowed to be uploaded.",
                filesSize: "{{fi-name}} is too large! Please upload file up to {{fi-maxSize}} MB.",
                filesSizeAll: "Files you've choosed are too large! Please upload files up to {{fi-maxSize}} MB."
            }
        }
    });

    // - enable all inputs as ionCheckRadio
    $("input[type='radio'], input[type='checkbox']").ionCheckRadio();

}

function reloadPage(l, p, o, s, jqXHR, textStatus) {
    if (jqXHR != null && jqXHR.responseJSON.status == "OK") {
        urlParam = {
            md5: jqXHR.responseJSON.md5,
        };
        setUrlParam();
    } else {
        alert('BMSファイルが開けませんでした');
    }
    location.reload();
}

$(document).ready(function () {
    // show loading spinner
    HoldOn.open();

    // URLパラメータの解析
    var tempParam = getUrlParam();

    // 譜面データの取得
    $.ajax({
        url: "search?md5=" + tempParam.md5,
        type: "get",
        dataType: "json"
    }).then(function (response) {
        if (response != null && Object.keys(response).length != 0) {
            data = response;
            var res = true;
            if (data.notes > 100000) {
                res = confirm("10万ノーツ以上の譜面を開こうとしています\n続行するとブラウザがクラッシュする可能性があります")
            }
            if (res) {
                start(tempParam);
                return;
            }
        } else {
            // close loading spinner
            HoldOn.close();
            alert("未登録の譜面です\n md5: " + tempParam.md5 || '');
        }
        var backPage = false;
        $(window).on("unload beforeunload", function() {
            backPage = true;
        })
        history.back();
        setTimeout(function(){
            if (!backPage) {
                location.href = '../score/'; 
            }
        }, 1);
    });
});

// 画像保存
function screenshot() {
    renderer.render(base);
    renderer.view.toBlob(function (blob) {
        saveAs(blob, "score.png");
    });
}