<script setup lang="ts">
import { computed } from "vue";
import { getPeriods } from "../api/periods";
import { useResource } from "../composables/resource";
import { periodValue } from "../store/period";
import AppSelect from "./AppSelect.vue";
const { data, error, refresh } = useResource((signal) => getPeriods(signal));
const options = computed(() => [
  { value: "", label: "Все периоды" },
  ...(data.value || []).map((p) => ({
    value: `p:${p.id}`,
    label: `${p.title}${p.isFeedbackOpen ? " · сбор открыт" : ""}`,
  })),
  ...[...new Set(data.value?.map((p) => p.startYear))].map((y) => ({
    value: `y:${y}`,
    label: `${y}/${y + 1} учебный год`,
  })),
]);
</script>
<template>
  <div>
    <AppSelect v-model="periodValue" label="Период" :options="options" /><button
      v-if="error"
      class="text-link"
      @click="refresh"
    >
      Повторить загрузку периодов
    </button>
  </div>
</template>
