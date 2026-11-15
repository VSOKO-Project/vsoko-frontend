<script setup lang="ts">
import { computed } from 'vue';
import type { DashboardSemesterDto } from '../types';
const props = defineProps<{ items: DashboardSemesterDto[] }>();
const width = computed(() => Math.max(320, 112 + (props.items.length - 1) * 110));
const minimumWidth = computed(() => props.items.length > 2 ? `${width.value}px` : "0");
const x = (index: number) => props.items.length === 1 ? width.value / 2 : 56 + index * (width.value - 112) / (props.items.length - 1);
const y = (grade: number) => 196 - (grade - 1) * 39;
const format = (grade: number) => grade.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const segments = computed(() => props.items.flatMap((item, i) => {
  const next = props.items[i + 1];
  return item.averageGrade !== null && next?.averageGrade != null ? [{ x1: x(i), y1: y(item.averageGrade), x2: x(i + 1), y2: y(next.averageGrade) }] : [];
}));
</script>
<template>
  <div class="grade-trend-scroll">
    <svg :viewBox="`0 0 ${width} 265`" :style="{ minWidth: minimumWidth }" class="grade-trend" role="img" aria-label="Динамика средней оценки дисциплин по семестрам, шкала от 1 до 5">
      <g v-for="tick in [1,2,3,4,5]" :key="tick"><line x1="48" :x2="width - 24" :y1="y(tick)" :y2="y(tick)" class="chart-grid" /><text x="36" :y="y(tick) + 4" text-anchor="end" class="chart-tick">{{ tick }}</text></g>
      <line v-for="(segment, i) in segments" :key="i" v-bind="segment" class="grade-trend-line" />
      <g v-for="(item, i) in items" :key="item.periodId">
        <circle v-if="item.averageGrade !== null" :cx="x(i)" :cy="y(item.averageGrade)" r="5" class="grade-trend-point" tabindex="0" :aria-label="`${item.title}: ${format(item.averageGrade)} из 5, дисциплин с оценками: ${item.disciplineCount}`"><title>{{ item.title }}: {{ format(item.averageGrade) }} / 5 · {{ item.disciplineCount }} дисциплин с оценками</title></circle>
        <text :x="x(i)" :y="item.averageGrade === null ? 185 : y(item.averageGrade) - 12" text-anchor="middle" class="chart-value">{{ item.averageGrade === null ? '—' : format(item.averageGrade) }}</text>
        <text :x="x(i)" y="228" text-anchor="middle" class="chart-tick"><tspan :x="x(i)">{{ item.title.split(', ')[0] }}</tspan><tspan :x="x(i)" dy="18">{{ item.title.split(', ')[1]?.replace(' семестр', '') }}</tspan></text>
      </g>
    </svg>
  </div>
</template>
<style scoped>
.grade-trend-scroll { overflow-x: auto; }
.grade-trend { display: block; width: 100%; max-height: 300px; }
.grade-trend .chart-tick { font-size: 13px; }
.grade-trend .chart-value { font-size: 14px; }
.grade-trend-line { stroke: var(--color-primary); stroke-width: 3; }
.grade-trend-point { fill: var(--color-primary); stroke: var(--color-surface); stroke-width: 2; }
.grade-trend-point:focus { outline: 2px solid var(--color-primary); outline-offset: 3px; }
</style>
