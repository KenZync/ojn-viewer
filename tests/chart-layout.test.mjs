import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

// Record the renderer's drawing commands without requiring a GPU or DOM.
class Container {
  children = [];
  addChild(child) { this.children.push(child); return child; }
}
class Graphics {
  commands = [];
}
for (const op of ['beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'rect']) {
  Graphics.prototype[op] = function (...args) {
    this.commands.push([op, ...args]);
    return this;
  };
}
class Text {
  anchor = { set() {} };
  constructor(options) { Object.assign(this, options); }
}
class Rectangle {
  constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
}
const constants = stripTypeScriptTypes(readFileSync(new URL('../constants/index.ts', import.meta.url), 'utf8'))
  .replaceAll('export const', 'const');
const renderer = stripTypeScriptTypes(readFileSync(new URL('../utils/renderers/chart-renderer.ts', import.meta.url), 'utf8'))
  .replace(/import[\s\S]*?from\s+"[^"]+";/g, '')
  .replace('export class OjnChartRenderer', 'class OjnChartRenderer');
const context = vm.createContext({ PIXI: { Container, Graphics, Text, Rectangle }, searchStringInDeathPoint: () => true });
const { Renderer, keys, colors, leftMargin: testLeftMargin } = vm.runInContext(`${constants}\n${renderer}\n({ Renderer: OjnChartRenderer, keys: keyCh[7], colors: schemes.default, leftMargin })`, context);

test('leftMargin is configured to 15', () => {
  assert.equal(testLeftMargin, 15);
});

test('long note starting at tick T aligns perfectly with normal note at tick T (no 1px misalignment)', () => {
  const instance = Object.create(Renderer.prototype);
  instance.options = { verticalMode: false, noLN: false, ohmMode: 'all' };
  const scaleW = 7;
  const scaleH = 2;
  const noteHeight = 4;
  const measureLength = 192;
  const score = { '11': [[48, '00']] };
  const lnmap = { '12': [[[0, 48], [0, 96]]] };

  const measure = instance.buildMeasureContainer(0, score, lnmap, scaleW, scaleH, noteHeight, measureLength, keys, 192, 1);
  const commands = measure.children[0].commands;
  const rectangles = commands.filter(c => c[0] === 'rect');

  const normalNoteRect = rectangles.find(c => c[4] === noteHeight);
  const lnRect = rectangles.find(c => c[4] !== noteHeight);

  assert.ok(normalNoteRect, 'normal note rect exists');
  assert.ok(lnRect, 'long note rect exists');

  const normalBottomY = normalNoteRect[2] + normalNoteRect[4];
  const lnBottomY = lnRect[2] + lnRect[4];

  assert.equal(lnBottomY, normalBottomY, 'bottom edge of long note must match normal note at same tick');
});

test('long note spanning across measures extends across measure boundaries to cover borders', () => {
  const instance = Object.create(Renderer.prototype);
  instance.options = { verticalMode: false, noLN: false, ohmMode: 'all' };
  const scaleW = 7;
  const scaleH = 2;
  const noteHeight = 4;
  const measureLength = 192;
  const lnmap = { '11': [[[0, 48], [1, 96]]] };

  // Measure 0: LN continues to next measure
  const measure0 = instance.buildMeasureContainer(0, {}, lnmap, scaleW, scaleH, noteHeight, measureLength, keys, 192, 1);
  const commands0 = measure0.children[0].commands;
  const lnRect0 = commands0.filter(c => c[0] === 'rect')[0];
  assert.equal(lnRect0[2], 0, 'LN top in measure 0 must stop at 0 (flush with top border, no 1px overlap into next measure)');

  // Measure 1: LN continues from previous measure
  const measure1 = instance.buildMeasureContainer(1, {}, lnmap, scaleW, scaleH, noteHeight, measureLength, keys, 192, 1);
  const commands1 = measure1.children[0].commands;
  const lnRect1 = commands1.filter(c => c[0] === 'rect')[0];
  assert.ok(lnRect1, 'LN rect exists in measure 1');
  const calculatedHeight1 = measureLength * scaleH;
  assert.equal(lnRect1[2] + lnRect1[4], calculatedHeight1, 'LN bottom in measure 1 must extend to calculatedHeight (cross and cover bottom border)');
});

for (const verticalMode of [false, true]) {
  for (const scaleW of [4, 7, 16, 30]) {
    test(`${verticalMode ? 'vertical' : 'horizontal'} at width ${scaleW}: seven lanes fill the chart from its left edge`, () => {
      const instance = Object.create(Renderer.prototype);
      instance.options = { verticalMode, noLN: false, ohmMode: 'all' };
      const score = Object.fromEntries(keys.map(key => [key, [[48, '00']]]));
      score['03'] = [[96, 120]];
      score['99'] = [[144, 'player']];
      const lnmap = Object.fromEntries(keys.map(key => [key, [[[0, 0], [0, 96]]]]));
      const measure = instance.buildMeasureContainer(0, score, lnmap, scaleW, 2, 4, 192, keys, 192, 1);
      const commands = measure.children[0].commands;
      const rectangles = commands.filter(c => c[0] === 'rect');
      const notes = rectangles.filter(c => c[4] === 4);
      assert.equal(notes.length, 7);
      assert.equal(notes[0][1], -1, 'first playable lane must start at the left border');
      assert.deepEqual(notes.map(c => c[1]), [ -1, ...[1, 2, 3, 4, 5, 6].map(i => i * 2 * scaleW) ]);
      assert.equal(rectangles.length, 14, 'all seven long notes remain visible');
      assert.equal(rectangles[0][1], -1, 'first long note starts at the left border');
      assert.equal(measure.hitArea.width, 18 * scaleW, 'hit area has only seven lanes and labels');
      assert.equal(measure.measureWidth, 18 * scaleW);
      assert.equal(measure.children[1].x, 16 * scaleW, 'measure label follows lane seven');
      assert.equal(measure.children[2].x, 16 * scaleW, 'BPM label aligns with measure label');
      assert.equal(measure.children[3].x, 16 * scaleW, 'death label aligns with measure label');
      assert.deepEqual(commands[1], ['moveTo', 0, 0], 'grid begins at zero');
      const bpmStroke = commands.findIndex(c => c[0] === 'stroke' && c[1].color === colors.bpmLine);
      assert.equal(commands[bpmStroke - 2][1], 0, 'BPM line starts at lane one');
      assert.equal(commands[bpmStroke - 1][1], 14 * scaleW, 'BPM line ends at label gutter');
    });
  }
}

test('getScrollPosition and setScrollPosition preserve coordinates in horizontal and vertical modes', async () => {
  const instance = Object.create(Renderer.prototype);
  instance.initPromise = Promise.resolve();
  instance.options = { verticalMode: false };
  instance.mainChartContainer = { position: { x: -250, y: 0 } };
  instance.updateDrawbox = () => {};
  instance.pixiApp = { renderer: { width: 1000 } };
  instance.totalChartWidth = 2000;

  const posH = instance.getScrollPosition();
  assert.equal(posH.x, -250);
  assert.equal(posH.y, 0);

  await instance.setScrollPosition({ x: -400, y: 0 });
  assert.equal(instance.mainChartContainer.position.x, -400);

  // Vertical mode
  instance.options.verticalMode = true;
  instance.totalChartHeight = 5000;
  instance.mainChartContainer.position = { x: 0, y: 1200 };

  const posV = instance.getScrollPosition();
  assert.equal(posV.x, 0);
  assert.equal(posV.y, 1200);

  await instance.setScrollPosition({ x: 0, y: 3500 });
  assert.equal(instance.mainChartContainer.position.y, 3500);
});

test('updatePlayheadPosition with moveCamera=false does not move mainChartContainer', async () => {
  const instance = Object.create(Renderer.prototype);
  instance.initPromise = Promise.resolve();
  instance.options = { verticalMode: false, scaleH: 2 };
  instance.playheadHeight = 10;
  instance.playheadPreviewGraphics = { x: 0, y: 0 };
  instance.currentChartData = { ribbit: { unit: 192, score: [{ length: 192, '88': [[0, 0, 192, 1000, 0]] }] } };
  instance.measureTimingCache = [{ startTime: 0, endTime: 1000 }];
  instance.lastKnownMeasureIndex = 0;
  instance.pixiApp = { renderer: { width: 1000, height: 800 } };
  instance.totalChartWidth = 2000;
  instance.updateDrawbox = () => {};

  const measure0 = { position: { x: 100, y: 200 }, measureHeight: 384, measureWidth: 200 };
  instance.mainChartContainer = {
    children: [measure0],
    position: { x: -350, y: 0 },
  };

  // When moveCamera is false, mainChartContainer.position.x should remain -350
  await instance.updatePlayheadPosition(500, false);
  assert.equal(instance.mainChartContainer.position.x, -350);

  // When moveCamera is true (default), mainChartContainer.position.x is updated
  await instance.updatePlayheadPosition(500, true);
  assert.notEqual(instance.mainChartContainer.position.x, -350);
});

