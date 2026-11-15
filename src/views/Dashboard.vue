<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import { feedbackLocation, feedbackCountText } from "../utils/feedback-links";
import { computed } from "vue";
import { getDashboard } from "../api/dashboard";
import { useResource } from "../composables/resource";
import { periodValue, periodParams } from "../store/period";
import PeriodSelect from "../components/PeriodSelect.vue";
import LoadState from "../components/LoadState.vue";
import ColumnChart from "../components/ColumnChart.vue";
import CoverageChart from "../components/CoverageChart.vue";
import GradeTrend from "../components/GradeTrend.vue";
const { data, loading, error, refresh } = useResource(signal => getDashboard(periodParams.value, signal), [periodValue], () => `dashboard:${periodValue.value}`);
const stats = computed(() => [
  { label: "Заполнение отзывов", value: data.value ? `${data.value.coverage.submittedCount.toLocaleString('ru-RU')} / ${data.value.coverage.possibleCount.toLocaleString('ru-RU')}` : '—', detail: data.value?.coverage.completionPercent != null ? `${data.value.coverage.completionPercent.toLocaleString('ru-RU')}% заполнено` : 'Нет доступной нагрузки' },
  { label: "Средняя оценка дисциплин", value: data.value?.averageGrade?.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '—', detail: feedbackCountText(data.value?.ratedFeedbackCount || 0) },
  { label: "Преподавателей", value: data.value?.teacherCount || 0 },
  { label: "Требуют внимания", value: data.value?.lowGradeCount || 0 },
]);
const deltaText = computed(() => {
  const delta = data.value?.comparison?.delta;
  return delta === undefined || delta === 0 ? 'Без изменений' : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}`;
});
const lowGrades = computed(() => data.value?.lowGrades || []);
const strongest = computed(() => data.value?.highGrades || []);
const distribution = computed(() => data.value?.distribution || []);
const hasTrend = computed(() => data.value?.timeline.some(p => p.averageGrade !== null));
</script>
<template>
  <PageHeader title="Сводка" subtitle="Статистика оценок и отзывов"><template #actions><PeriodSelect /></template></PageHeader>
  <LoadState
    skeleton="dashboard"
    :loading="loading"
    :error="error"
    @retry="refresh"
    ><div class="stats-grid">
      <article v-for="stat in stats" :key="stat.label" class="stat-card">
        <div>
          <div class="stat-card__label">{{ stat.label }}</div>
          <div class="stat-card__value">{{ stat.value }}</div>
          <p v-if="stat.detail" class="stat-card__detail">{{ stat.detail }}</p>
        </div>
      </article>
    </div>
    <article class="card dashboard-trend">
      <div class="panel-heading"><h2>Динамика средней оценки</h2><span class="muted">Шкала 1–5</span></div>
      <p v-if="data?.comparison" class="chart-explanation trend-comparison" :title="`${data.comparison.currentTitle} и ${data.comparison.previousTitle}`">
        {{ data.comparison.currentTitle }}: <strong>{{ deltaText }}</strong> к предыдущему семестру
      </p>
      <GradeTrend v-if="hasTrend" :items="data!.timeline" />
      <div v-else class="empty-state">Пока нет оценок для построения динамики.</div>
      <p class="chart-explanation">Среднее арифметическое оценок дисциплин с отзывами. Каждая дисциплина имеет одинаковый вес. Пропуски означают отсутствие оценок.</p>
      <p class="chart-explanation">{{ periodParams.StartYear ? 'Семестры выбранного учебного года.' : periodParams.PeriodId ? 'До шести семестров до выбранного включительно.' : 'Последние шесть семестров.' }}</p>
      <p v-if="data?.timeline.filter(p => p.averageGrade !== null).length === 1" class="chart-explanation">Оценки есть только за один семестр — сравнение появится после заполнения других.</p>
    </article>
    <div class="dashboard-panels">
      <article class="card">
        <div class="panel-heading">
          <h2>Заполнение по семестрам</h2>
        </div>
        <CoverageChart v-if="data?.timeline.length" :items="data.timeline" />
        <div v-else class="empty-state">Пока нет данных по семестрам</div>
        <p class="chart-explanation">Оставлено / возможно: один отзыв на каждую дисциплину с преподавателем. Расчёт по текущему составу активных студентов в группах.</p>
      </article>
      <article class="card">
        <div class="panel-heading">
          <h2>Распределение оценок</h2>
          <span class="muted"
            >{{ data?.disciplineCount || 0 }} дисциплин</span
          >
        </div>
        <ColumnChart
          label="Количество дисциплин по средней оценке"
          :items="distribution"
        />
        <p class="chart-explanation">
          Количество дисциплин в каждом диапазоне средней оценки. Дисциплины без оценок не учитываются.
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
        <RouterLink
          v-for="item in lowGrades"
          :to="feedbackLocation('disciplines', item.id, periodValue)"
          :key="item.id"
          class="result-row"
        >
<span class="result-name">{{ item.name }}<small>{{ feedbackCountText(item.feedbackCount) }}</small></span><strong class="danger">{{
            item.grade.toLocaleString("ru-RU", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          }}</strong>
        </RouterLink>
        <RouterLink to="/disciplines?tab=ratings" class="text-link panel-link"
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
        <RouterLink v-for="item in strongest" :key="item.id" class="result-row" :to="feedbackLocation('disciplines', item.id, periodValue)">
          <span class="result-name">{{ item.name }}<small>{{ feedbackCountText(item.feedbackCount) }}</small></span><strong>{{
            item.grade.toLocaleString("ru-RU", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          }}</strong>
        </RouterLink>
        <RouterLink to="/disciplines?tab=ratings" class="text-link panel-link"
          >Все оценки дисциплин</RouterLink
        >
      </article>
    </div></LoadState
  >
</template>
