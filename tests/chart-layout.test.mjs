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
const { Renderer, keys, colors } = vm.runInContext(`${constants}\n${renderer}\n({ Renderer: OjnChartRenderer, keys: keyCh[7], colors: schemes.default })`, context);

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
