<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean;
  error?: string;
  empty?: boolean;
  skeleton?: 'table' | 'cards' | 'form' | 'dashboard' | 'workloads' | 'text' | 'list' | 'field' | 'options' | 'feedback' | 'criteria' | 'import';
  rows?: number;
}>(), { skeleton: 'table', rows: 3 });
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="loading-skeleton" :class="`loading-skeleton--${skeleton}`" role="status" aria-live="polite" aria-busy="true">
    <span class="sr-only">Загружаем данные</span>
    <div class="skeleton-layout" aria-hidden="true">
      <template v-if="skeleton === 'dashboard'">
        <div class="skeleton-stats">
          <div v-for="n in 4" :key="n" class="skeleton-card"><span class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-number" /></div>
        </div>
        <div class="skeleton-card skeleton-chart"><span class="skeleton-block skeleton-label" /><svg viewBox="0 0 640 180" class="skeleton-trend"><path d="M20 150 H620 M20 90 H620 M20 30 H620" class="skeleton-trend-grid" /><path d="M40 130 L150 100 L260 115 L370 65 L480 80 L600 40" class="skeleton-trend-path" /></svg></div>
        <div class="skeleton-panels">
          <div v-for="n in 2" :key="n" class="skeleton-card skeleton-chart"><span class="skeleton-block skeleton-label" /><div class="skeleton-bars"><span v-for="bar in 5" :key="bar" class="skeleton-block" :style="{ height: `${25 + ((bar * 17) % 65)}%` }" /></div></div>
          <div v-for="n in 2" :key="`result-${n}`" class="skeleton-card"><span class="skeleton-block skeleton-label" /><div v-for="row in 3" :key="row" class="skeleton-row"><span class="skeleton-block skeleton-detail" /><span class="skeleton-block skeleton-value" /></div></div>
        </div>
      </template>
      <template v-else-if="skeleton === 'workloads'">
        <div class="skeleton-card skeleton-progress"><span class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-detail" /><span class="skeleton-block skeleton-track" /></div>
        <div class="skeleton-switch"><span class="skeleton-block" /><span class="skeleton-block" /></div>
        <div class="skeleton-grid"><div v-for="n in rows" :key="n" class="skeleton-card skeleton-workload"><span class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-detail" /><span class="skeleton-block skeleton-button" /></div></div>
      </template>
      <template v-else-if="skeleton === 'feedback' || skeleton === 'criteria'">
        <div :class="skeleton === 'feedback' ? 'skeleton-card skeleton-feedback' : 'skeleton-criteria'">
          <template v-if="skeleton === 'feedback'"><span class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-detail" /></template>
          <div v-for="section in skeleton === 'feedback' ? 2 : 1" :key="section" class="skeleton-section"><span class="skeleton-block skeleton-label" /><div v-for="n in 2" :key="n" class="skeleton-criterion"><span class="skeleton-block skeleton-detail" /><div class="skeleton-rating"><span v-for="score in 5" :key="score" class="skeleton-block" /></div></div></div>
          <span class="skeleton-block skeleton-textarea" /><span class="skeleton-block skeleton-button" />
        </div>
      </template>
      <template v-else-if="skeleton === 'text'">
        <div class="skeleton-text"><span v-for="n in 5" :key="n" class="skeleton-block" /></div>
      </template>
      <template v-else-if="skeleton === 'field' || skeleton === 'form'">
        <div v-for="n in skeleton === 'field' ? 1 : rows" :key="n" class="skeleton-field"><span v-if="skeleton === 'form'" class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-input" /></div>
      </template>
      <template v-else-if="skeleton === 'options'">
        <div v-for="n in rows" :key="n" class="skeleton-option"><span class="skeleton-block skeleton-checkbox" /><span class="skeleton-block skeleton-label" /></div>
      </template>
      <template v-else-if="skeleton === 'import'">
        <span class="skeleton-block skeleton-label" /><div class="skeleton-grid"><div v-for="n in 5" :key="n" class="skeleton-card"><span class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-detail" /></div></div>
      </template>
      <template v-else-if="skeleton === 'cards'">
        <div v-for="n in rows" :key="n" class="skeleton-card skeleton-review"><span class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-detail" /><span class="skeleton-block skeleton-detail" /><span class="skeleton-block skeleton-button" /></div>
      </template>
      <div v-else class="skeleton-content">
        <div v-if="skeleton === 'table'" class="skeleton-row skeleton-table-head"><span class="skeleton-block skeleton-label" /><span class="skeleton-block skeleton-detail" /><span class="skeleton-block skeleton-value" /></div>
        <div v-for="n in rows" :key="n" class="skeleton-row"><span class="skeleton-block skeleton-label" /><span v-if="skeleton === 'table'" class="skeleton-block skeleton-detail" /><span class="skeleton-block skeleton-value" /></div>
      </div>
    </div>
  </div>
  <div v-else-if="error" class="empty-state" role="alert"><p>{{ error }}</p><button class="btn btn--primary" @click="$emit('retry')">Повторить</button></div>
  <div v-else-if="empty" class="empty-state">Здесь пока нет данных.</div>
  <slot v-else />
