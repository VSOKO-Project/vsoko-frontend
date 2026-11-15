<script setup lang="ts">
import { computed } from "vue";
import { getPeriods } from "../api/periods";
import { useResource } from "../composables/resource";
import { periodValue } from "../store/period";
import LoadState from "./LoadState.vue";
import AppSelect from "./AppSelect.vue";
const emit = defineEmits<{ change: [value: string] }>();
const { data, loading, error, refresh } = useResource((signal) => getPeriods(signal), [], () => "periods");
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
  <div class="period-select">
    <LoadState skeleton="field" :loading="loading"><AppSelect v-model="periodValue" @update:model-value="emit('change', $event)" label="Период" :options="options" /></LoadState><button
      v-if="error"
      class="text-link"
      @click="refresh"
    >
      Повторить загрузку периодов
    </button>
  </div>
</template>

<style scoped>
.period-select { width: 220px; max-width: 100%; min-width: 0; }
</style>
