<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import type { FeedbackReportDto } from "../types";
import FeedbackReport from "../components/FeedbackReport.vue";
import FeedbackCategoryForm from "../components/FeedbackCategoryForm.vue";
import { getFeedbackCategories } from "../api/summaries";
import { ref, watch } from "vue";
import { getTeachers } from "../api/teachers";
import { getDisciplines } from "../api/disciplines";
import { getTeacherSummary, getDisciplineSummary } from "../api/summaries";
import { useResource, useAction } from "../composables/resource";
import { periodParams, periodValue } from "../store/period";
import AppSelect from "../components/AppSelect.vue";
import PeriodSelect from "../components/PeriodSelect.vue";
import LoadState from "../components/LoadState.vue";
const mode = ref("teacher");
const selected = ref("");
const summary = ref<FeedbackReportDto>();
const categories = useResource(() => getFeedbackCategories());
const addingCategory = ref(false);
async function refreshReport() { await Promise.all([categories.refresh(), generate()]); }
async function categorySaved() { addingCategory.value = false; await categories.refresh(); if (selected.value) await generate(); }
const action = useAction();
const options = useResource(
  async () =>
    mode.value === "teacher"
      ? (await getTeachers({ Page: 1, PageSize: 100 })).items.map((t) => ({
          id: t.id,
          name: t.fullName,
        }))
      : (await getDisciplines({ Page: 1, PageSize: 100 })).items,
  [mode],
);
watch([mode, periodValue], () => {
  selected.value = "";
  summary.value = undefined;
});
watch(selected, () => (summary.value = undefined));
async function generate() {
  const selection = `${mode.value}:${selected.value}:${periodValue.value}`;
  await action.run(async () => {
    const text = await (
      mode.value === "teacher" ? getTeacherSummary : getDisciplineSummary
    )(selected.value, periodParams.value);
    if (selection === `${mode.value}:${selected.value}:${periodValue.value}`)
      summary.value = text;
  });
}
</script>
<template>
  <div class="analysis-page">
  <PageHeader title="Анализ отзывов">Общие темы и отдельные сообщения, требующие внимания, со ссылками на исходные отзывы.</PageHeader>
  <section class="card">
    <div class="filter-grid">
      <label class="field"
        >Тип<AppSelect
          v-model="mode"
          label="Тип сводки"
          :options="[
            { value: 'teacher', label: 'По преподавателю' },
            { value: 'discipline', label: 'По дисциплине' },
          ]" /></label
      ><label class="field"
        >{{ mode === "teacher" ? "Преподаватель" : "Дисциплина"
        }}<LoadState skeleton="field" :loading="options.loading.value" :error="options.error.value" @retry="options.refresh"><AppSelect
          v-model="selected"
          :label="mode === 'teacher' ? 'Преподаватель' : 'Дисциплина'"
          :options="[
            { value: '', label: 'Выберите запись' },
            ...(options.data.value || []).map((o) => ({
              value: o.id,
              label: o.name,
            })),
          ]"
      /></LoadState></label>
      <div class="field">Период<PeriodSelect /></div>
      <button
        class="btn btn--primary"
        :disabled="!selected || action.pending.value"
        @click="generate"
      >
        Сформировать сводку
      </button>
    </div>
  </section>
  <LoadState
    skeleton="text"
    :loading="action.pending.value"
    :error="action.error.value"
    @retry="generate"
    ><section v-if="summary" class="card summary-card">
      <span class="eyebrow">СВОДКА ИИ</span>
      <FeedbackReport :report="summary" @refresh="refreshReport" />
    </section>
    <div v-else class="empty-state">
      Выберите преподавателя или дисциплину и сформируйте сводку.
    </div></LoadState
  >
  <section class="card analysis-catalog">
    <details>
      <summary>Категории анализа</summary>
      <div class="analysis-catalog__content">
        <p class="muted analysis-catalog__intro">Категории объединяют отзывы по темам. Если подходящей категории нет, в отчёте появится предложение новой.</p>
        <LoadState skeleton="list" :loading="categories.loading.value" :error="categories.error.value" @retry="categories.refresh">
          <ul v-if="categories.data.value?.length" class="analysis-category-list" aria-label="Категории анализа">
            <li v-for="category in categories.data.value" :key="category.id" class="analysis-category">
              <div class="analysis-category__heading">
                <strong>{{ category.name }}</strong>
                <span v-if="category.requiresAttention" class="badge badge--warning">Отдельная проверка</span>
              </div>
              <p v-if="category.description" class="muted">{{ category.description }}</p>
            </li>
          </ul>
          <p v-else class="muted">Категорий пока нет. Добавьте первую, чтобы группировать отзывы по темам.</p>
        </LoadState>
        <div class="analysis-catalog__actions">
          <button type="button" class="btn btn--secondary" :aria-expanded="addingCategory" aria-controls="analysis-category-editor" @click="addingCategory = !addingCategory">{{ addingCategory ? 'Закрыть форму' : 'Добавить категорию' }}</button>
        </div>
        <section v-if="addingCategory" id="analysis-category-editor" class="analysis-catalog__editor" aria-labelledby="analysis-category-title">
          <h3 id="analysis-category-title">Новая категория</h3>
          <FeedbackCategoryForm @saved="categorySaved" />
        </section>
      </div>
    </details>
  </section>
  </div>
</template>

<style scoped>
.analysis-page {
  display: grid;
  gap: 24px;
  min-width: 0;
}
.analysis-page > .page-header,
.analysis-page > .card,
.analysis-page > .summary-card {
  margin: 0;
}
.analysis-catalog > details > summary {
  margin: 0;
  font-weight: 500;
  line-height: 1.5;
}
.analysis-catalog__content {
  display: grid;
  gap: 20px;
  margin-top: 20px;
}
.analysis-catalog__intro {
  max-width: 760px;
}
.analysis-category-list {
  list-style: none;
  display: grid;
  gap: 12px;
}
.analysis-category {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  overflow-wrap: anywhere;
}
.analysis-category__heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.analysis-category__heading strong {
  font-size: 14px;
  font-weight: 600;
}
.analysis-category p {
  font-size: 13px;
  line-height: 1.6;
}
.analysis-catalog__actions {
  display: flex;
  flex-wrap: wrap;
}
.analysis-catalog__editor {
  display: grid;
  gap: 20px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}
.analysis-catalog__editor h3 {
  font-size: 16px;
  font-weight: 600;
}
@media (max-width: 640px) {
  .analysis-page { gap: 20px; }
  .analysis-category { padding: 14px; }
}
</style>
