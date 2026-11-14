<script setup lang="ts">
import { computed } from "vue";
import { getPeriods } from "../api/periods";
import { useResource } from "../composables/resource";
import { periodValue } from "../store/period";
const { data, error, refresh } = useResource((signal) => getPeriods(signal));
const years = computed(() => [...new Set(data.value?.map((p) => p.startYear))]);
</script>
<template>
  <div>
    <select v-model="periodValue" aria-label="Период">
      <option value="">Все периоды</option>
      <option v-for="p in data" :key="p.id" :value="`p:${p.id}`">
        {{ p.title }}{{ p.isFeedbackOpen ? " (сбор открыт)" : "" }}
      </option>
      <optgroup v-if="years.length" label="Учебный год целиком">
        <option v-for="y in years" :key="y" :value="`y:${y}`">
          {{ y }}/{{ y + 1 }} учебный год
        </option>
      </optgroup></select
    ><button v-if="error" class="text-link" @click="refresh">
      Повторить загрузку периодов
    </button>
  </div>
</template>
