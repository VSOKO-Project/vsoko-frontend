<script setup lang="ts">
import { ref } from "vue";
import type { FeedbackReportDto, ProposedFeedbackCategoryDto } from "../types";
import FeedbackEvidence from "./FeedbackEvidence.vue";
import FeedbackCategoryForm from "./FeedbackCategoryForm.vue";
import FeedbackSignal from "./FeedbackSignal.vue";
defineProps<{ report: FeedbackReportDto }>();
const emit = defineEmits<{ refresh: [] }>();
const approving = ref<ProposedFeedbackCategoryDto>();
function approved() { approving.value = undefined; emit("refresh"); }
</script>
<template>
  <div class="analysis-report">
    <p class="muted analysis-coverage" role="status">Обработано {{ report.processedCount }} из {{ report.commentCount }} текстовых комментариев · Всего отзывов: {{ report.totalFeedbackCount }}</p>
    <p v-if="report.pendingCount || report.failedCount" class="notice">
      Отчёт неполный: ожидают обработки или обновления — {{ report.pendingCount }}, ошибки — {{ report.failedCount }}.
      Успешно извлечённые сведения показаны ниже; отсутствие сигнала не означает отсутствие проблемы.
      <button class="text-link" @click="emit('refresh')">Обновить отчёт</button>
    </p>
    <p class="summary-text">{{ report.summary }}</p>
    <section aria-label="Сообщения, требующие внимания">
      <h3>Требует внимания · {{ report.signals.length }}</h3>
      <p class="ai-note">Анализ ИИ может содержать неточности. Это сообщения о возможных ситуациях, а не установленные факты. Редкие сообщения сохраняются независимо от общей оценки.</p>
      <FeedbackSignal v-for="signal in report.signals" :key="`${signal.feedbackId}:${signal.signalKey}`" :signal="signal" @saved="emit('refresh')" />
      <p v-if="!report.signals.length" class="muted">В доступных результатах сигналы не выделены.</p>
    </section>
    <section v-if="report.topics.length" aria-label="Темы отзывов">
      <h3>Темы и подтверждающие отзывы</h3>
      <p class="muted">Числа обозначают уникальные отзывы. Один отзыв может содержать несколько тем и противоположные оценки одной темы.</p>
      <details v-for="topic in report.topics" :key="topic.categoryId" class="analysis-topic">
        <summary>{{ topic.name }} · {{ topic.count }} отзывов</summary>
        <p>Положительных: {{ topic.positiveCount }} · Отрицательных: {{ topic.negativeCount }} · Нейтральных: {{ topic.neutralCount }}</p>
        <p v-if="topic.positiveCount && topic.negativeCount" class="muted">По этой теме встречаются противоположные оценки.</p>
        <FeedbackEvidence :evidence="topic.evidence" />
      </details>
    </section>
    <section v-if="report.proposedCategories.length" aria-label="Предложенные категории">
      <h3>Предложения новых категорий</h3>
      <p class="muted">Модель не нашла подходящую категорию. Предложения не добавляются в каталог автоматически.</p>
      <details v-for="proposal in report.proposedCategories" :key="proposal.name" class="analysis-topic">
        <summary>{{ proposal.name }}</summary>
        <p>{{ proposal.description }}</p>
        <FeedbackEvidence :evidence="proposal.evidence" />
        <button v-if="approving !== proposal" class="btn btn--secondary" @click="approving = proposal">Проверить и добавить категорию</button>
        <FeedbackCategoryForm v-else :initial="proposal" @saved="approved" />
      </details>
    </section>
    <p class="ai-note">Проверьте выводы по исходным комментариям. Решение остаётся за человеком.</p>
  </div>
</template>
