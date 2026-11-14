<script setup lang="ts">
import { computed, ref } from "vue";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from "reka-ui";
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
const props = defineProps<{
  modelValue: string;
  options: SelectOption[];
  label: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const empty = "__vsoko_empty__";
const root = ref<HTMLElement>();
const value = computed(() => props.modelValue || empty);
const target = computed(() => root.value?.closest("dialog") || document.body);
function update(next: unknown) {
  emit("update:modelValue", next === empty ? "" : String(next ?? ""));
}
</script>
<template>
  <div ref="root" class="app-select">
    <SelectRoot
      :model-value="value"
      :disabled="disabled"
      @update:model-value="update"
    >
      <SelectTrigger class="select-trigger" :aria-label="label"
        ><SelectValue :placeholder="label" /><svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          /></svg
      ></SelectTrigger>
      <SelectPortal :to="target"
        ><SelectContent
          class="select-content"
          position="popper"
          :side-offset="5"
          :collision-padding="12"
          ><SelectViewport class="select-viewport"
            ><SelectItem
              v-for="option in options"
              :key="option.value"
              class="select-option"
              :value="option.value || empty"
              :disabled="option.disabled"
              ><SelectItemText>{{ option.label }}</SelectItemText
              ><SelectItemIndicator class="select-check"
                ><svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    d="m3 8 3 3 7-7"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg></SelectItemIndicator></SelectItem></SelectViewport></SelectContent
      ></SelectPortal>
    </SelectRoot>
  </div>
</template>
