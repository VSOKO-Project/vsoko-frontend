<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getFeedbacks, deleteFeedback } from "../api/feedback";
import { getTeachers } from "../api/teachers";
import { getDisciplines } from "../api/disciplines";
import { useAction, useResource } from "../composables/resource";
import { confirmAction } from "../composables/confirmation";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import type { FeedbackDto, FeedbackSort, PagedResultDto } from "../types";
import AppSelect from "../components/AppSelect.vue";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
import Rating from "../components/Rating.vue";
type Kind = "discipline" | "teacher";
const kind = ref<Kind>("discipline");
const search = ref("");
const query = ref("");
const directoryPage = ref(1);
const target = ref<{ id: string; name: string; kind: Kind }>();
const page = ref(1);
const sort = ref<FeedbackSort>("Newest");
watch(search, (value, _old, cleanup) => {
  const timer = setTimeout(() => {
    query.value = value.trim();
    directoryPage.value = 1;
  }, 200);
  cleanup(() => clearTimeout(timer));
});
watch(kind, () => {
  search.value = "";
  query.value = "";
  directoryPage.value = 1;
});
const directory = useResource(async () => {
  const params = {
    Page: directoryPage.value,
    PageSize: DEFAULT_PAGE_SIZE,
    Query: query.value,
  };
  if (kind.value === "teacher") {
    const result = await getTeachers(params);
    return {
      ...result,
      items: result.items.map((t) => ({ id: t.id, name: t.fullName })),
    };
  }
  return getDisciplines(params);
}, [kind, query, directoryPage]);
const feedback = useResource<PagedResultDto<FeedbackDto>>(
  (signal) =>
    target.value
      ? getFeedbacks(
          {
            Page: page.value,
            PageSize: DEFAULT_PAGE_SIZE,
            Sort: sort.value,
            ...(target.value.kind === "teacher"
              ? { TeacherId: target.value.id }
              : { DisciplineId: target.value.id }),
          },
          signal,
        )
      : Promise.resolve({
          items: [],
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          totalPages: 0,
          totalCount: 0,
        }),
  [target, page, sort],
);
watch(sort, () => {
  page.value = 1;
});
function choose(item: { id: string; name: string }) {
  feedback.data.value = undefined;
  page.value = 1;
  target.value = { ...item, kind: kind.value };
}
function changeKind(value: Kind) {
  directory.data.value = undefined;
  kind.value = value;
}
function changeTarget() {
  target.value = undefined;
  feedback.data.value = undefined;
}
const action = useAction();
async function remove(item: FeedbackDto) {
  if (
    (await confirmAction({
      title: "Удалить отзыв?",
      description: "Отзыв и выставленные в нём оценки будут удалены.",
      confirmText: "Удалить",
      danger: true,
    })) &&
    (await action.run(() => deleteFeedback(item.id), "Отзыв удалён"))
  )
    await feedback.refresh();
}
function average(item: FeedbackDto) {
  if (
    typeof item.averageGrade === "number" &&
    Number.isFinite(item.averageGrade)
  )
    return item.averageGrade;
  const scores = item.criteriaFeedback.map((c) => c.criteriaScore);
  return scores.length
    ? scores.reduce((sum, value) => sum + value, 0) / scores.length
    : null;
}
function date(item: FeedbackDto) {
  if (!item.createdAtUtc) return "Дата не указана";
  const value = new Date(item.createdAtUtc);
  return Number.isNaN(value.getTime())
    ? "Дата не указана"
    : value.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
const sortOptions = [
  { value: "Newest", label: "Сначала новые" },
  { value: "Oldest", label: "Сначала старые" },
  { value: "GradeDesc", label: "Сначала высокая оценка" },
  { value: "GradeAsc", label: "Сначала низкая оценка" },
];
const title = computed(() =>
  kind.value === "teacher" ? "Преподаватели" : "Дисциплины",
);
</script>
<template>
  <div class="page-header">
    <h1 class="page-title">Отзывы</h1>
    <p class="page-subtitle">
      {{
        target
          ? "Отзывы студентов по выбранной записи"
          : "Выберите дисциплину или преподавателя, чтобы посмотреть отзывы"
      }}
    </p>
  </div>
  <template v-if="!target"
    ><section class="card feedback-picker">
      <div class="segmented" role="group" aria-label="Тип поиска отзывов">
        <button
          :aria-pressed="kind === 'discipline'"
          @click="changeKind('discipline')"
        >
          По дисциплине</button
        ><button
          :aria-pressed="kind === 'teacher'"
          @click="changeKind('teacher')"
        >
          По преподавателю
        </button>
      </div>
      <input
        v-model="search"
        type="search"
        :aria-label="
          kind === 'teacher'
            ? 'Поиск преподавателя для отзывов'
            : 'Поиск дисциплины для отзывов'
        "
        :placeholder="
          kind === 'teacher' ? 'Фамилия преподавателя' : 'Название дисциплины'
        "
      />
      <h2 class="picker-heading">{{ title }}</h2>
      <LoadState
        :loading="directory.loading.value"
        :error="directory.error.value"
        :empty="!directory.data.value?.items.length"
        @retry="directory.refresh"
        ><div class="feedback-targets">
          <button
            v-for="item in directory.data.value?.items"
            :key="item.id"
            class="feedback-target"
            @click="choose(item)"
          >
            <span>{{ item.name }}</span><span class="target-action"
              >Показать отзывы</span
            >
          </button>
        </div>
        <Pagination
          v-model:page="directoryPage"
          :total="directory.data.value?.totalPages || 0"
      /></LoadState></section
  ></template>
  <template v-else
    ><section class="feedback-selection">
      <div>
        <span class="muted">{{
          target.kind === "teacher" ? "Преподаватель" : "Дисциплина"
        }}</span>
        <h2>{{ target.name }}</h2>
        <button class="text-link" @click="changeTarget">Изменить выбор</button>
      </div>
      <div class="feedback-sorting">
        <span v-if="feedback.data.value" class="muted"
          >Отзывов: {{ feedback.data.value.totalCount }}</span
        ><AppSelect
          v-model="sort"
          label="Сортировка отзывов"
          :options="sortOptions"
        />
      </div>
    </section>
    <p v-if="action.error.value" class="error-text" role="alert">
      {{ action.error.value }}
    </p>
    <p v-if="action.success.value" class="notice" role="status">
      {{ action.success.value }}
    </p>
    <LoadState
      :loading="feedback.loading.value"
      :error="feedback.error.value"
      :empty="!feedback.data.value?.items.length"
      @retry="feedback.refresh"
      ><div class="history-list">
        <article
          v-for="item in feedback.data.value?.items"
          :key="item.id"
          class="card review-card"
        >
          <div class="history-heading">
            <div>
              <h2>{{ item.workload.discipline.name }}</h2>
              <p class="muted">{{ item.workload.teacher.fullName }}</p>
              <p class="review-meta">
                {{ item.workload.period?.title }} · {{ date(item) }}
              </p>
            </div>
            <div class="review-average">
              <span>Средняя оценка</span
              ><strong
                >{{
                  average(item)?.toLocaleString("ru-RU", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }) || "—"
                }}<small> / 5</small></strong
              >
            </div>
          </div>
          <blockquote v-if="item.comment">{{ item.comment }}</blockquote>
          <p v-else class="muted">Комментарий не оставлен</p>
          <details class="review-criteria">
            <summary>Оценки по критериям</summary>
            <div
              v-for="criterion in item.criteriaFeedback"
              :key="criterion.criteria.id"
              class="history-criterion"
            >
              <span>{{ criterion.criteria.name }}</span><Rating
                :model-value="criterion.criteriaScore"
                :label="criterion.criteria.name"
                readonly
              />
            </div>
          </details>
          <div class="review-actions">
            <button
              class="text-link danger"
              :disabled="action.pending.value"
              @click="remove(item)"
            >
              Удалить отзыв
            </button>
          </div>
        </article>
      </div>
      <Pagination
        v-model:page="page"
        :total="feedback.data.value?.totalPages || 0" /></LoadState
  ></template>
</template>
