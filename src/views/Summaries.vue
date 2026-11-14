<script setup lang="ts">
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
const summary = ref("");
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
  summary.value = "";
});
watch(selected, () => (summary.value = ""));
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
  <div class="page-header">
    <h1 class="page-title">Сводки ИИ</h1>
    <p class="page-subtitle">
      Повторяющиеся темы в обратной связи — отправная точка для обсуждения.
    </p>
  </div>
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
        }}<AppSelect
          v-model="selected"
          :label="mode === 'teacher' ? 'Преподаватель' : 'Дисциплина'"
          :options="[
            { value: '', label: 'Выберите запись' },
            ...(options.data.value || []).map((o) => ({
              value: o.id,
              label: o.name,
            })),
          ]"
      /></label>
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
    :loading="options.loading.value || action.pending.value"
    :error="options.error.value || action.error.value"
    @retry="selected ? generate() : options.refresh()"
    ><section v-if="summary" class="card summary-card">
      <span class="eyebrow">СВОДКА ИИ</span>
      <p class="summary-text">{{ summary }}</p>
      <p class="ai-note">
        Сводка может содержать неточности. Проверьте выводы по исходным
        комментариям. Решение остаётся за человеком.
      </p>
      <RouterLink class="text-link" to="/feedback"
        >Показать комментарии</RouterLink
      >
    </section>
    <div v-else class="empty-state">
      Выберите преподавателя или дисциплину и сформируйте сводку.
    </div></LoadState
  >
</template>
