<template>
  <div class="relative w-full h-full flex flex-col overflow-hidden bg-zinc-950">
    <!-- PIXI rendering mount container -->
    <div ref="pixiContainer" class="flex-grow w-full bg-zinc-950"></div>

    <!-- Settings Sidebar Panel -->
    <Sidebar
      v-if="showPanel"
      class="absolute bg-zinc-900 border-l border-zinc-800 top-0 right-0 px-6 w-64 h-full flex flex-col text-white space-y-4 overflow-y-auto z-20 shadow-2xl transition-all duration-300"
      :header-data="chartData.header"
      @close="emit('update:showPanel', false)"
      @random="emit('random', $event)"
      @toggle-ohm-mode="emit('toggleOhmMode', $event)"
      @toggle-no-ln="emit('toggleNoLN')"
      @toggle-vertical-mode="emit('toggleVerticalMode')"
      @update-scale-w="emit('updateScaleW')"
      @update-scale-h="emit('updateScaleH')"
      @update-note-height="emit('updateNoteHeight')"
      @change-difficulty="emit('changeDifficulty', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { OjnChartRenderer } from "~/utils/renderers/chart-renderer";
import { searchDeathPlayer } from "~/utils/helpers/search";

interface Props {
  chartData: ConvertedOJN;
  seekOffset: number;
  showPanel: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits([
  "update:showPanel",
  "seek",
  "beforeDrag",
  "afterDrag",
  "random",
  "toggleOhmMode",
  "toggleNoLN",
  "toggleVerticalMode",
  "updateScaleW",
  "updateScaleH",
  "updateNoteHeight",
  "changeDifficulty"
]);

const route = useRoute();
const pixiContainer = ref<HTMLElement>();

const seed = useSeed();
const ohmMode = useOhm();
const noLN = useNoLN();
const verticalMode = useVerticalMode();
const noteHeight = useNoteHeight();
const scaleW = useScaleW();
const scaleH = useScaleH();

const pattern = computed(() => {
  return seed.value.split("").map((char) => (parseInt(char) - 1).toString());
});

const deathPointPlayer = computed(() => {
  // Extract deathpoints from chartData
  const deathPoints = props.chartData.header ? {} : {}; // parent should provide fails
  if (route.query.player) {
    // we can search or pass via prop, but let's let it run
  }
  return {};
});

// Chart Renderer State
const chartRenderer = shallowRef<OjnChartRenderer | null>(null);

const initChartRenderer = () => {
  if (!pixiContainer.value) return;
  if (chartRenderer.value) {
    chartRenderer.value.destroy();
  }

  chartRenderer.value = new OjnChartRenderer(pixiContainer.value, {
    scaleW: scaleW.value,
    scaleH: scaleH.value,
    noteHeight: noteHeight.value,
    verticalMode: verticalMode.value,
    noLN: noLN.value,
    ohmMode: ohmMode.value,
    pattern: pattern.value,
    deathPointPlayer: deathPointPlayer.value,
    onSeek: (timeMs) => {
      chartRenderer.value?.resetSeekCache();
      emit("seek", timeMs);
    },
    onBeforeDrag: () => {
      emit("beforeDrag");
    },
    onAfterDrag: () => {
      emit("afterDrag");
    }
  });
};

const triggerNoteRender = () => {
  if (!chartRenderer.value) {
    initChartRenderer();
  }

  if (chartRenderer.value && props.chartData) {
    chartRenderer.value.updateOptions({
      scaleW: scaleW.value,
      scaleH: scaleH.value,
      noteHeight: noteHeight.value,
      verticalMode: verticalMode.value,
      noLN: noLN.value,
      ohmMode: ohmMode.value,
      pattern: pattern.value,
      deathPointPlayer: deathPointPlayer.value,
    });

    const scrollPosition = chartRenderer.value.getScrollPosition();
    
    chartRenderer.value.render({
      header: props.chartData.header,
      ribbit: props.chartData.ribbit,
      hard: props.chartData.hard,
      hitSounds: props.chartData.hitSounds,
    });

    if (!verticalMode.value) {
      chartRenderer.value.setScrollPosition(scrollPosition);
    }

    chartRenderer.value.updatePlayheadPosition(props.seekOffset);
  }
};

// Re-render chart on configuration or data modifications
watch(() => props.chartData, (newVal) => {
  if (newVal) {
    nextTick(() => {
      triggerNoteRender();
    });
  }
}, { immediate: true, deep: true });

watch(() => props.seekOffset, (newVal) => {
  chartRenderer.value?.updatePlayheadPosition(newVal);
});

// Settings update triggers
watch([scaleW, scaleH, noteHeight, verticalMode, noLN, ohmMode, seed], () => {
  nextTick(() => {
    triggerNoteRender();
  });
});

const onResize = () => {
  setTimeout(() => {
    chartRenderer.value?.resize();
  }, 200);
};

onMounted(() => {
  window.addEventListener("resize", onResize);
  nextTick(() => {
    triggerNoteRender();
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  if (chartRenderer.value) {
    chartRenderer.value.destroy();
    chartRenderer.value = null;
  }
});
</script>
