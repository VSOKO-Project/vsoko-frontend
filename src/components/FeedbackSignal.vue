<script setup lang="ts">
import { ref, watch } from "vue";
import type { FeedbackSignalDto } from "../types";
import { reviewFeedbackSignal } from "../api/summaries";
import { useAction } from "../composables/resource";
import AppSelect from "./AppSelect.vue";
const props = defineProps<{ signal: FeedbackSignalDto }>();
const emit = defineEmits<{ saved: [] }>();
const status = ref(props.signal.status);
const note = ref(props.signal.note);
const action = useAction();
watch(() => props.signal, signal => { status.value = signal.status; note.value = signal.note; });
const bases = { Personal: "Личный опыт", Hearsay: "Пересказ", Ambiguous: "Неоднозначный контекст" };
const statuses = { Pending: "Ожидает проверки", InReview: "На рассмотрении", Reviewed: "Рассмотрено" };
async function save() {
  if (await action.run(() => reviewFeedbackSignal(props.signal.feedbackId, props.signal.signalKey, { status: status.value, note: note.value }))) emit("saved");
}
</script>
<template>
  <article class="analysis-signal">
    <h4>{{ signal.categoryName }}</h4>
    <p class="muted">{{ bases[signal.basis] }} · {{ statuses[signal.status] }}</p>
    <blockquote>{{ signal.quote }}</blockquote>
    <RouterLink class="text-link" :to="`/feedback/${encodeURIComponent(signal.feedbackId)}`">Открыть отзыв {{ signal.feedbackId }}</RouterLink>
    <details class="analysis-review">
      <summary>Зафиксировать рассмотрение</summary>
      <form @submit.prevent="save">
        <label class="field">Статус<AppSelect v-model="status" label="Статус рассмотрения" :options="Object.entries(statuses).map(([value, label]) => ({ value, label }))" /></label>
        <label class="field">Результат или заметка<textarea v-model="note" rows="3" maxlength="2000" :required="status === 'Reviewed'" /></label>
        <p v-if="action.error.value" class="error-text" role="alert">{{ action.error.value }}</p>
        <button class="btn btn--secondary" :disabled="action.pending.value" type="submit">Сохранить рассмотрение</button>
      </form>
    </details>
  </article>
</template>
