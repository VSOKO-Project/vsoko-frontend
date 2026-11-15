<script setup lang="ts">
import type { FeedbackEvidenceDto } from "../types";
defineProps<{ evidence: FeedbackEvidenceDto[] }>();
const sentiments = { Positive: "Положительная оценка", Negative: "Отрицательная оценка", Neutral: "Нейтральное упоминание" };
const bases = { Personal: "Личный опыт", Hearsay: "Пересказ", Ambiguous: "Неоднозначный контекст" };
</script>
<template>
  <ul class="analysis-evidence">
    <li v-for="(item, index) in evidence" :key="`${item.feedbackId}:${index}`">
      <blockquote>{{ item.quote }}</blockquote>
      <span class="muted">{{ sentiments[item.sentiment] }} · {{ bases[item.basis] }}</span>
      <RouterLink class="text-link" :to="`/feedback/${encodeURIComponent(item.feedbackId)}`">Открыть отзыв {{ item.feedbackId }}</RouterLink>
    </li>
  </ul>
</template>
