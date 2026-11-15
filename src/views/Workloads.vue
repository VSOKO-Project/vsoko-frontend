<script setup lang="ts">
import ActionIcon from "../components/ActionIcon.vue";
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { getWorkloads } from "../api/workload";
import { getFeedbacks } from "../api/feedback";
import { getPeriods } from "../api/periods";
import { useResource } from "../composables/resource";
import { auth } from "../store/auth";
import { draftKey, readDraft } from "../utils/drafts";
import type { PagedResultDto } from "../types";
import LoadState from "../components/LoadState.vue";
const route = useRoute();
const query = ref("");
const filter = ref(route.query.filter === 'all' ? 'all' : 'remaining');
async function allPages<T>(load: (page: number) => Promise<PagedResultDto<T>>) {
  const first = await load(1);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) items.push(...(await load(page)).items);
  return items;
}
const { data, loading, error, refresh } = useResource(async (signal) => {
  const [periods, workloads, feedbacks] = await Promise.all([
    getPeriods(signal),
    allPages(page => getWorkloads({ Page: page, PageSize: 100 }, signal)),
    allPages(page => getFeedbacks({ Page: page, PageSize: 100 }, signal)),
  ]);
  return { periods, workloads, feedbacks };
});
const open = computed(() => data.value?.periods.filter(p => p.isFeedbackOpen) || []);
const workloads = computed(() => data.value?.workloads.filter(w => open.value.some(p => p.id === w.period?.id)) || []);
function feedbackId(id: string) { return data.value?.feedbacks.find(f => f.workload.id === id)?.id; }
function hasDraft(id: string) {
  const draft = readDraft(draftKey(auth.session?.data.userId || null, id));
  return !!draft.comment.trim() || Object.keys(draft.grades).length > 0;
}
const groups = computed(() => [...new Set(workloads.value.map(w => w.group.name))].join(', '));
const completed = computed(() => workloads.value.filter(w => feedbackId(w.id)).length);
const visible = computed(() => workloads.value.filter(w =>
  (filter.value !== 'remaining' || !feedbackId(w.id)) &&
  `${w.discipline.name} ${w.teacher.fullName}`.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())
));
</script>
<template>
  <div class="student-workloads">
  <div class="page-header">
    <h1 class="page-title">Оценка обучения</h1>
    <p class="page-subtitle">{{ open.map(p => p.title).join(' · ') || 'Дисциплины и преподаватели вашей группы' }}<template v-if="groups"> · {{ groups }}</template> · Поделитесь опытом обучения за семестр.</p>
  </div>
  <LoadState skeleton="workloads" :loading="loading" :error="error" @retry="refresh">
    <template v-if="open.length">
      <section class="card student-progress" aria-label="Прогресс оценивания">
        <div><h2>Оценено {{ completed }} из {{ workloads.length }}</h2><p class="muted">{{ workloads.length && completed === workloads.length ? 'Оценки можно изменить, пока сбор отзывов открыт.' : 'Можно заполнить часть сейчас и вернуться позже.' }}</p></div>
        <progress :value="completed" :max="workloads.length || 1" :aria-label="`Оценено ${completed} из ${workloads.length}`" />
      </section>
      <div class="toolbar student-toolbar">
        <input v-if="workloads.length > 6" type="search" aria-label="Поиск по дисциплине или преподавателю" placeholder="Дисциплина или преподаватель…" v-model="query" />
        <div class="student-filters" role="group" aria-label="Показать дисциплины">
          <button class="btn" :class="filter === 'remaining' ? 'btn--primary' : 'btn--secondary'" :aria-pressed="filter === 'remaining'" @click="filter = 'remaining'">Осталось оценить · {{ workloads.length - completed }}</button>
          <button class="btn" :class="filter === 'all' ? 'btn--primary' : 'btn--secondary'" :aria-pressed="filter === 'all'" @click="filter = 'all'">Все</button>
        </div>
      </div>
      <div class="workloads-grid">
        <article v-for="w in visible" :key="w.id" class="card workload-card">
          <span v-if="feedbackId(w.id) || hasDraft(w.id)" class="badge" :class="feedbackId(w.id) ? 'badge--success' : hasDraft(w.id) ? 'badge--warning' : ''">{{ feedbackId(w.id) ? 'Оценка отправлена' : 'Черновик' }}</span>
          <h2>{{ w.discipline.name }}</h2>
          <p class="muted">{{ w.teacher.fullName }}</p>
          <span v-if="open.length > 1" class="muted">{{ w.period.title }}</span>
          <RouterLink v-if="feedbackId(w.id)" class="action-icon-button workload-edit-link" aria-label="Изменить оценку" :title="`Изменить оценку: ${w.discipline.name}`" :to="`/my-feedback?edit=${encodeURIComponent(feedbackId(w.id)!)}`"><ActionIcon name="edit" /></RouterLink>
          <RouterLink v-else class="btn btn--primary" :to="`/feedback/new?workloadId=${encodeURIComponent(w.id)}`">{{ hasDraft(w.id) ? 'Продолжить' : 'Оценить' }}</RouterLink>
        </article>
      </div>
      <section v-if="filter === 'remaining' && workloads.length > 0 && completed === workloads.length" class="card student-complete">
        <span class="badge badge--success">Готово</span>
        <h2>Спасибо, всё оценено!</h2>
        <p class="muted">Ваши оценки и комментарии сохранены.</p>
        <RouterLink class="btn btn--secondary" to="/my-feedback">Посмотреть оценки</RouterLink>
      </section>
      <div v-else-if="!visible.length" class="empty-state">{{ query ? 'Ничего не найдено. Попробуйте другой запрос.' : filter === 'remaining' && workloads.length ? 'Все доступные дисциплины оценены. Спасибо за обратную связь!' : 'Пока нет доступных дисциплин.' }}</div>
    </template>
    <div v-else class="empty-state">Сбор отзывов сейчас закрыт. Ваши оценки доступны в истории.</div>
  </LoadState>
  </div>
</template>
