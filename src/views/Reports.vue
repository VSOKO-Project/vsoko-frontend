<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { generateReport } from "../api/report";
import { periodParams, periodValue } from "../store/period";
import { useAction } from "../composables/resource";
import { saveBlob } from "../utils/download";
import PeriodSelect from "../components/PeriodSelect.vue";
const action = useAction();
const url = ref("");
function clear() {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = "";
}
watch(periodValue, clear);
onUnmounted(clear);
async function generate() {
  const period = periodValue.value;
  await action.run(async () => {
    const blob = await generateReport(periodParams.value);
    saveBlob(blob, "VSOKO-report.pdf");
    clear();
    if (period === periodValue.value) url.value = URL.createObjectURL(blob);
  }, "Отчёт готов. Скачивание началось.");
}
</script>
<template>
  <div class="page-header">
    <span class="eyebrow">РЕЗУЛЬТАТЫ ДЛЯ ОБСУЖДЕНИЯ</span>
    <h1 class="page-title">Отчёты и данные</h1>
    <p class="page-subtitle">
      Оценки качества образования за выбранный период в одном документе.
    </p>
  </div>
  <div class="report-grid">
    <section class="card stack">
      <span class="eyebrow">НОВЫЙ ОТЧЁТ</span>
      <h2>Итоги обратной связи</h2>
      <p class="muted">
        Выберите семестр или учебный год. Отчёт будет сформирован по данным
        системы в PDF.
      </p>
      <div class="field">Период<PeriodSelect /></div>
      <button
        class="btn btn--primary"
        :disabled="action.pending.value"
        @click="generate"
      >
        {{ action.pending.value ? "Формируем отчёт…" : "Сформировать отчёт" }} ↓
      </button>
      <p v-if="action.error.value" role="alert" class="error-text">
        {{ action.error.value }}
      </p>
      <p v-if="action.success.value" role="status" class="muted">
        {{ action.success.value }}
      </p>
      <a v-if="url" class="text-link" :href="url" download="VSOKO-report.pdf"
        >Скачать повторно</a
      >
    </section>
    <aside class="report-aside">
      <span class="intro-symbol">▧</span>
      <h2>Данные — начало диалога</h2>
      <p class="muted">
        Используйте отчёты для обсуждения результатов и планирования изменений.
        Учитывайте контекст занятий и комментарии студентов.
      </p>
      <RouterLink to="/dashboard" class="text-link"
        >К обзору результатов ↗</RouterLink
      >
    </aside>
  </div>
</template>
