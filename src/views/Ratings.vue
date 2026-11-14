<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import { computed, ref, watch } from "vue";
import { getTeachersRating } from "../api/teachers";
import { getDisciplinesRating } from "../api/disciplines";
import { getTeacherSummary, getDisciplineSummary } from "../api/summaries";
import { periodParams, periodValue } from "../store/period";
import { useResource, useAction } from "../composables/resource";
import PeriodSelect from "../components/PeriodSelect.vue";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
import Modal from "../components/Modal.vue";
const props = defineProps<{ kind: "teachers" | "disciplines" }>();
const teacher = computed(() => props.kind === "teachers");
const page = ref(1);
const query = ref("");
const selected = ref("");
const summary = ref("");
const action = useAction();
watch([query, periodValue], () => (page.value = 1));
const { data, loading, error, refresh } = useResource(
  () =>
    (teacher.value ? getTeachersRating : getDisciplinesRating)({
      Page: page.value,
      PageSize: DEFAULT_PAGE_SIZE,
      Query: query.value,
      ...periodParams.value,
    }),
  [page, query, periodValue],
);
async function show(id: string) {
  selected.value = id;
  summary.value = "";
  const current = id;
  await action.run(async () => {
    const text = await (
      teacher.value ? getTeacherSummary : getDisciplineSummary
    )(id, periodParams.value);
    if (selected.value === current) summary.value = text;
  });
}
</script>
<template>
  <div class="page-header">
    <span class="eyebrow">РЕЗУЛЬТАТЫ ОЦЕНКИ</span>
    <h1 class="page-title">
      {{ teacher ? "Оценки преподавателей" : "Оценки дисциплин" }}
    </h1>
    <p class="page-subtitle">
      Средние оценки по всем критериям. Выберите запись, чтобы прочитать сводку.
    </p>
  </div>
  <div class="toolbar">
    <input
      v-model="query"
      type="search"
      aria-label="Поиск"
      placeholder="Поиск…"
    /><PeriodSelect />
  </div>
  <LoadState
    :loading="loading"
    :error="error"
    :empty="!data?.items.length"
    @retry="refresh"
    ><div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{{ teacher ? "Преподаватель" : "Дисциплина" }}</th>
            <th>Средний балл</th>
            <th>Сводка</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in data?.items" :key="item.id">
            <td>{{ item.name }}</td>
            <td>
              <span
                class="badge"
                :class="
                  item.grade >= 4
                    ? 'badge--success'
                    : item.grade >= 3
                      ? 'badge--warning'
                      : 'badge--danger'
                "
                >{{
                  item.grade.toLocaleString("ru-RU", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })
                }}</span
              >
            </td>
            <td>
              <button
                class="text-link"
                :disabled="action.pending.value"
                @click="show(item.id)"
              >
                Открыть ↗
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination v-model:page="page" :total="data?.totalPages || 0" /></LoadState
  ><Modal :open="!!selected" title="Сводка ИИ" @close="selected = ''"
    ><LoadState
      :loading="action.pending.value"
      :error="action.error.value"
      @retry="show(selected)"
      ><p class="summary-text">{{ summary || "Сводка недоступна" }}</p>
      <p class="ai-note">
        Сводка может содержать неточности. Проверьте выводы по исходным
        комментариям.
      </p></LoadState
    ></Modal
  >
</template>
