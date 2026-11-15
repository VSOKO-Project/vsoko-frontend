<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { generateReport, getReportHistory, downloadReport, type ReportHistoryEntry } from "../api/report";
import { periodParams } from "../store/period";
import { useAction, useResource } from "../composables/resource";
import { saveBlob } from "../utils/download";
import PeriodSelect from "../components/PeriodSelect.vue";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
const action = useAction();
const downloads = useAction();
const downloadingId = ref("");
let active = true;
onUnmounted(() => { active = false; });
const page = ref(1);
const history = useResource((signal) => getReportHistory(page.value, signal), [page]);
watch(periodParams, () => { action.error.value = ""; action.success.value = ""; });
async function generate() {
  await action.run(async () => {
    const blob = await generateReport({ ...periodParams.value });
    if (!active) return;
    saveBlob(blob, "VSOKO-report.pdf");
    if (page.value === 1) await history.refresh();
    else page.value = 1;
  }, "Отчёт готов и сохранён в истории. Скачивание началось.");
}
async function download(entry: ReportHistoryEntry) {
  if (downloads.pending.value) return;
  downloadingId.value = entry.id;
  await downloads.run(async () => {
    const blob = await downloadReport(entry.id);
    if (active) saveBlob(blob, entry.fileName);
  });
  downloadingId.value = "";
}
const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });
function formatDate(value: string) { return dateFormat.format(new Date(value)); }
function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(bytes / 1024)).toLocaleString("ru-RU")} КБ`
    : `${(bytes / (1024 * 1024)).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} МБ`;
}
</script>
<template>
  <div class="page-header">
    <h1 class="page-title">Отчёты и данные</h1>
    <p class="page-subtitle">Оценки качества образования за выбранный период в одном документе.</p>
  </div>
  <div class="reports-layout">
    <section class="card stack reports-form">
      <span class="eyebrow">НОВЫЙ ОТЧЁТ</span>
      <h2>Итоги обратной связи</h2>
      <p class="muted">Выберите семестр или учебный год. Отчёт будет сформирован по данным системы в PDF и сохранён в истории.</p>
      <div class="field">Период<PeriodSelect /></div>
      <button class="btn btn--primary" :disabled="action.pending.value" @click="generate">
        {{ action.pending.value ? "Формируем отчёт…" : "Сформировать отчёт" }}
      </button>
      <p v-if="action.error.value" role="alert" class="error-text">{{ action.error.value }}</p>
      <p v-if="action.success.value" role="status" class="muted">{{ action.success.value }}</p>
    </section>
    <section class="card report-history" aria-labelledby="report-history-title">
      <div class="report-history__header">
        <div>
          <h2 id="report-history-title">История отчётов</h2>
          <p class="muted">Сформированные документы за все периоды.</p>
        </div>
        <span v-if="history.data.value" class="report-history__count">{{ history.data.value.totalCount }}</span>
      </div>
      <div v-if="action.pending.value" class="report-history__pending" role="status">
        <span class="report-history__spinner" aria-hidden="true"></span>Формируем новый отчёт…
      </div>
      <p v-if="downloads.error.value" role="alert" class="error-text report-history__error">{{ downloads.error.value }}</p>
      <LoadState :loading="history.loading.value" :error="history.error.value" skeleton="list" @retry="history.refresh">
        <ul v-if="history.data.value?.items.length" class="report-history__list">
          <li v-for="entry in history.data.value.items" :key="entry.id" class="report-history__item">
            <span class="report-history__file" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" /><path d="M14 3v5h5M8 12h8M8 16h5" /></svg>
              <span>PDF</span>
            </span>
            <div class="report-history__info">
              <p class="report-history__title">Итоги обратной связи</p>
              <p class="report-history__period">{{ entry.periodTitle }}</p>
              <p class="report-history__meta"><time :datetime="entry.createdAtUtc">{{ formatDate(entry.createdAtUtc) }}</time><span>·</span>{{ formatSize(entry.sizeBytes) }}</p>
            </div>
            <button type="button" class="btn btn--secondary btn--sm report-history__download" :disabled="downloads.pending.value" :aria-label="`Скачать отчёт: ${entry.periodTitle}, ${formatDate(entry.createdAtUtc)}`" @click="download(entry)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" /></svg>
              {{ downloadingId === entry.id ? 'Скачиваем…' : 'Скачать' }}
            </button>
          </li>
        </ul>
        <div v-else class="report-history__empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h18v14H3ZM2 3h20v4H2Z M9 11h6" /></svg>
          <p class="report-history__title">Пока нет отчётов</p>
          <p>Сформируйте первый отчёт — он появится здесь и будет доступен для повторного скачивания.</p>
        </div>
        <div v-if="(history.data.value?.totalPages || 0) > 1" class="report-history__pagination">
          <Pagination v-model:page="page" :total="history.data.value!.totalPages" />
        </div>
      </LoadState>
    </section>
  </div>
</template>

<style scoped>
.reports-layout { display: grid; grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); align-items: stretch; gap: 24px; }
.reports-layout > .card { margin: 0; }
.reports-form { min-width: 0; gap: 16px; }
.reports-form > .field { width: 100%; }
.reports-form :deep(.period-select) { width: 100%; }
.report-history { display: flex; flex-direction: column; min-width: 0; padding: 0; }
.report-history__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px; border-bottom: 1px solid var(--color-border); }
.report-history__header h2 { margin: 0 0 4px; }
.report-history__header p { font-size: 13px; }
.report-history__count { padding: 2px 9px; border-radius: 5px; background: var(--color-bg-secondary); color: var(--color-primary); font-size: 12px; }
.report-history__pending { display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: var(--color-bg-secondary); color: var(--color-primary); font-size: 13px; }
.report-history__spinner { width: 16px; height: 16px; border: 2px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: report-spin 0.8s linear infinite; }
.report-history__error { padding: 16px 20px; }
.report-history__list { list-style: none; margin: 0; padding: 0; }
.report-history__item { display: flex; align-items: center; gap: 16px; padding: 20px; }
.report-history__item + .report-history__item { border-top: 1px solid var(--color-border); }
.report-history__file { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 44px; height: 58px; flex-shrink: 0; border: 1px solid var(--color-border); border-radius: 7px; color: var(--color-primary); background: var(--color-bg); font-size: 9px; font-weight: 600; }
.report-history__info { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.report-history__title { color: var(--color-text); font-weight: 500; }
.report-history__period { margin-top: 2px; font-size: 13px; color: var(--color-text-secondary); }
.report-history__meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; color: var(--color-text-muted); font-size: 12px; }
.report-history__download { flex-shrink: 0; }
.report-history__empty { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 320px; padding: 32px; text-align: center; }
.report-history__empty > svg { color: var(--color-text-muted); margin-bottom: 4px; }
.report-history__empty > p:last-child { max-width: 340px; color: var(--color-text-secondary); font-size: 13px; }
.report-history__pagination { padding: 16px 20px; border-top: 1px solid var(--color-border); }
.report-history__pagination :deep(.pagination) { margin: 0; flex-wrap: wrap; }
@keyframes report-spin { to { transform: rotate(360deg); } }
@media (max-width: 960px) { .reports-layout { grid-template-columns: minmax(0, 1fr); gap: 16px; } }
@media (max-width: 480px) {
  .report-history__item { flex-wrap: wrap; gap: 12px; padding: 16px; }
  .report-history__download { margin-left: 56px; }
  .report-history__header { padding: 16px; }
}
@media (prefers-reduced-motion: reduce) { .report-history__spinner { animation: none; } }
</style>
