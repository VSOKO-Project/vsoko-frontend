<script setup lang="ts">
import DataTable from "../components/DataTable.vue";
import type { FeedbackReportDto } from "../types";
import FeedbackReport from "../components/FeedbackReport.vue";
import { feedbackCountText, feedbackLocation } from "../utils/feedback-links";
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
const summary = ref<FeedbackReportDto>();
const action = useAction();
watch([query, periodValue], () => (page.value = 1));
watch([periodValue, () => props.kind], () => { selected.value = ""; summary.value = undefined; });
const { data, loading, error, refresh } = useResource(
  () =>
    (teacher.value ? getTeachersRating : getDisciplinesRating)({
      Page: page.value,
      PageSize: DEFAULT_PAGE_SIZE,
      Query: query.value,
      ...periodParams.value,
    }),
  [page, query, periodValue],
  () => JSON.stringify(["ratings", props.kind, page.value, query.value, periodValue.value]),
);
async function show(id: string) {
  selected.value = id;
  summary.value = undefined;
  const current = `${id}:${periodValue.value}:${props.kind}`;
  await action.run(async () => {
    const text = await (
      teacher.value ? getTeacherSummary : getDisciplineSummary
    )(id, periodParams.value);
    if (`${selected.value}:${periodValue.value}:${props.kind}` === current) summary.value = text;
  });
}
</script>
<template>
  <div class="toolbar">
    <input
      v-model="query"
      type="search"
      aria-label="Поиск"
      :placeholder="teacher ? 'Найти преподавателя…' : 'Найти дисциплину…'"
    /><PeriodSelect />
  </div>
  <DataTable  :widths="['50%', '30%', '20%']" :columns="[teacher ? 'Преподаватель' : 'Дисциплина', 'Средний балл', 'Сводка']"
    :loading="loading" :error="error" :empty="!data?.items.length" @retry="refresh">
          <tr v-for="item in data?.items" :key="item.id">
            <td><RouterLink class="rating-name-link" :to="feedbackLocation(kind, item.id, periodValue)">{{ item.name }}</RouterLink></td>
            <td><div class="rating-meta">
              <span v-if="item.grade > 0"
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
              ><span v-else class="muted">—</span><small class="muted">{{ feedbackCountText(item.feedbackCount) }}</small></div>
            </td>
            <td>
              <button
                class="text-link"
                :disabled="action.pending.value"
                @click="show(item.id)"
              >
                Открыть
              </button>
            </td>
          </tr>

  </DataTable>
  <Pagination v-model:page="page" :total="data?.totalPages || 0" /><Modal :open="!!selected" title="Сводка ИИ" @close="selected = ''"
    ><LoadState
      skeleton="text"
      :loading="action.pending.value"
      :error="action.error.value"
      @retry="show(selected)"
      ><FeedbackReport v-if="summary" :report="summary" @refresh="show(selected)" />
      <p v-else class="muted">Сводка недоступна</p></LoadState
    ></Modal
  >
</template>
