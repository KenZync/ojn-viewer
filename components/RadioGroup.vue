<template>
  <HeadlessRadioGroup
    :modelValue="modelValue"
    @update:modelValue="(value) => emit('update:modelValue', value)"
  >
    <HeadlessRadioGroupLabel class="sr-only">Plan</HeadlessRadioGroupLabel>
    <div v-for="radio in radioLists">
      <HeadlessRadioGroupOption
        v-slot="{ checked }"
        :value="radio.id"
        class="text-center py-2"
      >
        <div
          :class="checked ? 'bg-blue-600' : 'bg-zinc-700'"
          class="border border-gray-400 cursor-pointer rounded-md font-bold py-1"
        >
          {{ radio.title }}
        </div>
      </HeadlessRadioGroupOption>
    </div>
  </HeadlessRadioGroup>
</template>

<script setup lang="ts">
const props = defineProps({ modelValue: String });
const emit = defineEmits(["update:modelValue"]);

const radioLists = [
  { id: "off", title: "OFF" },
  { id: "all", title: "ALL" },
  { id: "you", title: "YOU / RIVALS" },
];
</script>

<style scoped></style>
