<script setup lang="ts">
import { useId } from "vue";
withDefaults(
  defineProps<{ modelValue: number; label: string; readonly?: boolean }>(),
  { readonly: false },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const id = useId();
const descriptions = ["Совсем не устраивает", "Скорее не устраивает", "Нейтрально", "Скорее устраивает", "Полностью устраивает"];
</script>
<template>
  <span
    v-if="readonly"
    class="grade-value"
    :aria-label="`${label}: ${modelValue} из 5`"
    >{{ modelValue.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) }}
    <small>/ 5</small></span
  >
  <div v-else class="student-rating">
  <div class="star-rating" role="radiogroup" :aria-label="label">
    <label
      v-for="n in 5"
      :key="n"
      class="star-rating__star"
      :class="{ 'star-rating__star--active': modelValue === n }"
      ><input
        :name="id"
        type="radio"
        class="rating-input"
        :value="n"
        :checked="modelValue === n"
        :aria-label="`${n} из 5`"
        @change="emit('update:modelValue', n)"
      /><span aria-hidden="true">{{ n }}</span></label
    >
  </div>
  <small class="muted rating-description">{{ modelValue ? descriptions[modelValue - 1] : "1 — совсем не устраивает · 5 — полностью устраивает" }}</small>
  </div>
</template>
