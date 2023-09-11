export const schemes = {
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
    mineRedFill: 0xff0000,
    mineRedLine: 0xff0000,
    lnWidthRatio: 0,
    bpmLineH: 1,
    previewLine: 0xffff00,
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
    previewLine: 0xffff00,
  },
};

// 定数
export const measureGridSize = {
  7: 23,
};

export const measureLeftLaneSize = {
  7: measureGridSize[7] - 4,
};

export const keyCh = {
  7: ["11", "12", "13", "14", "15", "18", "19"],
};

export const rightMargin = 35;
export const bottomMargin = 10;
export const leftMargin = 0;
export const headerHeight = 50;