</template>
<style scoped>
.loading-skeleton, .skeleton-layout { width: 100%; min-width: 0; }
.skeleton-layout { display: grid; gap: 20px; }
.skeleton-block { display: block; border-radius: 5px; background: var(--color-border); animation: skeleton-pulse 1.6s ease-in-out infinite; flex-shrink: 0; }
.skeleton-label { width: 42%; height: 14px; }
.skeleton-detail { width: 65%; height: 13px; }
.skeleton-value { width: 12%; height: 13px; margin-left: auto; }
.skeleton-card, .skeleton-content { border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); min-width: 0; }
.skeleton-card { padding: 24px; display: grid; align-content: start; gap: 16px; }
.skeleton-row { display: flex; align-items: center; gap: 20px; padding: 20px; min-height: 62px; }
.skeleton-row + .skeleton-row { border-top: 1px solid var(--color-border); }
.skeleton-row .skeleton-label { width: 40%; }
.skeleton-row .skeleton-detail { width: 22%; margin-left: auto; }
.skeleton-table-head { background: var(--color-bg-secondary); border-radius: 10px 10px 0 0; min-height: 48px; }
.skeleton-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.skeleton-stats .skeleton-card { padding: 22px; }
.skeleton-stats .skeleton-label { width: 80%; }
.skeleton-number { width: 40%; height: 32px; }
.skeleton-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.skeleton-panels .skeleton-row { padding: 16px 0; }
.skeleton-chart { height: 310px; grid-template-rows: auto 1fr; }
.skeleton-trend { width: 100%; height: 100%; min-height: 0; }
.skeleton-trend-path { fill: none; stroke: var(--color-border); stroke-width: 5; }
.skeleton-trend-grid { fill: none; stroke: var(--color-border); stroke-dasharray: 3 4; }
.skeleton-bars { display: flex; align-items: end; justify-content: space-around; gap: 12px; padding-top: 24px; border-bottom: 1px solid var(--color-border); }
.skeleton-bars span { width: 12%; }
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 20px; }
.skeleton-progress { gap: 14px; }
.skeleton-track { width: 100%; height: 8px; }
.skeleton-switch { display: flex; gap: 8px; }
.skeleton-switch span { width: 140px; max-width: 45%; height: 40px; }
.skeleton-workload { min-height: 210px; display: flex; flex-direction: column; gap: 24px; }
.skeleton-workload .skeleton-label { width: 85%; height: 20px; }
.skeleton-workload .skeleton-button { width: 100%; margin-top: auto; }
.skeleton-button { width: 180px; max-width: 100%; height: 40px; }
.skeleton-review { min-height: 220px; }
.skeleton-text { display: grid; gap: 16px; padding: 8px 0; }
.skeleton-text span { width: 100%; height: 14px; }
.skeleton-text span:last-child { width: 60%; }
.loading-skeleton--import .skeleton-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.skeleton-field { display: grid; gap: 12px; }
.skeleton-input { width: 100%; height: 44px; }
.loading-skeleton--field .skeleton-input { height: 38px; }
.skeleton-option { display: flex; gap: 12px; align-items: center; }
.skeleton-checkbox { width: 18px; height: 18px; }
.skeleton-feedback { max-width: 920px; padding: 24px; gap: 24px; }
.skeleton-criteria { display: grid; gap: 24px; }
.skeleton-criteria .skeleton-section { border: 0; padding-top: 0; }
.skeleton-section { display: grid; gap: 24px; border-top: 1px solid var(--color-border); padding-top: 24px; }
.skeleton-criterion { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.skeleton-criterion .skeleton-detail { width: 45%; }
.skeleton-rating { display: flex; gap: 8px; }
.skeleton-rating span { width: 40px; height: 40px; }
.skeleton-textarea { height: 110px; width: 100%; }
@keyframes skeleton-pulse { 0%,100% { opacity: .4; } 50% { opacity: .85; } }
@media (prefers-reduced-motion: reduce) { .skeleton-block { animation: none; opacity: .6; } }
@media (max-width: 1024px) { .skeleton-panels { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .skeleton-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } .skeleton-criterion { flex-direction: column; align-items: flex-start; } .skeleton-criterion .skeleton-detail { width: 70%; } }
@media (max-width: 640px) {
  .skeleton-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .skeleton-card { padding: 20px; }
  .skeleton-row { gap: 12px; padding: 18px 16px; }
  .skeleton-grid { grid-template-columns: 1fr; }
}
</style>
