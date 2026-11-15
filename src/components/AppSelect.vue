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
const menuOpen = ref(false);
const root = ref<HTMLElement>();
const value = computed(() => props.modelValue || empty);
// Keep the trigger text independent of menu items, which remount on close.
const selectedLabel = computed(() =>
  props.options.find((option) => option.value === props.modelValue)?.label ?? props.label,
);
const target = computed(() => root.value?.closest("dialog") || document.body);
function closeMenu(event: KeyboardEvent) {
  // Escape closes the popup before the native dialog underneath it.
  event.preventDefault();
  menuOpen.value = false;
}
function update(next: unknown) {
  emit("update:modelValue", next === empty ? "" : String(next ?? ""));
}
</script>
<template>
  <div ref="root" class="app-select">
    <SelectRoot
      v-model:open="menuOpen"
      :model-value="value"
      :disabled="disabled"
      @update:model-value="update"
    >
      <SelectTrigger class="select-trigger" :aria-label="label"
        ><SelectValue :placeholder="label">{{ selectedLabel }}</SelectValue><svg
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
          @escape-key-down="closeMenu"
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

<style scoped>
.app-select {
  min-width: 0;
}
.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  cursor: pointer;
  text-align: left;
}
.select-trigger > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.select-trigger > svg {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}
.select-trigger:hover {
  border-color: color-mix(
    in srgb,
    var(--color-text-secondary) 60%,
    var(--color-border)
  );
}
.select-trigger[data-state="open"] {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--color-primary) 12%, transparent);
}
.select-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<!-- Reka renders popup content through a portal without this component's scope ID. -->
<style>
.select-content {
  z-index: 500;
  min-width: var(--reka-select-trigger-width);
  max-width: min(460px, calc(100vw - 24px));
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: 0 8px 28px #1018281c;
  color: var(--color-text);
  overflow: hidden;
}
.select-viewport {
  padding: 4px;
  max-height: min(280px, var(--reka-select-content-available-height));
  overflow: auto;
}
.select-option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 34px;
  padding: 8px 10px;
  border-radius: 5px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  user-select: none;
  outline: none;
}
.select-option[data-highlighted] {
  background: var(--color-bg);
}
.select-option[data-state="checked"] {
  color: var(--color-primary);
  background: var(--color-bg-secondary);
  font-weight: 500;
}
.select-option[data-disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
.select-check {
  display: flex;
  flex-shrink: 0;
}
</style>
