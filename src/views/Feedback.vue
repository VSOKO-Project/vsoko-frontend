<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getWorkloadById } from "../api/workload";
import { getCriteria } from "../api/criteria";
import { createFeedback } from "../api/feedback";
import { useResource, useAction } from "../composables/resource";
import {
  allCriteriaRated,
  draftKey,
  readDraft,
  saveDraft,
} from "../utils/drafts";
import { auth } from "../store/auth";
import Rating from "../components/Rating.vue";
import LoadState from "../components/LoadState.vue";
const route = useRoute();
const router = useRouter();
const workloadId = String(route.query.workloadId || "");
const key = draftKey(auth.session?.data.userId || null, workloadId);
const draft = reactive(readDraft(key));
const draftStatus = ref("");
const { data, loading, error, refresh } = useResource(async (signal) => {
  if (!workloadId) throw new Error("Выберите занятие из списка дисциплин.");
  const [workload, criteria] = await Promise.all([
    getWorkloadById(workloadId, signal),
    getCriteria(),
  ]);
  return { workload, criteria };
});
const action = useAction();
const valid = computed(() =>
  allCriteriaRated(data.value?.criteria.map((c) => c.id) || [], draft.grades),
);
function save() {
  draftStatus.value = saveDraft(key, draft)
    ? "Черновик сохранён на этом устройстве"
    : "Не удалось сохранить черновик на устройстве";
}
watch(draft, save, { deep: true });
async function submit() {
  if (!valid.value) return;
  if (
    await action.run(() =>
      createFeedback({
        workloadId,
        comment: draft.comment,
        feedback: data.value!.criteria.map((c) => ({
          criteriaId: c.id,
          grade: draft.grades[c.id]!,
        })),
      }),
    )
  ) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Saved on server. */
    }
    await router.push("/my-feedback");
  }
}
</script>
<template>
  <RouterLink class="text-link back-link" to="/workloads"
    >К занятиям</RouterLink
  >
  <div class="page-header">
    <h1 class="page-title">Оценка занятия</h1>
    <p class="page-subtitle">
      Оцените каждый критерий от 1 до 5. Черновик сохраняется на устройстве.
    </p>
  </div>
  <LoadState skeleton="form" :loading="loading" :error="error" @retry="refresh"
    ><template v-if="data"
      ><div class="card feedback-editor">
        <article class="feedback-context">
          <h2>{{ data.workload.discipline.name }}</h2>
          <p class="muted">
            {{ data.workload.teacher.fullName }} ·
            {{ data.workload.period?.title }}
          </p>
        </article>
        <form @submit.prevent="submit">
          <section
            v-for="kind in ['Teacher', 'Discipline']"
            :key="kind"
            class="criteria-section"
          >
            <h2 class="criteria-section__title">
              {{
                kind === "Teacher"
                  ? "Оценка преподавателя"
                  : "Оценка дисциплины"
              }}
            </h2>
            <div
              v-for="c in data.criteria.filter((c) => c.object === kind)"
              :key="c.id"
              class="criteria-item"
            >
              <span class="criteria-item__name">{{ c.name }}</span><Rating
                :model-value="draft.grades[c.id] || 0"
                :label="c.name"
                @update:model-value="draft.grades[c.id] = $event"
              />
            </div>
          </section>
          <section class="criteria-section">
            <label for="comment" class="criteria-section__title"
              >Комментарий <small class="muted">(необязательно)</small></label
            ><textarea
              id="comment"
              v-model="draft.comment"
              placeholder="Что помогает учиться? Что можно улучшить?"
              rows="4"
            />
          </section>
          <p v-if="!data.criteria.length" class="notice">
            Критерии ещё не настроены. Обратитесь к администратору.
          </p>
          <p v-if="action.error.value" role="alert" class="error-text">
            {{ action.error.value }}
          </p>
          <div class="feedback-actions">
            <button
              type="submit"
              class="btn btn--primary"
              :disabled="!valid || action.pending.value"
            >
              {{
                action.pending.value ? "Отправляем…" : "Отправить оценку"
              }}</button><button
              type="button"
              class="btn btn--secondary"
              @click="save"
            >
              Сохранить черновик</button
            ><span role="status" class="draft-status">{{ draftStatus }}</span>
          </div>
        </form>
      </div></template
    ></LoadState
  >
</template>
