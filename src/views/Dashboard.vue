<script setup lang="ts">
import { computed } from "vue";
import { getTeachersRating } from "../api/teachers";
import { getDisciplinesRating } from "../api/disciplines";
import { getFeedbacks } from "../api/feedback";
import { useResource } from "../composables/resource";
import { periodValue, periodParams } from "../store/period";
import { averageGrade, alphabeticalSample } from "../utils/analytics";
import PeriodSelect from "../components/PeriodSelect.vue";
import LoadState from "../components/LoadState.vue";
const { data, loading, error, refresh } = useResource(async () => {
  const [teachers, disciplines, feedback] = await Promise.all([
    getTeachersRating({ Page: 1, PageSize: 1000, ...periodParams.value }),
    getDisciplinesRating({ Page: 1, PageSize: 1000, ...periodParams.value }),
    getFeedbacks({ Page: 1, PageSize: 1 }),
  ]);
  return { teachers, disciplines, feedback };
}, [periodValue]);
const average = computed(() =>
  averageGrade(data.value?.disciplines.items || []),
);
const stats = computed(() => [
  {
    label: "Средний балл дисциплин",
    value:
      average.value?.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) ||
      "—",
    note: "По полученным оценкам",
  },
  {
    label: "Отзывов за всё время",
    value: data.value?.feedback.totalCount.toLocaleString("ru-RU") || "0",
    note: "Обратная связь студентов",
  },
  {
    label: "Преподавателей",
    value: data.value?.teachers.totalCount || 0,
    note: "В выбранном периоде",
  },
  {
    label: "Дисциплин",
    value: data.value?.disciplines.totalCount || 0,
    note: "В выбранном периоде",
  },
]);
const charts = computed(() => [
  {
    title: "Оценки преподавателей",
    path: "/teachers/rating",
    items: data.value?.teachers.items || [],
  },
  {
    title: "Оценки дисциплин",
    path: "/disciplines/rating",
    items: data.value?.disciplines.items || [],
  },
]);
</script>
<template>
  <div class="page-header">
    <span class="eyebrow">АНАЛИТИКА ОБРАТНОЙ СВЯЗИ</span>
    <h1 class="page-title">Обзор результатов</h1>
    <p class="page-subtitle">
      Общая картина, которая помогает находить точки роста.
    </p>
  </div>
  <div class="toolbar">
    <PeriodSelect /><RouterLink class="text-link" to="/reports"
      >Перейти к отчётам ↗</RouterLink
    >
  </div>
  <LoadState :loading="loading" :error="error" @retry="refresh"
    ><div class="stats-grid">
      <article v-for="s in stats" :key="s.label" class="stat-card">
        <div>
          <div class="stat-card__label">{{ s.label }}</div>
          <div class="stat-card__value">{{ s.value }}</div>
          <div class="stat-card__note">{{ s.note }}</div>
        </div>
      </article>
    </div>
    <div class="dashboard-charts">
      <article v-for="chart in charts" :key="chart.path" class="card">
        <div class="chart-heading">
          <h2>{{ chart.title }}</h2>
          <RouterLink
            :to="chart.path"
            class="text-link"
            :aria-label="`${chart.title}: все результаты`"
            >↗</RouterLink
          >
        </div>
        <div v-if="!chart.items.length" class="empty-state">
          Пока нет оценок
        </div>
        <div
          v-for="item in alphabeticalSample(chart.items)"
          :key="item.id"
          class="bar-row"
        >
          <span>{{ item.name }}</span><meter
            min="0"
            max="5"
            :value="item.grade"
            :aria-label="item.name"
          /><strong>{{
            item.grade.toLocaleString("ru-RU", { maximumFractionDigits: 1 })
          }}</strong>
        </div>
        <p class="chart-caption">До 10 записей по алфавиту. Шкала от 1 до 5.</p>
      </article>
    </div>
    <aside class="notice">
      <span class="intro-symbol">✧</span>
      <div>
        <strong>От чисел — к пониманию</strong>
        <p>
          Сводки ИИ помогают увидеть повторяющиеся темы в комментариях.
          Проверяйте выводы по исходным отзывам.
        </p>
        <RouterLink class="text-link" to="/summaries"
          >Открыть сводки ↗</RouterLink
        >
      </div>
    </aside></LoadState
  >
</template>
