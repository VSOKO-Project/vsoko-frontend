<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import { ref, computed } from "vue";
import { getWorkloads } from "../api/workload";
import { getPeriods } from "../api/periods";
import { useResource } from "../composables/resource";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
const page = ref(1);
const query = ref("");
const periods = useResource((signal) => getPeriods(signal));
const open = computed(() => periods.data.value?.find((p) => p.isFeedbackOpen));
const closed = computed(() => !!periods.data.value && !open.value);
const { data, loading, error, refresh } = useResource(
  (signal) =>
    closed.value
      ? Promise.resolve({
          items: [],
          totalPages: 0,
          totalCount: 0,
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
        })
      : getWorkloads(
          { Page: page.value, PageSize: DEFAULT_PAGE_SIZE, Query: query.value },
          signal,
        ),
  [page, query, closed],
);
function search(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
  page.value = 1;
}
</script>
<template>
  <div class="page-header">
    <span class="eyebrow">ВАША ОБРАТНАЯ СВЯЗЬ</span>
    <h1 class="page-title">Оценить занятия</h1>
    <p class="page-subtitle">
      {{ open?.title || "Дисциплины и преподаватели вашей группы" }} · Ваш опыт
      помогает делать занятия лучше.
    </p>
  </div>
  <div v-if="!closed" class="toolbar">
    <input
      type="search"
      aria-label="Поиск по дисциплине"
      placeholder="Найти дисциплину…"
      :value="query"
      @input="search"
    /><RouterLink class="text-link" to="/my-feedback"
      >История оценок ↗</RouterLink
    >
  </div>
  <LoadState
    :loading="loading || periods.loading.value"
    :error="error || periods.error.value"
    @retry="
      refresh();
      periods.refresh();
    "
    ><div v-if="closed" class="empty-state">
      Сбор отзывов сейчас закрыт. Ваши оценки доступны в истории.
    </div>
    <template v-else
      ><div class="workloads-grid">
        <article
          v-for="w in data?.items"
          :key="w.id"
          class="card workload-card"
        >
          <span class="eyebrow">ДИСЦИПЛИНА</span>
          <h2>{{ w.discipline.name }}</h2>
          <p class="muted">{{ w.teacher.fullName }}</p>
          <span class="badge">{{ w.group.name }}</span><RouterLink
            class="btn btn--primary"
            :to="`/feedback/new?workloadId=${encodeURIComponent(w.id)}`"
            >Оценить занятие <span aria-hidden="true">→</span></RouterLink
          >
        </article>
      </div>
      <div v-if="!data?.items.length" class="empty-state">
        Дисциплины не найдены. Попробуйте изменить поиск.
      </div>
      <Pagination
        v-model:page="page"
        :total="data?.totalPages || 0" /></template
  ></LoadState>
</template>
