<template>
  <div class="relative w-full h-full flex flex-col overflow-hidden bg-zinc-950">
    <!-- PIXI rendering mount container -->
    <div ref="pixiContainer" class="flex-grow w-full relative overflow-hidden bg-zinc-950"></div>

    <!-- Settings Sidebar Panel -->
    <Sidebar
      v-if="showPanel"
      class="absolute bg-zinc-900 border-l border-zinc-800 top-0 right-0 px-6 w-64 h-full flex flex-col text-white space-y-4 overflow-y-auto z-20 shadow-2xl transition-all duration-300"
      :header-data="chartData.header"
      :is-playing="isPlaying"
      v-model:volume-level="volumeLevel"
      @close="emit('update:showPanel', false)"
      @random="emit('random', $event)"
      @toggle-ohm-mode="emit('toggleOhmMode', $event)"
      @toggle-no-ln="emit('toggleNoLN')"
      @toggle-vertical-mode="emit('toggleVerticalMode')"
      @update-scale-w="emit('updateScaleW')"
      @update-scale-h="emit('updateScaleH')"
      @update-note-height="emit('updateNoteHeight')"
      @change-difficulty="emit('changeDifficulty', $event)"
      @toggle-play="emit('togglePlay')"
      @exit="emit('exit')"
    />
  </div>
</template>

<script setup lang="ts">
import { OjnChartRenderer } from "~/utils/renderers/chart-renderer";
import { searchDeathPlayer, normalizeFailData } from "~/utils/helpers/search";

interface Props {
  chartData: ConvertedOJN;
  seekOffset: number;
  showPanel: boolean;
  isPlaying: boolean;
  volumeLevel: number;
}

const props = defineProps<Props>();
const emit = defineEmits([
  "update:showPanel",
  "update:volumeLevel",
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
  "changeDifficulty",
  "togglePlay",
  "exit"
]);

const volumeLevel = computed({
  get: () => props.volumeLevel,
  set: (val) => emit("update:volumeLevel", val),
});

const route = useRoute();
const pixiContainer = ref<HTMLElement>();
const failData = ref<DeathPoint>({});

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



const loadDeathPointPlayer = async () => {
  const server = Array.isArray(route.query.server) ? route.query.server[0] : route.query.server;
  const requestedId = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  const playerName = Array.isArray(route.query.player) ? route.query.player[0] : route.query.player;

  if (!server || !requestedId || !playerName || String(server).toLowerCase() !== "dmjam") {
    failData.value = {};
    return;
  }

  try {
    const payload = await $fetch(`/api/dmjam/fail/${requestedId}`);
    failData.value = normalizeFailData(payload);
  } catch (error) {
    console.error("Failed to load DMJam fail data:", error);
    failData.value = {};
  }
};

const deathPointPlayer = computed(() => {
  const playerName = Array.isArray(route.query.player) ? route.query.player[0] : route.query.player;
  if (playerName) {
    return searchDeathPlayer(failData.value, playerName);
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

  // Call resize immediately to ensure visualizer canvas height matches 
  // container clientHeight, preventing offset/cut-off at the bottom.
  chartRenderer.value.resize();
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

let resizeObserver: ResizeObserver | null = null;

watch(
  () => [route.query.server, route.query.id, route.query.player],
  () => {
    void loadDeathPointPlayer();
  },
  { immediate: true }
);

onMounted(() => {
  if (pixiContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      chartRenderer.value?.resize();
    });
    resizeObserver.observe(pixiContainer.value);
  }
  nextTick(() => {
    triggerNoteRender();
  });
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chartRenderer.value) {
    chartRenderer.value.destroy();
    chartRenderer.value = null;
  }
});
</script>

<style scoped>
:deep(canvas) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>
