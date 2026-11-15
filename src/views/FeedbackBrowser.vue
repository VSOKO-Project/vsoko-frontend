<script setup lang="ts">
import ActionIcon from "../components/ActionIcon.vue";
import { useRoute, useRouter } from "vue-router";
import { periodParams, periodValue } from "../store/period";
import PeriodSelect from "../components/PeriodSelect.vue";
import { computed, reactive, ref, watch } from "vue";
import { getFeedbacks, deleteFeedback } from "../api/feedback";
import { getTeachers, getTeacherById, renameTeacher } from "../api/teachers";
import { getDisciplines, getDisciplineById, renameDiscipline } from "../api/disciplines";
import { useAction, useResource } from "../composables/resource";
import { confirmAction } from "../composables/confirmation";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import type { FeedbackDto, FeedbackSort, PagedResultDto } from "../types";
import AppSelect from "../components/AppSelect.vue";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
import Modal from "../components/Modal.vue";
import Rating from "../components/Rating.vue";
type Kind = "discipline" | "teacher";
const props = defineProps<{ kind: Kind }>();
const kind = computed(() => props.kind);
const route = useRoute();
const router = useRouter();
const targetId = typeof route.query.targetId === 'string' ? route.query.targetId : '';
if (typeof route.query.period === "string") periodValue.value = route.query.period;
watch(() => route.query.period, value => {
  if (typeof value === "string") periodValue.value = value;
});
const record = useResource(async signal => {
  if (!targetId) return null;
  const item = await (kind.value === 'teacher' ? getTeacherById : getDisciplineById)(targetId, signal);
  return { item, id: item.id, name: 'fullName' in item && typeof item.fullName === 'string' ? item.fullName : item.name, kind: kind.value };
});
function changePeriod(value: string) { void router.replace({ path: route.path, query: { ...route.query, period: value } }); }
const search = ref("");
const query = ref("");
const directoryPage = ref(1);
const target = ref<{ id: string; name: string; kind: Kind }>();
watch(record.data, value => { if (value) target.value = value; });
const page = ref(1);
const sort = ref<FeedbackSort>("Newest");
watch(search, (value, _old, cleanup) => {
  const timer = setTimeout(() => {
    query.value = value.trim();
    directoryPage.value = 1;
  }, 200);
  cleanup(() => clearTimeout(timer));
});
watch(periodValue, () => { directoryPage.value = 1; });
const directory = useResource(async (signal) => {
  if (targetId) return { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE };
  const params = {
    Page: directoryPage.value,
    PageSize: DEFAULT_PAGE_SIZE,
    Query: query.value,
    ...periodParams.value,
  };
  if (kind.value === "teacher") {
    const result = await getTeachers(params, signal);
    return {
      ...result,
      items: result.items.map((t) => ({ id: t.id, name: t.fullName })),
    };
  }
  return getDisciplines(params, signal);
}, [kind, query, directoryPage, periodValue]);
const feedback = useResource<PagedResultDto<FeedbackDto>>(
  (signal) =>
    target.value
      ? getFeedbacks(
          {
            Page: page.value,
            PageSize: DEFAULT_PAGE_SIZE,
            Sort: sort.value,
            ...periodParams.value,
            ...(target.value.kind === "teacher"
              ? { TeacherId: target.value.id }
              : { DisciplineId: target.value.id }),
          },
          signal,
        )
      : Promise.resolve({
          items: [],
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          totalPages: 0,
          totalCount: 0,
        }),
  [target, page, sort, periodValue],
);
watch([sort, periodValue], () => {
  page.value = 1;
});
function choose(item: { id: string; name: string }) {
  void router.push({ path: route.path, query: { ...route.query, tab: 'feedback', targetId: item.id, period: periodValue.value } });
}
function changeTarget() {
  const { targetId: _id, ...query } = route.query;
  void router.push({ path: route.path, query });
}
const editing = ref(false);
const editAction = useAction();
const editTitle = computed(() => kind.value === 'teacher' ? 'Редактировать преподавателя' : 'Редактировать дисциплину');
const form = reactive({ name: '', surname: '', patronymic: '' });
function startEdit() {
  const item = record.data.value?.item;
  if (!item) return;
  form.name = item.name;
  form.surname = 'surname' in item ? String(item.surname) : '';
  form.patronymic = 'patronymic' in item ? String(item.patronymic) : '';
  editAction.error.value = '';
  editing.value = true;
}
async function saveRecord() {
  if (!target.value || !form.name.trim() || (kind.value === 'teacher' && !form.surname.trim())) return;
  await editAction.run(async () => {
    const item = kind.value === 'teacher'
      ? await renameTeacher(target.value!.id, { name: form.name.trim(), surname: form.surname.trim(), patronymic: form.patronymic.trim() })
      : await renameDiscipline(target.value!.id, form.name.trim());
    record.data.value = { item, id: item.id, name: 'fullName' in item && typeof item.fullName === 'string' ? item.fullName : item.name, kind: kind.value };
    editing.value = false;
  });
}
const action = useAction();
async function remove(item: FeedbackDto) {
  if (
    (await confirmAction({
      title: "Удалить отзыв?",
      description: "Отзыв и выставленные в нём оценки будут удалены.",
      confirmText: "Удалить",
      danger: true,
    })) &&
    (await action.run(() => deleteFeedback(item.id), "Отзыв удалён"))
  )
    await feedback.refresh();
}
function average(item: FeedbackDto) {
  if (
    typeof item.averageGrade === "number" &&
    Number.isFinite(item.averageGrade)
  )
    return item.averageGrade;
  const scores = item.criteriaFeedback.map((c) => c.criteriaScore);
  return scores.length
    ? scores.reduce((sum, value) => sum + value, 0) / scores.length
    : null;
}
function date(item: FeedbackDto) {
  if (!item.createdAtUtc) return "Дата не указана";
  const value = new Date(item.createdAtUtc);
  return Number.isNaN(value.getTime())
    ? "Дата не указана"
    : value.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
const sortOptions = [
  { value: "Newest", label: "Сначала новые" },
  { value: "Oldest", label: "Сначала старые" },
  { value: "GradeDesc", label: "Сначала высокая оценка" },
  { value: "GradeAsc", label: "Сначала низкая оценка" },
];
</script>
<template>
  <LoadState skeleton="cards" :loading="!!targetId && record.loading.value" :error="record.error.value" @retry="record.refresh">
  <template v-if="!target">
      <div class="toolbar"><input
        v-model="search"
        type="search"
        :aria-label="
          kind === 'teacher'
            ? 'Поиск преподавателя для отзывов'
            : 'Поиск дисциплины для отзывов'
        "
        :placeholder="
          kind === 'teacher' ? 'Найти преподавателя…' : 'Найти дисциплину…'
        "
      /><PeriodSelect @change="changePeriod" /></div>
      <LoadState
        skeleton="table"
        :loading="directory.loading.value"
        :error="directory.error.value"
        :empty="!directory.data.value?.items.length"
        @retry="directory.refresh"
        ><div class="table-wrapper feedback-targets">
          <table>
            <thead><tr><th>{{ kind === 'teacher' ? 'Преподаватель' : 'Дисциплина' }}</th></tr></thead>
            <tbody><tr v-for="item in directory.data.value?.items" :key="item.id"><td>
              <button class="text-link feedback-target" @click="choose(item)">{{ item.name }}</button>
            </td></tr></tbody>
          </table>
        </div>
        <Pagination
          v-model:page="directoryPage"
          :total="directory.data.value?.totalPages || 0"
      /></LoadState></template>
  <template v-else
    ><button class="text-link back-link" @click="changeTarget">{{ kind === 'teacher' ? 'К списку преподавателей' : 'К списку дисциплин' }}</button>
    <section class="feedback-selection">
      <div>
        <span class="muted">{{
          target.kind === "teacher" ? "Преподаватель" : "Дисциплина"
        }}</span>
        <div class="feedback-name"><h2>{{ target.name }}</h2><button class="action-icon-button" :aria-label="editTitle" :title="editTitle" @click="startEdit"><ActionIcon name="edit" /></button></div>
      </div>
      <div class="feedback-sorting">
        <PeriodSelect @change="changePeriod" />
        <AppSelect
          v-model="sort"
          label="Сортировка отзывов"
          :options="sortOptions"
        />
      </div>
    </section>
    <p v-if="action.error.value" class="error-text" role="alert">
      {{ action.error.value }}
    </p>
    <p v-if="action.success.value" class="notice" role="status">
      {{ action.success.value }}
    </p>
    <LoadState
      skeleton="cards"
      :loading="feedback.loading.value"
      :error="feedback.error.value"
      :empty="!feedback.data.value?.items.length"
      @retry="feedback.refresh"
      ><div class="history-list">
        <article
          v-for="item in feedback.data.value?.items"
          :key="item.id"
          class="card review-card"
        >
          <div class="history-heading">
            <div>
              <h2>{{ item.workload.discipline.name }}</h2>
              <p class="muted">{{ item.workload.teacher.fullName }}</p>
              <p class="review-meta">
                {{ item.workload.period?.title }} · {{ date(item) }}
              </p>
            </div>
            <div class="review-average">
              <span>Средняя оценка</span
              ><strong
                >{{
                  average(item)?.toLocaleString("ru-RU", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }) || "—"
                }}<small> / 5</small></strong
              >
            </div>
          </div>
          <blockquote v-if="item.comment">{{ item.comment }}</blockquote>
          <p v-else class="muted">Комментарий не оставлен</p>
          <details class="review-criteria">
            <summary>Оценки по критериям</summary>
            <div
              v-for="criterion in item.criteriaFeedback"
              :key="criterion.criteria.id"
              class="history-criterion"
            >
              <span>{{ criterion.criteria.name }}</span><Rating
                :model-value="criterion.criteriaScore"
                :label="criterion.criteria.name"
                readonly
              />
            </div>
          </details>
          <div class="review-actions">
            <button
              class="action-icon-button action-icon-button--danger"
              :aria-label="`Удалить отзыв: ${item.workload.discipline.name}`" title="Удалить отзыв"
              :disabled="action.pending.value"
              @click="remove(item)"
            >
              <ActionIcon name="delete" />
            </button>
          </div>
        </article>
      </div>
      <div class="results-footer">
        <span class="muted">Всего отзывов: {{ feedback.data.value?.totalCount.toLocaleString('ru-RU') }}</span>
        <Pagination v-model:page="page" :total="feedback.data.value?.totalPages || 0" />
      </div></LoadState
  ></template>
  </LoadState>
  <Modal :open="editing" :title="editTitle" @close="editing = false">
    <form class="feedback-record-form" @submit.prevent="saveRecord">
      <fieldset :disabled="editAction.pending.value">
        <label v-if="kind === 'teacher'" class="field">Фамилия<input v-model="form.surname" required /></label>
        <label class="field">{{ kind === 'teacher' ? 'Имя' : 'Название' }}<input v-model="form.name" required /></label>
        <label v-if="kind === 'teacher'" class="field">Отчество<input v-model="form.patronymic" /></label>
      </fieldset>
      <p v-if="editAction.error.value" class="error-text" role="alert">{{ editAction.error.value }}</p>
      <button class="btn btn--primary" :disabled="editAction.pending.value" type="submit">{{ editAction.pending.value ? 'Сохраняем…' : 'Сохранить' }}</button>
    </form>
  </Modal>
</template>
