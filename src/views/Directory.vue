<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Catalog from './Catalog.vue';
import Ratings from './Ratings.vue';
import FeedbackBrowser from './FeedbackBrowser.vue';
const props = defineProps<{ kind: 'teachers' | 'disciplines' }>();
const route = useRoute();
const tab = computed(() => route.query.tab === 'ratings' || route.query.tab === 'feedback' ? route.query.tab : 'list');
const title = computed(() => props.kind === 'teachers' ? 'Преподаватели' : 'Дисциплины');
const subtitle = computed(() => ({ list: 'Справочник записей. Новые данные добавляются при импорте нагрузки.', ratings: 'Средние оценки по всем критериям. Выберите запись, чтобы прочитать сводку.', feedback: 'Выберите запись, чтобы посмотреть отзывы студентов.' })[tab.value]);
</script>
<template>
  <div class="page-header"><h1 class="page-title">{{ title }}</h1><p class="page-subtitle">{{ subtitle }}</p></div>
  <nav class="student-filters ratings-kind" :aria-label="`Разделы: ${title}`">
    <RouterLink v-for="item in [{ key: 'list', label: 'Список' }, { key: 'ratings', label: 'Оценки' }, { key: 'feedback', label: 'Отзывы' }]" :key="item.key" class="btn" :class="tab === item.key ? 'btn--primary' : 'btn--secondary'" :aria-current="tab === item.key ? 'page' : undefined" :to="{ path: `/${kind}`, query: item.key === 'list' ? {} : { tab: item.key } }">{{ item.label }}</RouterLink>
  </nav>
  <Catalog v-if="tab === 'list'" :kind="kind" embedded />
  <Ratings v-else-if="tab === 'ratings'" :kind="kind" />
  <FeedbackBrowser v-else :kind="kind === 'teachers' ? 'teacher' : 'discipline'" />
</template>
