<script setup lang="ts">
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import { ref } from "vue";
import { getFeedbacks, deleteFeedback, updateFeedback } from "../api/feedback";
import { getTeachers } from "../api/teachers";
import { getDisciplines } from "../api/disciplines";
import { getCriteria } from "../api/criteria";
import { useResource, useAction } from "../composables/resource";
import type { FeedbackDto } from "../types";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
import Modal from "../components/Modal.vue";
import Rating from "../components/Rating.vue";
const props = defineProps<{ admin?: boolean }>();
const page = ref(1);
const teacher = ref("");
const discipline = ref("");
const { data, loading, error, refresh } = useResource(
  () =>
    getFeedbacks({
      Page: page.value,
      PageSize: DEFAULT_PAGE_SIZE,
      TeacherId: teacher.value || undefined,
      DisciplineId: discipline.value || undefined,
    }),
  [page, teacher, discipline],
);
const options = useResource(async () =>
  props.admin
    ? {
        teachers: (await getTeachers({ Page: 1, PageSize: 100 }))
          .items,
        disciplines: (
          await getDisciplines({ Page: 1, PageSize: 100 })
        ).items,
      }
    : { teachers: [], disciplines: [] },
);
const criteria = useResource(() => getCriteria());
const selected = ref<FeedbackDto>();
const grades = ref<Record<string, number>>({});
const comment = ref("");
const action = useAction();
function edit(fb: FeedbackDto) {
  selected.value = fb;
  grades.value = Object.fromEntries(
    fb.criteriaFeedback.map((c) => [
      c.criteria.id,
      Math.round(c.criteriaScore),
    ]),
  );
  comment.value = fb.comment || "";
}
async function remove(fb: FeedbackDto) {
  if (
    confirm("Удалить этот отзыв?") &&
    (await action.run(() => deleteFeedback(fb.id), "Отзыв удалён"))
  ) {
    selected.value = undefined;
    await refresh();
  }
}
async function save() {
  if (!selected.value) return;
  if (
    await action.run(
      () =>
        updateFeedback({
          id: selected.value!.id,
          comment: comment.value,
          feedback: (criteria.data.value || []).map((c) => ({
            criteriaId: c.id,
            grade: grades.value[c.id] || 0,
          })),
        }),
      "Оценка обновлена",
    )
  ) {
    selected.value = undefined;
    await refresh();
  }
}
</script>
<template>
  <div class="page-header">
    <span class="eyebrow">ОБРАТНАЯ СВЯЗЬ</span>
    <h1 class="page-title">{{ admin ? "Все отзывы" : "Мои оценки" }}</h1>
    <p class="page-subtitle">
      {{
        admin
          ? "Комментарии и оценки студентов"
          : "История вашего участия. Оценки открытого периода можно изменить."
      }}
    </p>
  </div>
  <div v-if="admin" class="toolbar">
    <select v-model="teacher" aria-label="Преподаватель" @change="page = 1">
      <option value="">Все преподаватели</option>
      <option
        v-for="t in options.data.value?.teachers"
        :key="t.id"
        :value="t.id"
      >
        {{ t.fullName }}
      </option></select
    ><select v-model="discipline" aria-label="Дисциплина" @change="page = 1">
      <option value="">Все дисциплины</option>
      <option
        v-for="d in options.data.value?.disciplines"
        :key="d.id"
        :value="d.id"
      >
        {{ d.name }}
      </option>
    </select>
  </div>
  <p v-if="action.error.value" class="error-text" role="alert">
    {{ action.error.value }}
  </p>
  <p v-if="action.success.value" class="notice" role="status">
    {{ action.success.value }}
  </p>
  <LoadState
    :loading="loading"
    :error="error"
    :empty="!data?.items.length"
    @retry="refresh"
    ><div class="history-list">
      <article v-for="fb in data?.items" :key="fb.id" class="card">
        <div class="history-heading">
          <div>
            <span class="eyebrow">{{
              fb.workload.period?.title || "Без периода"
            }}</span>
            <h2>{{ fb.workload.discipline.name }}</h2>
            <p class="muted">{{ fb.workload.teacher.fullName }}</p>
          </div>
          <span
            class="badge"
            :class="
              fb.workload.period?.isFeedbackOpen
                ? 'badge--warning'
                : 'badge--success'
            "
            >{{
              fb.workload.period?.isFeedbackOpen
                ? "Можно изменить"
                : "Отправлено"
            }}</span
          >
        </div>
        <div
          v-for="c in fb.criteriaFeedback"
          :key="c.criteria.id"
          class="history-criterion"
        >
          <span>{{ c.criteria.name }}</span><Rating
            :model-value="c.criteriaScore"
            :label="c.criteria.name"
            readonly
          />
        </div>
        <blockquote v-if="fb.comment">{{ fb.comment }}</blockquote>
        <div
          class="feedback-actions"
          v-if="admin || fb.workload.period?.isFeedbackOpen"
        >
          <button v-if="!admin" class="btn btn--secondary" @click="edit(fb)">
            Редактировать</button
          ><button
            class="btn btn--ghost"
            :disabled="action.pending.value"
            @click="remove(fb)"
          >
            Удалить
          </button>
        </div>
      </article>
    </div>
    <Pagination v-model:page="page" :total="data?.totalPages || 0" /></LoadState
  ><Modal
    :open="!!selected"
    title="Редактировать оценку"
    @close="selected = undefined"
    ><LoadState
      :loading="criteria.loading.value"
      :error="criteria.error.value"
      @retry="criteria.refresh"
      ><div v-for="c in criteria.data.value" :key="c.id" class="criteria-item">
        <span>{{ c.name }}</span><Rating
          :model-value="grades[c.id] || 0"
          :label="c.name"
          @update:model-value="grades[c.id] = $event"
        />
      </div>
      <label class="field">Комментарий<textarea v-model="comment" /></label>
      <p v-if="action.error.value" role="alert" class="error-text">
        {{ action.error.value }}
      </p>
      <button
        class="btn btn--primary"
        :disabled="
          action.pending.value ||
          !criteria.data.value?.length ||
          criteria.data.value.some((c) => !grades[c.id])
        "
        @click="save"
      >
        Сохранить
      </button></LoadState
    ></Modal
  >
</template>
