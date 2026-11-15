<script setup lang="ts">
import { computed, ref } from "vue";
const props = withDefaults(defineProps<{
  modelValue: string[];
  options: { id: string; label: string }[];
  label: string;
  searchLabel: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}>(), { searchPlaceholder: "Поиск", emptyMessage: "Ничего не найдено. Попробуйте другой запрос.", disabled: false });
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();
const search = ref("");
const filteredOptions = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("ru-RU");
  return props.options.filter(option => option.label.toLocaleLowerCase("ru-RU").includes(query));
});
function toggle(id: string, event: Event) {
  if (props.disabled) return;
  emit("update:modelValue", (event.target as HTMLInputElement).checked
    ? [...new Set([...props.modelValue, id])]
    : props.modelValue.filter(value => value !== id));
}
function reset() {
  if (!props.disabled) emit("update:modelValue", []);
}
</script>

<template>
  <details class="multi-select-picker">
    <summary class="multi-select-picker__trigger">
      <span class="multi-select-picker__title">{{ label }}</span>
      <span class="multi-select-picker__count">{{ modelValue.length ? `Выбрано: ${modelValue.length}` : 'Все' }}</span>
      <svg class="multi-select-picker__chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </summary>
    <fieldset class="multi-select-picker__body" :disabled="disabled">
      <div class="multi-select-picker__search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5" />
          <path d="m16 16 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input v-model="search" type="search" :aria-label="searchLabel" :placeholder="searchPlaceholder" />
      </div>
      <div class="multi-select-picker__list" role="group" :aria-label="label">
        <label v-for="option in filteredOptions" :key="option.id" class="multi-select-picker__option" :class="{ 'multi-select-picker__option--selected': modelValue.includes(option.id) }">
          <input type="checkbox" :value="option.id" :checked="modelValue.includes(option.id)" @change="toggle(option.id, $event)" />
          <span class="multi-select-picker__checkbox" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          <span>{{ option.label }}</span>
        </label>
        <p v-if="!filteredOptions.length" class="multi-select-picker__empty" role="status">{{ emptyMessage }}</p>
      </div>
      <div class="multi-select-picker__footer">
        <span aria-live="polite">{{ modelValue.length ? `Выбрано ${modelValue.length} из ${options.length}` : `Всего: ${options.length}` }}</span>
        <button type="button" class="multi-select-picker__reset" :disabled="disabled || !modelValue.length" @click="reset">Сбросить выбор</button>
      </div>
    </fieldset>
  </details>
</template>

<style scoped>
.multi-select-picker {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  min-width: 0;
  width: 100%;
}
.multi-select-picker__trigger {
  display: flex;
  margin: 0;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  list-style: none;
}
.multi-select-picker__trigger::-webkit-details-marker { display: none; }
.multi-select-picker__trigger:hover { background: var(--color-bg); }
.multi-select-picker__trigger:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
}
.multi-select-picker__title { flex: 1; font-weight: 500; }
.multi-select-picker__count {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 5px;
  background: var(--color-bg-secondary);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 500;
}
.multi-select-picker__chevron { flex-shrink: 0; color: var(--color-text-secondary); }
.multi-select-picker[open] .multi-select-picker__chevron { transform: rotate(180deg); }
.multi-select-picker__body { margin: 0; padding: 12px 14px 0; min-width: 0; border: 0; border-top: 1px solid var(--color-border); }
.multi-select-picker__search { position: relative; }
.multi-select-picker__search > svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}
.multi-select-picker__search input[type="search"] {
  width: 100%;
  max-width: none;
  min-width: 0;
  padding: 10px 12px 10px 38px;
}
.multi-select-picker__list { max-height: 252px; overflow-y: auto; overscroll-behavior: contain; padding: 8px 0; }
.multi-select-picker__option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.multi-select-picker__option:hover { background: var(--color-bg); }
.multi-select-picker__option--selected { background: var(--color-bg-secondary); }
.multi-select-picker__option input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.multi-select-picker__checkbox {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: 1px solid var(--color-text-muted);
  border-radius: 4px;
  background: var(--color-surface);
}
.multi-select-picker__checkbox svg { visibility: hidden; }
.multi-select-picker__option input:checked + .multi-select-picker__checkbox {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-button-text);
}
.multi-select-picker__option input:checked + .multi-select-picker__checkbox svg { visibility: visible; }
.multi-select-picker__option input:focus-visible + .multi-select-picker__checkbox { outline: 3px solid var(--color-primary); outline-offset: 3px; }
.multi-select-picker__option:has(input:disabled) { opacity: 0.5; cursor: not-allowed; }
.multi-select-picker__empty { padding: 16px 10px; text-align: center; color: var(--color-text-secondary); font-size: 13px; }
.multi-select-picker__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 8px 0;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.multi-select-picker__reset {
  min-height: 36px;
  padding: 6px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
}
.multi-select-picker__reset:hover:enabled { background: var(--color-bg-secondary); }
.multi-select-picker__reset:disabled { color: var(--color-text-muted); opacity: 0.5; }
@media (max-width: 480px) {
  .multi-select-picker__trigger { flex-wrap: wrap; gap: 8px; }
  .multi-select-picker__title { flex-basis: calc(100% - 24px); }
  .multi-select-picker__chevron { order: 1; }
  .multi-select-picker__count { order: 2; }
}
</style>
