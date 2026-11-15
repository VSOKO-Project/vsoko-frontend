<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";
import { getFeedbackById } from "../api/feedback";
import { useResource } from "../composables/resource";
import LoadState from "../components/LoadState.vue";
import Rating from "../components/Rating.vue";
const route = useRoute();
// Clear the previous source before loading a different ID in the reused route component.
watch(() => route.params.id, () => { feedback.data.value = undefined; }, { flush: "sync" });
const feedback = useResource(() => getFeedbackById(String(route.params.id)), [() => route.params.id]);
</script>
<template>
  <div class="page-header"><h1 class="page-title">Исходный отзыв</h1><p class="page-subtitle">Полный комментарий для проверки выводов анализа.</p></div>
  <LoadState :loading="feedback.loading.value" :error="feedback.error.value" @retry="feedback.refresh">
    <article v-if="feedback.data.value" class="card review-card">
      <h2>{{ feedback.data.value.workload.discipline.name }}</h2>
      <p>{{ feedback.data.value.workload.teacher.fullName }}</p>
      <p class="muted">{{ feedback.data.value.workload.period?.title }} · ID: {{ feedback.data.value.id }}</p>
      <blockquote v-if="feedback.data.value.comment" style="white-space: pre-wrap; overflow-wrap: anywhere">{{ feedback.data.value.comment }}</blockquote>
      <p v-else class="muted">Комментарий не оставлен</p>
      <div v-for="criterion in feedback.data.value.criteriaFeedback" :key="criterion.criteria.id" class="history-criterion">
        <span>{{ criterion.criteria.name }}</span><Rating :model-value="criterion.criteriaScore" :label="criterion.criteria.name" readonly />
      </div>
    </article>
  </LoadState>
</template>
