<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{
  label: string;
  items: { label: string; value: number }[];
}>();
const maximum = computed(() =>
  Math.max(1, ...props.items.map((item) => item.value)),
);
const ticks = computed(() => [
  ...new Set([0, Math.ceil(maximum.value / 2), maximum.value]),
]);
const width = computed(() => Math.max(320, 88 + props.items.length * 80));
const column = computed(() => (width.value - 88) / Math.max(1, props.items.length));
const x = (index: number) => 56 + index * column.value + column.value / 2;
const y = (value: number) => 196 - (value / maximum.value) * 156;
</script>
<template>
  <svg
    :viewBox="`0 0 ${width} 250`"
    class="column-chart"
    role="img"
    :aria-label="label"
  >
    <g v-for="tick in ticks" :key="tick">
      <line x1="48" :x2="width - 24" :y1="y(tick)" :y2="y(tick)" class="chart-grid" />
      <text x="36" :y="y(tick) + 4" text-anchor="end" class="chart-tick">
        {{ tick }}
      </text>
    </g>
    <g v-for="(item, index) in items" :key="item.label">
      <rect
        :x="x(index) - Math.min(48, column * 0.55) / 2"
        :y="y(item.value)"
        :width="Math.min(48, column * 0.55)"
        :height="Math.max(2, 196 - y(item.value))"
        rx="3"
        class="chart-column"
        tabindex="0"
        :aria-label="`${item.label}: ${item.value}`"
      >
        <title>{{ item.label }}: {{ item.value }}</title>
      </rect>
      <text
        :x="x(index)"
        :y="y(item.value) - 10"
        text-anchor="middle"
        class="chart-value"
      >
        {{ item.value }}
      </text>
      <text :x="x(index)" y="224" text-anchor="middle" class="chart-tick">
        <tspan :x="x(index)">
          {{
            item.label.includes(" ")
              ? item.label.slice(0, item.label.lastIndexOf(" "))
              : item.label
          }}
        </tspan>
        <tspan v-if="item.label.includes(' ')" :x="x(index)" dy="20">
          {{ item.label.slice(item.label.lastIndexOf(" ") + 1) }}
        </tspan>
      </text>
    </g>
  </svg>
</template>
