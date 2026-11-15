<script setup lang="ts">
import { computed } from "vue";
import type { DashboardSemesterDto } from '../types';
const props = defineProps<{ items: DashboardSemesterDto[] }>();
const width = computed(() => Math.max(320, 88 + props.items.length * 104));
const minimumWidth = computed(() => props.items.length > 2 ? `${width.value}px` : "0");
const column = () => (width.value - 88) / Math.max(1, props.items.length);
const x = (i: number) => 56 + (i + .5) * column();
const y = (percent: number) => 190 - percent * 1.4;
const number = (value: number) => value.toLocaleString('ru-RU');
</script>
<template>
  <div class="coverage-scroll">
    <svg :viewBox="`0 0 ${width} 290`" :style="{ minWidth: minimumWidth }" class="coverage-chart" role="img" aria-label="Заполнение отзывов по семестрам: оставлено из возможных, шкала от 0 до 100 процентов">
      <g v-for="tick in [0,50,100]" :key="tick"><line x1="48" :x2="width - 24" :y1="y(tick)" :y2="y(tick)" class="chart-grid" /><text x="36" :y="y(tick)+4" text-anchor="end" class="chart-tick">{{ tick }}%</text></g>
      <g v-for="(item,i) in items" :key="item.periodId">
        <template v-if="item.coverage.possibleCount > 0">
          <rect :x="x(i)-22" y="50" width="44" height="140" rx="3" class="coverage-track" />
          <rect :x="x(i)-22" :y="y(item.coverage.completionPercent || 0)" width="44" :height="(item.coverage.completionPercent || 0)*1.4" rx="3" class="chart-column" />
        </template>
        <rect :x="x(i)-28" y="38" width="56" height="158" fill="transparent" tabindex="0" :aria-label="`${item.title}: ${number(item.coverage.submittedCount)} из ${number(item.coverage.possibleCount)} возможных отзывов${item.coverage.completionPercent !== null ? `, ${number(item.coverage.completionPercent)}%` : ''}`"><title>{{ item.title }}: {{ number(item.coverage.submittedCount) }} / {{ number(item.coverage.possibleCount) }}{{ item.coverage.completionPercent !== null ? ` · ${number(item.coverage.completionPercent)}%` : ' · нет нагрузки' }}</title></rect>
        <text :x="x(i)" y="35" text-anchor="middle" class="chart-value">{{ item.coverage.completionPercent === null ? '—' : `${number(item.coverage.completionPercent)}%` }}</text>
        <text :x="x(i)" y="215" text-anchor="middle" class="chart-value">{{ number(item.coverage.submittedCount) }} / {{ number(item.coverage.possibleCount) }}</text>
        <text :x="x(i)" y="247" text-anchor="middle" class="chart-tick"><tspan :x="x(i)">{{ item.title.split(', ')[0] }}</tspan><tspan :x="x(i)" dy="18">{{ item.title.split(', ')[1]?.replace(' семестр','') }}</tspan></text>
      </g>
    </svg>
  </div>
</template>
<style scoped>
.coverage-scroll { overflow-x: auto; }
.coverage-chart { width: 100%; max-height: 300px; display: block; }
.coverage-track { fill: var(--color-primary); opacity: .12; }
.coverage-chart .chart-tick { font-size: 13px; }
.coverage-chart .chart-value { font-size: 14px; }
</style>
