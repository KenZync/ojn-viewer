import * as PIXI from "pixi.js";
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
import { searchStringInDeathPoint } from "~/utils/helpers/search";

export interface OjnRendererOptions {
  scaleW: number;
  scaleH: number;
  noteHeight: number;
  verticalMode: boolean;
  noLN: boolean;
  ohmMode: string;
  pattern: string[];
  deathPointPlayer: DeathPoint;
  onSeek: (timeMs: number) => void;
  onBeforeDrag: () => void;
  onAfterDrag: () => void;
}

export class OjnChartRenderer {
  private containerElement: HTMLElement;
  private pixiApp: PIXI.Application | null = null;
  private mainChartContainer: PIXI.Container | null = null;
  private thumbnailContainer: PIXI.Container | null = null;
  private viewBoxContainer: PIXI.Container | null = null;
  private playheadPreviewGraphics: PIXI.Graphics | null = null;
  private grayMaskGraphics: PIXI.Graphics | null = null;

  // Reactivity / values cache
  private options: OjnRendererOptions;
  private currentChartData: ConvertedOJN | null = null;

  // Render & sizing helpers
  private thumbnailHeight = 50;
  private containerWidthShrinkRatio = 1;
  private containerHeightShrinkRatio = 1;
  private lastMeasureWidth = 0;
  private lastMeasureHeight = 0;
  private playheadHeight = 0;

  // Performance: cache TextStyle objects to avoid reallocating them per measure
  private labelTextStyle: PIXI.TextStyle | null = null;
  private bpmTextStyle: PIXI.TextStyle | null = null;
  private deathTextStyle: PIXI.TextStyle | null = null;

  // Performance: cache last known measure index for playhead seek
  private lastKnownMeasureIndex = 0;

  // True chart dimensions stored at render time, used for scroll clamping.
  // We cannot use mainChartContainer.width/height because culling (renderable=false)
  // can shrink the PIXI-reported bounds.
  private totalChartWidth = 0;
  private totalChartHeight = 0;

  // Pre-cached timing data for findMeasureAndOffsetAtTime to avoid
  // calling .reduce() on every animation frame.
  private measureTimingCache: Array<{ startTime: number; endTime: number }> =
    [];

  // Last container position used for culling — skip redundant culls when nothing moved.
  private lastCullX = Infinity;
  private lastCullY = Infinity;

  // Pre-computed note color arrays (constant across all measures).
  private static readonly KEY_COLOR_CONFIG = [
    schemes.default.noteWhiteFill,
    schemes.default.noteBlueFill,
    schemes.default.noteWhiteFill,
    schemes.default.noteYellowFill,
    schemes.default.noteWhiteFill,
    schemes.default.noteBlueFill,
    schemes.default.noteWhiteFill,
  ];
  private static readonly KEY_COLOR_LN_CONFIG = [
    schemes.default.lnoteWhiteFill,
    schemes.default.lnoteBlueFill,
    schemes.default.lnoteWhiteFill,
    schemes.default.lnoteYellowFill,
    schemes.default.lnoteWhiteFill,
    schemes.default.lnoteBlueFill,
    schemes.default.lnoteWhiteFill,
  ];

  // Interactivity state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private currentDragPosition: { x: number; y: number } | null = null;
  private activeDragTarget: any = null;

  constructor(container: HTMLElement, options: OjnRendererOptions) {
    this.containerElement = container;
    this.options = options;
    this.initializePixi();
  }

  private initializePixi(): void {
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.ROUND_PIXELS = true;

    this.pixiApp = new PIXI.Application({
      backgroundColor: schemes.default.backgroundFill,
      height: window.innerHeight - headerHeight,
      width: window.innerWidth,
    });

    this.containerElement.appendChild(this.pixiApp.view as unknown as Node);
  }

