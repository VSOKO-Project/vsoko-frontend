<script setup lang="ts">
import { reactive, watch } from "vue";
import type { FeedbackCategoryDto } from "../types";
import { addFeedbackCategory } from "../api/summaries";
import { useAction } from "../composables/resource";
const props = defineProps<{ initial?: Omit<FeedbackCategoryDto, "id"> }>();
const emit = defineEmits<{ saved: [] }>();
const form = reactive({ name: "", description: "", requiresAttention: false });
watch(() => props.initial, initial => Object.assign(form, initial ?? { name: "", description: "", requiresAttention: false }), { immediate: true });
const action = useAction();
async function save() {
  if (await action.run(() => addFeedbackCategory({ name: form.name.trim(), description: form.description.trim(), requiresAttention: form.requiresAttention })))
    emit("saved");
}
</script>
<template>
  <form class="analysis-category-form" @submit.prevent="save">
    <fieldset :disabled="action.pending.value">
      <label class="field">Название<input v-model="form.name" required maxlength="120" /></label>
      <label class="field">Что относится к категории<textarea v-model="form.description" required maxlength="600" rows="3" /></label>
      <label class="analysis-category-form__checkbox"><input v-model="form.requiresAttention" type="checkbox" /><span>Сообщения требуют отдельной проверки</span></label>
    </fieldset>
    <p class="muted">После добавления категории отзывы будут повторно обработаны в фоне. Проверьте, нет ли похожей категории в каталоге.</p>
    <p v-if="action.error.value" class="error-text" role="alert">{{ action.error.value }}</p>
    <button class="btn btn--primary" :disabled="action.pending.value" type="submit">{{ action.pending.value ? "Сохраняем…" : "Добавить категорию" }}</button>
  </form>
</template>

<style scoped>
.analysis-category-form {
  display: grid;
  gap: 20px;
  max-width: 720px;
}
.analysis-category-form fieldset {
  display: grid;
  gap: 20px;
  border: 0;
  padding: 0;
  min-width: 0;
}
.analysis-category-form textarea {
  width: 100%;
}
.analysis-category-form__checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.6;
  cursor: pointer;
}
.analysis-category-form__checkbox input {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 3px;
  accent-color: var(--color-primary);
}
.analysis-category-form > .muted {
  font-size: 13px;
  line-height: 1.7;
}
.analysis-category-form > .btn {
  justify-self: start;
}
</style>
