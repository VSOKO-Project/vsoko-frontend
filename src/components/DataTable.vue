<script setup lang="ts">
withDefaults(defineProps<{
  columns: string[];
  widths?: string[];
  loading?: boolean;
  error?: string;
  empty?: boolean;
}>(), { loading: false, error: "", empty: false });
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="table-wrapper data-table" :class="{ 'data-table--wide': columns.length > 1 }" :aria-busy="loading">
    <table>
      <colgroup><col v-for="(_, index) in columns" :key="index" :style="{ width: widths?.[index] }" /></colgroup>
      <thead><tr><th v-for="(column, index) in columns" :key="index">{{ column }}</th></tr></thead>
      <tbody>
        <tr v-if="error"><td :colspan="columns.length"><div class="table-state" role="alert"><p>{{ error }}</p><button class="btn btn--secondary" @click="$emit('retry')">Повторить</button></div></td></tr>
        <tr v-else-if="loading"><td :colspan="columns.length"><div class="table-state" role="status">Загружаем данные…</div></td></tr>
        <tr v-else-if="empty"><td :colspan="columns.length"><div class="table-state">Здесь пока нет данных.</div></td></tr>
        <slot v-else />
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table { min-height: 260px; }
.data-table table { table-layout: fixed; }
.data-table--wide table { min-width: 480px; }
.data-table :deep(td) { overflow-wrap: anywhere; }
.table-state { min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--color-text-secondary); text-align: center; }
.table-state[role="status"] { animation: table-loading 0s 160ms both; }
@keyframes table-loading { from { visibility: hidden; } to { visibility: visible; } }
</style>