  public updateOptions(newOptions: Partial<OjnRendererOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public resize(): void {
    if (!this.pixiApp) return;
    this.pixiApp.renderer.resize(
      window.innerWidth,
      window.innerHeight - headerHeight,
    );
    if (this.currentChartData) {
      this.render(this.currentChartData);
    }
  }

  public render(chartData: ConvertedOJN): void {
    if (!this.pixiApp || !chartData.ribbit) return;
    this.currentChartData = chartData;

    this.thumbnailHeight = Math.max(window.innerHeight * 0.05, 25);

    // Destroy old stages to prevent memory leak
    this.clearRenderedAssets();

    // Reset playhead seek cache
    this.lastKnownMeasureIndex = 0;

    // Pre-build shared TextStyle objects once per render pass to avoid
    // allocating a new TextStyle for every measure / BPM marker.
    const finalScaleWForStyle = chartData.ribbit
      ? this.options.verticalMode
        ? this.options.scaleW * 2
        : this.options.scaleW
      : this.options.scaleW;
    this.labelTextStyle = new PIXI.TextStyle({
      fontSize: finalScaleWForStyle * 2,
      fontWeight: "bold",
      fill: schemes.default.labelText,
      stroke: schemes.default.labelFill,
      strokeThickness: 2,
    });
    this.bpmTextStyle = new PIXI.TextStyle({
      fontSize: finalScaleWForStyle * 1.5,
      fontWeight: "bold",
      fill: schemes.default.bpmText,
      stroke: schemes.default.bpmTextStroke,
      strokeThickness: schemes.default.bpmTextStroke !== null ? 2 : 0,
    });
    this.deathTextStyle = new PIXI.TextStyle({
      fontSize: finalScaleWForStyle * 1.5,
      fontWeight: "bold",
      fill: schemes.default.mineRedLine,
      stroke: schemes.default.lnoteWhiteFill,
      strokeThickness: 2,
    });

    this.mainChartContainer = new PIXI.Container();

    const finalScaleW = this.options.verticalMode
      ? this.options.scaleW * 2
      : this.options.scaleW;
    const finalColumnWidth = measureGridSize[7] * finalScaleW;

    const initialPosX = leftMargin;
    const initialPosY =
      this.pixiApp.renderer.height -
      (this.options.verticalMode
        ? bottomMargin
        : this.thumbnailHeight + bottomMargin);

    let currentPosX = this.options.verticalMode
      ? (this.pixiApp.renderer.width - finalColumnWidth) / 2
      : -15;
    let currentPosY = initialPosY;

    this.lastMeasureWidth = 0;
    this.lastMeasureHeight = 0;

    const score = chartData.ribbit.score;
    const unit = chartData.ribbit.unit;
    const lnmap = chartData.ribbit.lnmap;

    // Pre-compute the keys mapping once for all measures
    const keysMapping: string[] = this.options.pattern
      ? this.options.pattern.map((char) => keyCh[7][parseInt(char)])
      : keyCh[7];

    // Reset timing cache and cull state
    this.measureTimingCache = [];
    this.lastCullX = Infinity;
    this.lastCullY = Infinity;

    // Track chart extents directly to avoid a getBounds() call after render
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (let measureIndex = 0; measureIndex < score.length; measureIndex++) {
      const currentScore = score[measureIndex];
      const measureLength = currentScore.length || unit;
      const expectedHeight = measureLength * this.options.scaleH;

      const stretchRatio = this.options.verticalMode
        ? 1
        : expectedHeight > initialPosY
          ? (initialPosY - 1) / expectedHeight
          : 1;

      const measureContainer = this.buildMeasureContainer(
        measureIndex,
        currentScore,
        lnmap,
        finalScaleW,
        this.options.scaleH,
        this.options.noteHeight,
        measureLength,
        keysMapping,
        unit,
        stretchRatio,
      );

      // Compute position for the current measure based on its own height/width
      if (this.options.verticalMode) {
        currentPosY -= this.lastMeasureHeight;
      } else {
        if (
          currentPosY === initialPosY ||
          currentPosY - this.lastMeasureHeight > 0
        ) {
          currentPosY -= this.lastMeasureHeight - 1;
        } else {
          currentPosY = initialPosY - this.lastMeasureHeight + 1;
          currentPosX += this.lastMeasureWidth + initialPosX;
        }
      }

      measureContainer.cacheAsBitmap = false;
      measureContainer.position.x = currentPosX;
      measureContainer.position.y = currentPosY;
      this.mainChartContainer.addChild(measureContainer);

      // Track chart extents without calling getBounds()
      minX = Math.min(minX, currentPosX);
      minY = Math.min(minY, currentPosY);
      maxX = Math.max(maxX, currentPosX + this.lastMeasureWidth);
      maxY = Math.max(maxY, currentPosY + this.lastMeasureHeight);

      // Build timing cache entry for this measure (avoids .reduce() every frame)
      const timingLines = currentScore["88"];
      if (timingLines && timingLines.length > 0) {
        const startTime = timingLines[0][4] as number;
        let duration = 0;
        for (let t = 0; t < timingLines.length; t++) {
          duration += timingLines[t][3] as number;
        }
        this.measureTimingCache[measureIndex] = {
          startTime,
          endTime: startTime + duration,
        };
      } else {
        this.measureTimingCache[measureIndex] = { startTime: -1, endTime: -1 };
      }
    }

    // Store true chart dimensions computed from layout (avoids expensive getBounds())
    this.totalChartWidth = maxX - minX;
    this.totalChartHeight = maxY - minY;

    // Set interactivity on the main container
    this.mainChartContainer.cursor = "pointer";
    this.mainChartContainer.eventMode = "static";
    this.setupContainerDragListeners(this.mainChartContainer);

    if (this.options.verticalMode) {
      this.mainChartContainer.hitArea = new PIXI.Rectangle(
        0,
        initialPosY - this.totalChartHeight,
        finalColumnWidth,
        this.totalChartHeight + bottomMargin,
      );
    } else {
      this.mainChartContainer.hitArea = new PIXI.Rectangle(
        0,
        0,
        this.totalChartWidth,
        this.totalChartHeight + 50,
      );
    }

    this.mainChartContainer.position.x = 0;
    this.mainChartContainer.position.y = 0;

    // Create Thumbnail
    this.thumbnailContainer = this.buildThumbnailContainer(
      this.pixiApp.renderer,
      this.mainChartContainer,
    );

    if (this.options.verticalMode) {
      const thumbnailWidth = 60;
      this.thumbnailContainer.position.x = Math.max(
        0,
        currentPosX - thumbnailWidth - 10,
      );
      this.thumbnailContainer.position.y = 0;
    } else {
      this.thumbnailContainer.position.x = 0;
      this.thumbnailContainer.position.y = initialPosY + bottomMargin;
    }

    // Create playhead preview
    const previewLineWidth = 1;
    this.playheadHeight = unit * this.options.scaleH;
    const playheadWidth = measureGridSize[7] * finalScaleW;
    const previewStart = 35;

    this.playheadPreviewGraphics = new PIXI.Graphics();
    this.playheadPreviewGraphics.lineStyle(
      previewLineWidth,
      schemes.default.previewLine,
      1,
    );
    this.playheadPreviewGraphics.moveTo(
      playheadWidth - 1,
      this.playheadHeight - previewLineWidth,
    );
    this.playheadPreviewGraphics.lineTo(
      previewStart - 1,
      this.playheadHeight - previewLineWidth,
    );

    this.pixiApp.stage.addChild(this.mainChartContainer);

    if (this.options.verticalMode) {
      this.playheadPreviewGraphics.x = currentPosX;
      this.playheadPreviewGraphics.y = initialPosY - this.playheadHeight;
      this.pixiApp.stage.addChild(this.playheadPreviewGraphics);
    } else {
      const firstChild = this.mainChartContainer.children[0];
      this.playheadPreviewGraphics.x = firstChild.x;
      this.playheadPreviewGraphics.y = firstChild.y;
      this.mainChartContainer.addChild(this.playheadPreviewGraphics);
    }

    this.pixiApp.stage.addChild(this.thumbnailContainer);
    this.updateDrawbox();
  }

  private clearRenderedAssets(): void {
    if (this.playheadPreviewGraphics) {
      this.playheadPreviewGraphics.destroy(true);
      this.playheadPreviewGraphics = null;
    }
    if (this.thumbnailContainer) {
      this.thumbnailContainer.destroy(true);
      this.thumbnailContainer = null;
    }
    if (this.mainChartContainer) {
      this.mainChartContainer.destroy(true);
      this.mainChartContainer = null;
    }
  }

  private setupContainerDragListeners(container: PIXI.Container): void {
    container
      .on("mousedown", this.onDragStart, this)
      .on("touchstart", this.onDragStart, this)
      .on("mouseup", this.onDragEnd, this)
      .on("mouseupoutside", this.onDragEnd, this)
      .on("touchend", this.onDragEnd, this)
      .on("touchendoutside", this.onDragEnd, this)
      .on("mousemove", this.onDragMove, this)
      .on("touchmove", this.onDragMove, this);
  }

  private buildMeasureContainer(
    measureIndex: number,
    score: RibbitScore,
    lnmap: RibbitLNMap,
    scaleW: number,
    scaleH: number,
    noteHeight: number,
    measureLength: number,
    keysMapping: string[],
    unit: number,
    stretchRatio: number,
  ): PIXI.Container {
    const lineWidth = 1;
    const lineStart = 35;
    const measureContainer = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    measureContainer.addChild(graphics);

    const calculatedHeight = measureLength * scaleH * stretchRatio;
    const calculatedWidth = measureGridSize[7] * scaleW;
    const rowHeight = calculatedHeight / measureLength;

    // Draw grid lanes
    let columnIndex = 5;
    graphics.lineStyle(lineWidth, schemes.default.laneLine, 1);
    graphics.moveTo(scaleW * columnIndex, 0);
    graphics.lineTo(scaleW * columnIndex, calculatedHeight - lineWidth);

    const totalKeys = 7;
    for (let keyIdx = 0; keyIdx < totalKeys; keyIdx++) {
      columnIndex += 2;
      graphics.moveTo(scaleW * columnIndex, 0);
      graphics.lineTo(scaleW * columnIndex, calculatedHeight - lineWidth);
    }

    // Draw beat division lines
    for (let beat = 1; (beat * unit) / 16 < measureLength; beat++) {
      const isQuarter = beat % 4 === 0;
      const lineColor = isQuarter
        ? schemes.default.quarterLine
        : schemes.default.sixteenthLine;

      graphics.lineStyle(lineWidth, lineColor, 1);
      const lineY =
        calculatedHeight - (rowHeight * beat * unit) / 16 - lineWidth;
      graphics.moveTo(lineStart - 1, lineY);
      graphics.lineTo(calculatedWidth, lineY);
    }

    // Draw label fill and text
    let labelColumnIdx = 2 * totalKeys + 5;
    graphics.beginFill(schemes.default.labelFill);
    graphics.lineStyle(0, undefined, 1);
    graphics.moveTo(scaleW * labelColumnIdx, 0);
    graphics.lineTo(scaleW * labelColumnIdx, calculatedHeight - lineWidth);
    graphics.lineTo(
      scaleW * (4 + labelColumnIdx),
      calculatedHeight - lineWidth,
    );
    graphics.lineTo(scaleW * (4 + labelColumnIdx), 0);
    graphics.endFill();

    if (measureLength >= unit / 4 / scaleH) {
      labelColumnIdx += 2;
      // Reuse the shared TextStyle object to avoid allocating a new one per measure
      const labelText = new PIXI.Text(
        measureIndex.toString(),
        this.labelTextStyle ?? {
          fontSize: scaleW * 2,
          fontWeight: "bold",
          fill: schemes.default.labelText,
          stroke: schemes.default.labelFill,
          strokeThickness: 2,
        },
      );
      labelText.anchor.set(0.5);
      labelText.x = scaleW * labelColumnIdx;
      labelText.y = calculatedHeight / 2;
      measureContainer.addChild(labelText);
    }

    // Draw measure border
    graphics.lineStyle(lineWidth, schemes.default.outerBound, 1);
    graphics.moveTo(lineStart - 1, 0);
    graphics.lineTo(calculatedWidth + lineWidth, 0);
    graphics.lineTo(calculatedWidth + lineWidth, calculatedHeight - lineWidth);
    graphics.lineTo(lineStart - 1, calculatedHeight - lineWidth);
    graphics.lineTo(lineStart - 1, 0);

    // Use pre-computed static color arrays (avoids per-measure array allocation)
    const keyColorConfig = OjnChartRenderer.KEY_COLOR_CONFIG;
    const keyColorLNConfig = OjnChartRenderer.KEY_COLOR_LN_CONFIG;

    // keysMapping is now passed in pre-computed — no need to rebuild it here
    let currentDrawXIndex = 5;
    let keyIterationIndex = 0;

    keysMapping.forEach((keyName) => {
      // 1. Draw Long Notes (LN)
      if (keyName in lnmap) {
        lnmap[keyName].forEach((area) => {
          if (area[0][0] <= measureIndex && area[1][0] >= measureIndex) {
            let lnBegin = 0;
            let lnEnd = measureLength;

            if (area[0][0] === measureIndex) {
              lnBegin = Number(area[0][1]);
              if (this.options.noLN) {
                graphics.beginFill(keyColorLNConfig[keyIterationIndex]);
                graphics.lineStyle(0, 0, 0);
                graphics.drawRect(
                  currentDrawXIndex * scaleW -
                    (currentDrawXIndex === 0 ? lineWidth : 0) +
                    (schemes.default.lnWidthRatio * scaleW) / 2,
                  calculatedHeight -
                    rowHeight * lnBegin -
                    noteHeight -
                    lineWidth,
                  2 * scaleW -
                    (currentDrawXIndex === 0 ? 0 : lineWidth) -
                    schemes.default.lnWidthRatio * scaleW,
                  noteHeight,
                );
                graphics.endFill();
              }
            }
            if (area[1][0] === measureIndex) {
              lnEnd = Number(area[1][1]);
            }

            if (!this.options.noLN) {
              graphics.beginFill(keyColorLNConfig[keyIterationIndex]);
              graphics.lineStyle(0, 0, 0);
              graphics.drawRect(
                currentDrawXIndex * scaleW -
                  (currentDrawXIndex === 0 ? lineWidth : 0) +
                  (schemes.default.lnWidthRatio * scaleW) / 2,
                calculatedHeight - rowHeight * lnEnd - lineWidth,
                2 * scaleW -
                  (currentDrawXIndex === 0 ? 0 : lineWidth) -
                  schemes.default.lnWidthRatio * scaleW,
                rowHeight * (lnEnd - lnBegin) +
                  (lnBegin === 0 ? lineWidth : 0) -
                  lineWidth,
              );
              graphics.endFill();
            }
          }
        });
      }

      // 2. Draw Normal Hit Notes
      if (keyName in score) {
        score[keyName].forEach((noteNode) => {
          const positionData = noteNode as number[];
          graphics.beginFill(keyColorConfig[keyIterationIndex]);
          graphics.lineStyle(0, 0, 0);
          graphics.drawRect(
            currentDrawXIndex * scaleW -
              (currentDrawXIndex === 0 ? lineWidth : 0),
            calculatedHeight -
              (rowHeight * positionData[0] + noteHeight) -
              lineWidth,
            2 * scaleW - (currentDrawXIndex === 0 ? 0 : lineWidth),
            noteHeight,
          );
          graphics.endFill();
        });
      }

      currentDrawXIndex += 2;
      keyIterationIndex++;
    });

    this.lastMeasureWidth = calculatedWidth;
    this.lastMeasureHeight = calculatedHeight;

    // Draw BPM Markers
    const targetBpmChannels = ["03", "08", "99", "88"];
    targetBpmChannels.forEach((channelName) => {
      if (!(channelName in score)) return;
      if (this.options.ohmMode === "off" && channelName === "99") return;

      score[channelName].forEach((bpmNode) => {
        if (channelName === "88") return;
        if (
          channelName === "99" &&
          this.options.ohmMode === "you" &&
          !searchStringInDeathPoint(
            this.options.deathPointPlayer,
            bpmNode[1].toString(),
          )
        ) {
          return;
        }

        const isDeathPoint = channelName === "99";
        const lineThickness = schemes.default.bpmLineH;

        graphics.lineStyle(
          lineThickness,
          isDeathPoint ? schemes.default.mineRedLine : schemes.default.bpmLine,
          1,
        );
        const markerY =
          calculatedHeight - rowHeight * Number(bpmNode[0]) - lineThickness;
        graphics.moveTo(lineStart, markerY);
        graphics.lineTo(scaleW * measureLeftLaneSize[7], markerY);

        const textLabelValue = isDeathPoint
          ? bpmNode[1].toString()
          : (Math.round(Number(bpmNode[1]) * 10) / 10).toString();

        // Reuse the shared TextStyle objects to avoid per-marker allocations
        const bpmText = new PIXI.Text(
          textLabelValue,
          isDeathPoint
            ? (this.deathTextStyle ?? undefined)
            : (this.bpmTextStyle ?? undefined),
        );

        bpmText.anchor.set(0.5);
        bpmText.x = scaleW * (measureLeftLaneSize[7] + 2);
        bpmText.y = calculatedHeight - rowHeight * Number(bpmNode[0]) - lineWidth;
        measureContainer.addChild(bpmText);
      });
    });

    (measureContainer as any).measureHeight = calculatedHeight;
    (measureContainer as any).measureWidth = calculatedWidth;
    (measureContainer as any).measureIndex = measureIndex;
    (measureContainer as any).isMeasure = true;
    measureContainer.eventMode = "static";
    measureContainer.hitArea = new PIXI.Rectangle(
      0,
      0,
      calculatedWidth,
      calculatedHeight,
    );

    return measureContainer;
  }

  private buildThumbnailContainer(
    renderer: PIXI.IRenderer,
    stage: PIXI.Container,
  ): PIXI.Container {
    const lineWidth = 1;
    const container = new PIXI.Container();

    const thumbnailWidth = 60;
    const thumbnailHeightVal = renderer.height - bottomMargin;

    if (this.options.verticalMode) {
      this.containerHeightShrinkRatio = thumbnailHeightVal / stage.height;
      this.containerWidthShrinkRatio = thumbnailWidth / stage.width;
    } else {
      this.containerWidthShrinkRatio = renderer.width / stage.width;
      this.containerHeightShrinkRatio = this.thumbnailHeight / stage.height;
    }

    // Draw frame border
    const boundaryGraphics = new PIXI.Graphics();
    boundaryGraphics.beginFill(0x000000);
    boundaryGraphics.lineStyle(lineWidth, 0x404040, 1);
    boundaryGraphics.moveTo(0, 0);

    if (this.options.verticalMode) {
      boundaryGraphics.lineTo(thumbnailWidth, 0);
      boundaryGraphics.lineTo(thumbnailWidth, thumbnailHeightVal);
      boundaryGraphics.lineTo(0, thumbnailHeightVal);
    } else {
      boundaryGraphics.lineTo(renderer.width, 0);
      boundaryGraphics.lineTo(renderer.width, this.thumbnailHeight);
      boundaryGraphics.lineTo(0, this.thumbnailHeight);
    }
    boundaryGraphics.lineTo(0, 0);
    boundaryGraphics.endFill();
    container.addChild(boundaryGraphics);

    // Draw sprite rendering of chart stage
    const texture = renderer.generateTexture(stage, {
      resolution:
        2 *
        (this.options.verticalMode
          ? this.containerHeightShrinkRatio
          : this.containerWidthShrinkRatio),
      scaleMode: PIXI.SCALE_MODES.NEAREST,
    });

    const sprite = new PIXI.Sprite(texture);
    if (this.options.verticalMode) {
      sprite.width = thumbnailWidth;
      sprite.height = thumbnailHeightVal;
    } else {
      sprite.width = renderer.width;
      sprite.height = this.thumbnailHeight;
    }

    if (renderer.type !== PIXI.RENDERER_TYPE.CANVAS) {
      container.addChild(sprite);
    }

    this.viewBoxContainer = new PIXI.Container();

    // Setup viewport boundary overlays
    this.grayMaskGraphics = new PIXI.Graphics();
    this.grayMaskGraphics.beginFill(0xffffff);
    this.grayMaskGraphics.lineStyle(lineWidth, 0x404040, 1);

    if (this.options.verticalMode) {
      // Above viewport box
      this.grayMaskGraphics.moveTo(0, 0);
      this.grayMaskGraphics.lineTo(thumbnailWidth, 0);
      this.grayMaskGraphics.lineTo(thumbnailWidth, -thumbnailHeightVal);
      this.grayMaskGraphics.lineTo(0, -thumbnailHeightVal);
      this.grayMaskGraphics.lineTo(0, 0);

      // Below viewport box
      const viewBoxHeight = renderer.height * this.containerHeightShrinkRatio;
      this.grayMaskGraphics.moveTo(0, viewBoxHeight);
      this.grayMaskGraphics.lineTo(thumbnailWidth, viewBoxHeight);
      this.grayMaskGraphics.lineTo(thumbnailWidth, thumbnailHeightVal);
      this.grayMaskGraphics.lineTo(0, thumbnailHeightVal);
      this.grayMaskGraphics.lineTo(0, viewBoxHeight);
    } else {
      // Left of viewport
      this.grayMaskGraphics.moveTo(0, 0);
      this.grayMaskGraphics.lineTo(-renderer.width, 0);
      this.grayMaskGraphics.lineTo(-renderer.width, this.thumbnailHeight);
      this.grayMaskGraphics.lineTo(0, this.thumbnailHeight);
      this.grayMaskGraphics.lineTo(0, 0);

      // Right of viewport
      const offsetWidth = renderer.width * this.containerWidthShrinkRatio;
      this.grayMaskGraphics.moveTo(offsetWidth, 0);
      this.grayMaskGraphics.lineTo(renderer.width, 0);
      this.grayMaskGraphics.lineTo(renderer.width, this.thumbnailHeight);
      this.grayMaskGraphics.lineTo(offsetWidth, this.thumbnailHeight);
      this.grayMaskGraphics.lineTo(offsetWidth, 0);
    }
    this.grayMaskGraphics.endFill();
    this.grayMaskGraphics.alpha = 0.4;
    this.grayMaskGraphics.cursor = "pointer";
    this.grayMaskGraphics.eventMode = "static";

    if (this.options.verticalMode) {
      this.grayMaskGraphics.hitArea = new PIXI.Rectangle(
        -50,
        -thumbnailHeightVal,
        thumbnailWidth + 100,
        2 * thumbnailHeightVal + 100,
      );
    } else {
      this.grayMaskGraphics.hitArea = new PIXI.Rectangle(
        -renderer.width,
        0,
        2 * renderer.width,
        this.thumbnailHeight + 50,
      );
    }

    this.grayMaskGraphics
      .on("mousedown", this.onThumbnailClick, this)
      .on("touchstart", this.onThumbnailClick, this)
      .on("mousedown", this.onDragStart, this)
      .on("touchstart", this.onDragStart, this)
      .on("mousemove", this.onDragMove, this)
      .on("touchmove", this.onDragMove, this)
      .on("mouseup", this.onDragEnd, this)
      .on("mouseupoutside", this.onDragEnd, this)
      .on("touchend", this.onDragEnd, this)
      .on("touchendoutside", this.onDragEnd, this);

    this.viewBoxContainer.addChild(this.grayMaskGraphics);

    // Frame white line
    const outlineFrame = new PIXI.Graphics();
    outlineFrame.lineStyle(lineWidth, 0xffffff, 1);

    if (this.options.verticalMode) {
      const viewBoxHeight = renderer.height * this.containerHeightShrinkRatio;
      outlineFrame.moveTo(0, 0);
      outlineFrame.lineTo(thumbnailWidth, 0);
      outlineFrame.lineTo(thumbnailWidth, viewBoxHeight);
      outlineFrame.lineTo(0, viewBoxHeight);
      outlineFrame.lineTo(0, 0);
    } else {
      outlineFrame.moveTo(lineWidth, 0);
      outlineFrame.lineTo(renderer.width * this.containerWidthShrinkRatio, 0);
      outlineFrame.lineTo(
        renderer.width * this.containerWidthShrinkRatio,
        this.thumbnailHeight,
      );
      outlineFrame.lineTo(lineWidth, this.thumbnailHeight);
      outlineFrame.lineTo(lineWidth, 0);
    }

    outlineFrame.cursor = "pointer";
    outlineFrame.eventMode = "static";

    if (this.options.verticalMode) {
      const viewBoxHeight = renderer.height * this.containerHeightShrinkRatio;
      outlineFrame.hitArea = new PIXI.Rectangle(
        -50,
        0,
        thumbnailWidth + 100,
        viewBoxHeight,
      );
    } else {
      outlineFrame.hitArea = new PIXI.Rectangle(
        lineWidth,
        0,
        renderer.width * this.containerWidthShrinkRatio - lineWidth,
        this.thumbnailHeight + 50,
      );
    }

    outlineFrame
      .on("mousedown", this.onDragStart, this)
      .on("touchstart", this.onDragStart, this)
      .on("mouseup", this.onDragEnd, this)
      .on("mouseupoutside", this.onDragEnd, this)
      .on("touchend", this.onDragEnd, this)
      .on("touchendoutside", this.onDragEnd, this)
      .on("mousemove", this.onDragMove, this)
      .on("touchmove", this.onDragMove, this);

    this.viewBoxContainer.addChild(outlineFrame);
    container.addChild(this.viewBoxContainer);

    return container;
  }

  public resetSeekCache(): void {
    this.lastKnownMeasureIndex = 0;
  }

  public updatePlayheadPosition(timeMs: number): void {
    if (
      !this.playheadPreviewGraphics ||
      !this.mainChartContainer ||
      !this.currentChartData ||
      !this.pixiApp
    )
      return;

    const mappingDetails = this.findMeasureAndOffsetAtTime(timeMs);
    if (!mappingDetails) return;

    const { measureIndex, beatInMeasure, measureLength } = mappingDetails;

    const measureContainer = this.mainChartContainer.children[
      measureIndex
    ] as PIXI.Container;
    if (!measureContainer || measureContainer === this.playheadPreviewGraphics)
      return;

    // measureLocalY is the measure's Y in the local space of mainChartContainer.
    const measureLocalY = measureContainer.position.y;
    const measureHeight =
      (measureContainer as any).measureHeight ||
      this.currentChartData.ribbit.unit * this.options.scaleH;
    const measureWidth = (measureContainer as any).measureWidth || 0;
    const yOffset = (beatInMeasure / measureLength) * measureHeight;

    if (this.options.verticalMode) {
      if (!this.isDragging) {
        const posYinit = this.pixiApp.renderer.height - bottomMargin;
        // targetY is the local-space Y of the playhead within the chart container.
        // We want the playhead to sit at posYinit on screen, so:
        //   containerY + targetLocalY = posYinit
        //   => containerY = posYinit - targetLocalY
        const targetLocalY = measureLocalY + measureHeight - yOffset;
        const newContainerY = posYinit - targetLocalY;
        this.mainChartContainer.position.y = Math.min(
          Math.max(newContainerY, 0),
          this.totalChartHeight,
        );
        this.mainChartContainer.position.x = 0;
        this.updateDrawbox();
      }
    } else {
      const measureX = measureContainer.position.x;
      const targetY = measureLocalY + measureHeight - yOffset;

      this.playheadPreviewGraphics.x = measureX;
      this.playheadPreviewGraphics.y = targetY - this.playheadHeight;

      if (!this.isDragging) {
        const targetScrollX =
          -measureX + this.pixiApp.renderer.width / 2 - measureWidth / 2;
        this.mainChartContainer.position.x = Math.min(
          Math.max(
            targetScrollX,
            this.pixiApp.renderer.width -
              this.totalChartWidth -
              leftMargin -
              rightMargin,
          ),
          0,
        );
        this.updateDrawbox();
      }
    }
  }

  private findMeasureAndOffsetAtTime(timeMs: number) {
    if (!this.currentChartData || !this.currentChartData.ribbit.score)
      return null;

    const score = this.currentChartData.ribbit.score;
    const unit = this.currentChartData.ribbit.unit;
    const cache = this.measureTimingCache;

    // Performance: start search from the last known measure index rather than 0
    const startIdx = Math.max(0, this.lastKnownMeasureIndex - 1);

    // First, try scanning forward from the cached position
    for (let m = startIdx; m < score.length; m++) {
      const cached = cache[m];
      // Use precomputed timing bounds — no .reduce() needed
      if (!cached || cached.startTime < 0) continue;
      if (timeMs < cached.startTime || timeMs > cached.endTime) continue;

      this.lastKnownMeasureIndex = m;
      const timingLines = score[m]["88"]!;
      for (let i = 0; i < timingLines.length; i++) {
        const line = timingLines[i];
        const beatNow = line[0] as number;
        const beatNext = line[2] as number;
        const duration = line[3] as number;
        const timeCount = line[4] as number;

        if (timeMs >= timeCount && timeMs <= timeCount + duration) {
          const elapsed = timeMs - timeCount;
          const progress = duration > 0 ? elapsed / duration : 0;
          return {
            measureIndex: m,
            beatInMeasure: beatNow + progress * (beatNext - beatNow),
            measureLength: score[m].length || unit,
          };
        }
      }
    }

    // Fallback: full scan from the beginning (handles seeking backwards)
    for (let m = 0; m < startIdx; m++) {
      const cached = cache[m];
      if (!cached || cached.startTime < 0) continue;
      if (timeMs < cached.startTime || timeMs > cached.endTime) continue;

      this.lastKnownMeasureIndex = m;
      const timingLines = score[m]["88"]!;
      for (let i = 0; i < timingLines.length; i++) {
        const line = timingLines[i];
        const beatNow = line[0] as number;
        const beatNext = line[2] as number;
        const duration = line[3] as number;
        const timeCount = line[4] as number;

        if (timeMs >= timeCount && timeMs <= timeCount + duration) {
          const elapsed = timeMs - timeCount;
          const progress = duration > 0 ? elapsed / duration : 0;
          return {
            measureIndex: m,
            beatInMeasure: beatNow + progress * (beatNext - beatNow),
            measureLength: score[m].length || unit,
          };
        }
      }
    }

    const lastIdx = score.length - 1;
    const lastMeasure = score[lastIdx];
    if (lastMeasure) {
      const length = lastMeasure.length || unit;
      return {
        measureIndex: lastIdx,
        beatInMeasure: length,
        measureLength: length,
      };
    }
    return null;
  }

  private seekToY(targetY: number): void {
    if (!this.mainChartContainer || !this.currentChartData) return;

    let targetMeasureIndex = -1;
    let targetMeasure: any = null;

    const unit = this.currentChartData.ribbit.unit;
    const score = this.currentChartData.ribbit.score;

    for (let i = 0; i < this.mainChartContainer.children.length; i++) {
      const measure = this.mainChartContainer.children[i] as any;
      if (measure.measureIndex === undefined) continue;

      const measureY = measure.position.y;
      const measureHeight = measure.measureHeight || unit * this.options.scaleH;

      if (targetY >= measureY && targetY <= measureY + measureHeight) {
        targetMeasure = measure;
        targetMeasureIndex = measure.measureIndex;
        break;
      }
    }

    if (targetMeasureIndex === -1) return;

    const measureHeight =
      targetMeasure.measureHeight || unit * this.options.scaleH;
    const localY = targetY - targetMeasure.position.y;
    const measureLength = score[targetMeasureIndex].length || unit;
    const beatInMeasure =
      ((measureHeight - localY) / measureHeight) * measureLength;

    const timingLines = score[targetMeasureIndex]["88"];
    if (!timingLines || timingLines.length === 0) return;

    let targetTime = 0;
    for (let i = 0; i < timingLines.length; i++) {
      const line = timingLines[i];
      const beatNow = line[0] as number;
      const beatNext = line[2] as number;
      const duration = line[3] as number;
      const timeCount = line[4] as number;

      if (beatInMeasure >= beatNow && beatInMeasure <= beatNext) {
        const elapsed =
          ((beatInMeasure - beatNow) / (beatNext - beatNow)) * duration;
        targetTime = timeCount + elapsed;
        break;
      }
    }

    this.options.onSeek(targetTime);
  }

  private seekToMeasureClick(
    event: any,
    measureContainer: any,
    measureIndex: number,
  ): void {
    const localPos = event.getLocalPosition(measureContainer);
    const localY = localPos.y;
    const measureHeight = measureContainer.measureHeight;
    if (localY < 0 || localY > measureHeight) return;

    const score = this.currentChartData?.ribbit?.score;
    const unit = this.currentChartData?.ribbit?.unit;
    if (!score || !unit) return;

    const measureLength = score[measureIndex].length || unit;
    const beatInMeasure =
      ((measureHeight - localY) / measureHeight) * measureLength;

    const timingLines = score[measureIndex]["88"];
    if (!timingLines || timingLines.length === 0) return;

    let targetTime = 0;
    for (let i = 0; i < timingLines.length; i++) {
      const line = timingLines[i];
      const beatNow = line[0] as number;
      const beatNext = line[2] as number;
      const duration = line[3] as number;
      const timeCount = line[4] as number;

      if (beatInMeasure >= beatNow && beatInMeasure <= beatNext) {
        const elapsed =
          ((beatInMeasure - beatNow) / (beatNext - beatNow)) * duration;
        targetTime = timeCount + elapsed;
        break;
      }
    }

    this.options.onSeek(targetTime);
  }

  private updateDrawbox(): void {
    if (!this.viewBoxContainer || !this.mainChartContainer || !this.pixiApp)
      return;

    if (this.options.verticalMode) {
      const viewBoxHeight =
        this.pixiApp.renderer.height * this.containerHeightShrinkRatio;
      const thumbnailHeightVal = this.pixiApp.renderer.height - bottomMargin;
      // Use totalChartHeight instead of mainChartContainer.height (avoids PIXI bounds recalc)
      const targetY =
        (thumbnailHeightVal - viewBoxHeight) *
        (1 - this.mainChartContainer.position.y / this.totalChartHeight);
      this.viewBoxContainer.position.y = Math.min(
        Math.max(targetY, 0),
        thumbnailHeightVal - viewBoxHeight,
      );
      this.viewBoxContainer.position.x = 0;
    } else {
      this.viewBoxContainer.position.x =
        (-leftMargin - this.mainChartContainer.position.x) *
        this.containerWidthShrinkRatio;
      this.viewBoxContainer.position.y = 0;
    }

    this.cullOffscreenMeasures();
  }

  private cullOffscreenMeasures(): void {
    if (!this.mainChartContainer || !this.pixiApp) return;

    const rendererWidth = this.pixiApp.renderer.width;
    const rendererHeight = this.pixiApp.renderer.height;
    const containerX = this.mainChartContainer.position.x;
    const containerY = this.mainChartContainer.position.y;

    // Skip culling if the container hasn't moved since last cull
    if (containerX === this.lastCullX && containerY === this.lastCullY) return;
    this.lastCullX = containerX;
    this.lastCullY = containerY;

    const isVertical = this.options.verticalMode;

    for (let i = 0; i < this.mainChartContainer.children.length; i++) {
      const child = this.mainChartContainer.children[i] as any;
      if (!child || !child.isMeasure) continue;

      const measureHeight = child.measureHeight || 0;
      // Use the cached measureWidth instead of child.width (which triggers PIXI bounds calc)
      const measureWidth = child.measureWidth || 0;

      if (isVertical) {
        const globalYTop = containerY + child.position.y;
        const globalYBottom = globalYTop + measureHeight;

        // Use renderable instead of visible so PIXI still counts this child
        // in bounds calculations (visible=false would shrink container bounds).
        child.renderable =
          globalYBottom >= -150 && globalYTop <= rendererHeight + 150;
      } else {
        const globalXLeft = containerX + child.position.x;
        const globalXRight = globalXLeft + measureWidth;
        child.renderable =
          globalXRight >= -300 && globalXLeft <= rendererWidth + 300;
      }
    }
  }

  private onThumbnailClick(event: any): void {
    if (
      event.target !== this.grayMaskGraphics ||
      !this.mainChartContainer ||
      !this.pixiApp
    )
      return;

    this.currentDragPosition = event.getLocalPosition(this.thumbnailContainer);
    if (!this.currentDragPosition) return;

    if (this.options.verticalMode) {
      const thumbnailHeightVal = this.pixiApp.renderer.height - bottomMargin;
      const viewBoxHeight =
        this.pixiApp.renderer.height * this.containerHeightShrinkRatio;
      const scrollRange = thumbnailHeightVal - viewBoxHeight;
      const posY = this.currentDragPosition.y - viewBoxHeight / 2;
      const posY_clamped = Math.min(Math.max(posY, 0), scrollRange);

      let targetPositionY = 0;
      if (scrollRange > 0) {
        targetPositionY =
          this.totalChartHeight * (1 - posY_clamped / scrollRange);
      }
      this.mainChartContainer.position.y = targetPositionY;
      this.seekToY(
        this.pixiApp.renderer.height - bottomMargin - targetPositionY,
      );
    } else {
      const posX =
        this.currentDragPosition.x -
        (this.pixiApp.renderer.width * this.containerWidthShrinkRatio) / 2;
      this.mainChartContainer.position.x = Math.min(
        Math.max(
          -posX / this.containerWidthShrinkRatio,
          this.pixiApp.renderer.width -
            this.totalChartWidth -
            leftMargin -
            rightMargin,
        ),
        0,
      );
    }
    this.updateDrawbox();
  }

  private onDragStart(event: any): void {
    this.activeDragTarget = event.currentTarget;
    this.isDragging = true;

    // Trigger hook before drag
    this.options.onBeforeDrag();

    if (
      this.activeDragTarget &&
      this.activeDragTarget.parent &&
      this.activeDragTarget.parent.parent === this.thumbnailContainer
    ) {
      this.currentDragPosition = event.getLocalPosition(
        this.thumbnailContainer,
      );
    } else {
      this.currentDragPosition = event.getLocalPosition(
        this.activeDragTarget.parent,
      );
    }

    if (event && event.global) {
      this.dragStartX = event.global.x;
      this.dragStartY = event.global.y;
    }
  }

  private onDragEnd(event: any): void {
    let didClick = false;
    if (this.isDragging && event && event.global) {
      const dragEndX = event.global.x;
      const dragEndY = event.global.y;
      const dist = Math.hypot(
        dragEndX - this.dragStartX,
        dragEndY - this.dragStartY,
      );

      // Tap/click detection - record what was clicked, handle after isDragging = false
      if (dist < 5 && this.mainChartContainer) {
        let clickedTarget = event.target;
        while (
          clickedTarget &&
          clickedTarget !== this.mainChartContainer &&
          clickedTarget.parent !== this.mainChartContainer
        ) {
          clickedTarget = clickedTarget.parent;
        }
        if (clickedTarget && clickedTarget.measureIndex !== undefined) {
          didClick = true;
          // Clear drag state BEFORE seeking so updatePlayheadPosition runs unblocked
          this.isDragging = false;
          this.currentDragPosition = null;
          this.activeDragTarget = null;
          this.seekToMeasureClick(
            event,
            clickedTarget,
            clickedTarget.measureIndex,
          );
        }
      }
    }

    if (!didClick) {
      this.isDragging = false;
      this.currentDragPosition = null;
      this.activeDragTarget = null;
    }

    // Trigger hook after drag
    this.options.onAfterDrag();
  }

  private onDragMove(event: any): void {
    if (
      !this.mainChartContainer ||
      !this.isDragging ||
      !this.currentDragPosition ||
      !this.pixiApp
    )
      return;

    let localNewPos;
    if (this.options.verticalMode) {
      let deltaY = 0;
      if (this.activeDragTarget.parent.parent === this.thumbnailContainer) {
        localNewPos = event.getLocalPosition(this.thumbnailContainer);
        deltaY = -this.currentDragPosition.y + localNewPos.y;

        const thumbnailHeightVal = this.pixiApp.renderer.height - bottomMargin;
        const viewBoxHeight =
          this.pixiApp.renderer.height * this.containerHeightShrinkRatio;
        const scrollRange = thumbnailHeightVal - viewBoxHeight;

        if (scrollRange > 0) {
          deltaY *= -this.totalChartHeight / scrollRange;
        } else {
          deltaY = 0;
        }
      } else {
        localNewPos = event.getLocalPosition(this.activeDragTarget.parent);
        deltaY = -this.currentDragPosition.y + localNewPos.y;
      }

      this.mainChartContainer.position.y = Math.min(
        Math.max(this.mainChartContainer.position.y + deltaY, 0),
        this.totalChartHeight,
      );
      this.updateDrawbox();
      this.currentDragPosition = localNewPos;

      this.seekToY(
        this.pixiApp.renderer.height -
          bottomMargin -
          this.mainChartContainer.position.y,
      );
    } else {
      let deltaX = 0;
      if (this.activeDragTarget.parent.parent === this.thumbnailContainer) {
        localNewPos = event.getLocalPosition(this.thumbnailContainer);
        deltaX = -this.currentDragPosition.x + localNewPos.x;
        deltaX /= -this.containerWidthShrinkRatio;
      } else {
        localNewPos = event.getLocalPosition(this.activeDragTarget.parent);
        deltaX = -this.currentDragPosition.x + localNewPos.x;
      }

      this.mainChartContainer.position.x = Math.min(
        Math.max(
          this.mainChartContainer.position.x + deltaX,
          this.pixiApp.renderer.width -
            this.totalChartWidth -
            leftMargin -
            rightMargin,
        ),
        0,
      );
      this.updateDrawbox();
      this.currentDragPosition = localNewPos;
    }
  }

  public getScrollPosition(): number {
    return this.mainChartContainer?.position.x ?? 0;
  }

  public setScrollPosition(x: number): void {
    if (this.mainChartContainer && !this.options.verticalMode) {
      this.mainChartContainer.position.x = x;
      this.updateDrawbox();
    }
  }

  public destroy(): void {
    this.clearRenderedAssets();
    if (this.pixiApp) {
      this.pixiApp.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      });
      this.pixiApp = null;
    }
  }
}
