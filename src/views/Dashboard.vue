<script setup lang="ts">
import { computed } from "vue";
import { getTeachersRating } from "../api/teachers";
import { getDisciplinesRating } from "../api/disciplines";
import { getFeedbacks } from "../api/feedback";
import { getPeriods } from "../api/periods";
import { useResource } from "../composables/resource";
import { periodValue, periodParams } from "../store/period";
import { averageGrade } from "../utils/analytics";
import PeriodSelect from "../components/PeriodSelect.vue";
import LoadState from "../components/LoadState.vue";
import ColumnChart from "../components/ColumnChart.vue";
const { data, loading, error, refresh } = useResource(async () => {
  const [teachers, disciplines, feedback, periods] = await Promise.all([
    getTeachersRating({ Page: 1, PageSize: 1000, ...periodParams.value }),
    getDisciplinesRating({ Page: 1, PageSize: 1000, ...periodParams.value }),
    getFeedbacks({ Page: 1, PageSize: 1 }),
    getPeriods(),
  ]);
  return { teachers, disciplines, feedback, periods };
}, [periodValue]);
const average = computed(() =>
  averageGrade(data.value?.disciplines.items || []),
);
const lowGrades = computed(() =>
  (data.value?.disciplines.items || [])
    .filter((d) => d.grade > 0 && d.grade < 3.5)
    .sort((a, b) => a.grade - b.grade),
);
const responseCount = computed(() => {
  if (!data.value) return 0;
  if (!periodValue.value) return data.value.feedback.totalCount;
  return data.value.periods
    .filter((p) =>
      periodParams.value.PeriodId
        ? p.id === periodParams.value.PeriodId
        : p.startYear === periodParams.value.StartYear,
    )
    .reduce((sum, p) => sum + p.feedbackCount, 0);
});
const stats = computed(() => [
  { label: "Отзывов", value: responseCount.value.toLocaleString("ru-RU") },
  {
    label: "Средняя оценка дисциплин",
    value:
      average.value?.toLocaleString("ru-RU", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) || "—",
  },
  { label: "Преподавателей", value: data.value?.teachers.totalCount || 0 },
  { label: "Требуют внимания", value: lowGrades.value.length },
]);
const timeline = computed(() =>
  [...(data.value?.periods || [])]
    .sort(
      (a, b) =>
        a.startYear - b.startYear ||
        (a.term === b.term ? 0 : a.term === "Autumn" ? -1 : 1),
    )
    .slice(-6)
    .map((p) => ({
      label: p.title.replace(/\s*\(.+\)$/, ""),
      value: p.feedbackCount,
    })),
);
const distribution = computed(() =>
  ["1–2", "2–3", "3–4", "4–5"].map((label, index) => ({
    label,
    value: (data.value?.disciplines.items || []).filter(
      (d) => d.grade > 0 && Math.min(3, Math.floor(d.grade) - 1) === index,
    ).length,
  })),
);
const strongest = computed(() =>
  [...(data.value?.disciplines.items || [])]
    .filter((d) => d.grade >= 4)
    .sort((a, b) => b.grade - a.grade)
    .slice(0, 5),
);
</script>
<template>
  <div class="page-header dashboard-heading">
    <div>
      <h1 class="page-title">Обзор результатов</h1>
      <p class="page-subtitle">Статистика оценок и отзывов</p>
    </div>
    <PeriodSelect />
  </div>
  <LoadState :loading="loading" :error="error" @retry="refresh"
    ><div class="stats-grid">
      <article v-for="stat in stats" :key="stat.label" class="stat-card">
        <div>
          <div class="stat-card__label">{{ stat.label }}</div>
          <div class="stat-card__value">{{ stat.value }}</div>
        </div>
      </article>
    </div>
    <div class="dashboard-panels">
      <article class="card">
        <div class="panel-heading">
          <h2>Отзывы по семестрам</h2>
        </div>
        <ColumnChart
          v-if="timeline.length"
          label="Количество отзывов по семестрам"
          :items="timeline"
        />
        <div v-else class="empty-state">Пока нет данных по семестрам</div>
      </article>
      <article class="card">
        <div class="panel-heading">
          <h2>Распределение оценок</h2>
          <span class="muted"
            >{{ data?.disciplines.totalCount || 0 }} дисциплин</span
          >
        </div>
        <ColumnChart
          label="Количество дисциплин по средней оценке"
          :items="distribution"
        />
        <p class="chart-explanation">
          Количество дисциплин в каждом диапазоне средней оценки
        </p>
      </article>
    </div>
    <div class="dashboard-panels">
      <article class="card">
        <div class="panel-heading">
          <h2>Требуют внимания</h2>
          <span class="badge" :class="{ 'badge--warning': lowGrades.length }"
            >Ниже 3,5</span
          >
        </div>
        <div v-if="!lowGrades.length" class="panel-empty">
          Нет дисциплин со средней оценкой ниже 3,5
        </div>
        <div
          v-for="item in lowGrades.slice(0, 5)"
          :key="item.id"
          class="result-row"
        >
          <span>{{ item.name }}</span><strong class="danger">{{
            item.grade.toLocaleString("ru-RU", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          }}</strong>
        </div>
        <RouterLink to="/disciplines/rating" class="text-link panel-link"
          >Все оценки дисциплин</RouterLink
        >
      </article>
      <article class="card">
        <div class="panel-heading">
          <h2>Высокие оценки</h2>
          <span class="badge badge--success">От 4,0</span>
        </div>
        <div v-if="!strongest.length" class="panel-empty">
          Пока нет дисциплин с оценкой от 4,0
        </div>
        <div v-for="item in strongest" :key="item.id" class="result-row">
          <span>{{ item.name }}</span><strong>{{
            item.grade.toLocaleString("ru-RU", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          }}</strong>
        </div>
        <RouterLink to="/teachers/rating" class="text-link panel-link"
          >Оценки преподавателей</RouterLink
        >
      </article>
    </div></LoadState
  >
</template>
