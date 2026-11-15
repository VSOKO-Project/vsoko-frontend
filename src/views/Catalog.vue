<script setup lang="ts">
import ActionIcon from "../components/ActionIcon.vue";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import { computed, reactive, ref, watch } from "vue";
import { getTeachers, renameTeacher, mergeTeachers } from "../api/teachers";
import {
  getDisciplines,
  renameDiscipline,
  mergeDisciplines,
} from "../api/disciplines";
import {
  getCriteria,
  createCriteria,
  updateCriteria,
  deleteCriteria,
} from "../api/criteria";
import { useResource, useAction } from "../composables/resource";
import type { CriteriaObject } from "../types";
import { confirmAction } from "../composables/confirmation";
import AppSelect from "../components/AppSelect.vue";
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
import Modal from "../components/Modal.vue";
const props = defineProps<{ kind: "teachers" | "disciplines" | "criteria"; embedded?: boolean }>();
const page = ref(1);
const query = ref("");
const open = ref(false);
const mergeOpen = ref(false);
const target = ref("");
const title = computed(
  () =>
    ({
      teachers: "Преподаватели",
      disciplines: "Дисциплины",
      criteria: "Критерии оценки",
    })[props.kind],
);
interface Row {
  id: string;
  name: string;
  surname?: string;
  patronymic?: string;
  fullName?: string;
  object?: CriteriaObject;
}
const { data, loading, error, refresh } = useResource(async () => {
  if (props.kind === "criteria") {
    const rows = await getCriteria();
    return { items: rows as Row[], totalPages: 1 };
  }
  const result = await (
    props.kind === "teachers" ? getTeachers : getDisciplines
  )({ Page: page.value, PageSize: DEFAULT_PAGE_SIZE, Query: query.value });
  return { items: result.items as Row[], totalPages: result.totalPages };
}, [page, query]);
watch(query, () => (page.value = 1));
const form = reactive({
  id: "",
  name: "",
  surname: "",
  patronymic: "",
  object: "Teacher" as CriteriaObject,
});
const action = useAction();
function edit(row?: Row) {
  Object.assign(form, {
    id: row?.id || "",
    name: row?.name || "",
    surname: row?.surname || "",
    patronymic: row?.patronymic || "",
    object: row?.object || "Teacher",
  });
  open.value = true;
}
async function save() {
  if (!form.name.trim()) return;
  const ok = await action.run(async () => {
    if (props.kind === "criteria") {
      const payload = { name: form.name.trim(), criteriaObject: form.object };
      if (form.id) await updateCriteria({ id: form.id, ...payload });
      else await createCriteria(payload);
    } else if (props.kind === "teachers")
      await renameTeacher(form.id, {
        name: form.name.trim(),
        surname: form.surname.trim(),
        patronymic: form.patronymic.trim(),
      });
    else await renameDiscipline(form.id, form.name.trim());
  }, "Изменения сохранены");
  if (ok) {
    open.value = false;
    await refresh();
  }
}
async function remove(row: Row) {
  if (
    (await confirmAction({
      title: "Удалить критерий?",
      description: `Критерий «${row.name}» будет удалён.`,
      confirmText: "Удалить",
      danger: true,
    })) &&
    (await action.run(() => deleteCriteria(row.id), "Критерий удалён"))
  )
    await refresh();
}
const mergeQuery = ref("");
const mergeSearch = ref("");
watch(mergeQuery, (value, _old, cleanup) => {
  const timer = setTimeout(() => {
    mergeSearch.value = value.trim();
  }, 200);
  cleanup(() => clearTimeout(timer));
});
const mergeResults = useResource(async () => {
  if (!mergeOpen.value) return [] as Row[];
  const result = await (
    props.kind === "teachers" ? getTeachers : getDisciplines
  )({ Page: 1, PageSize: 100, Query: mergeSearch.value });
  return (result.items as Row[]).filter((row) => row.id !== form.id);
}, [mergeOpen, mergeSearch]);
function startMerge(row: Row) {
  edit(row);
  open.value = false;
  mergeOpen.value = true;
  target.value = "";
  mergeQuery.value = "";
  mergeSearch.value = "";
}
async function merge() {
  if (
    !target.value ||
    !(await confirmAction({
      title: "Объединить записи?",
      description:
        "Нагрузка и отзывы исходной записи перейдут к выбранной записи. Исходная запись будет удалена.",
      confirmText: "Объединить",
      danger: true,
    }))
  )
    return;
  if (
    await action.run(
      () =>
        (props.kind === "teachers" ? mergeTeachers : mergeDisciplines)(
          form.id,
          target.value,
        ),
      "Записи объединены",
    )
  ) {
    mergeOpen.value = false;
    await refresh();
  }
}
</script>
<template>
  <div v-if="!embedded" class="page-header">
    <h1 class="page-title">{{ title }}</h1>
    <p class="page-subtitle">
      {{
        kind === "criteria"
          ? "Критерии для оценки преподавания и дисциплин"
          : "Справочник записей. Новые данные добавляются при импорте нагрузки."
      }}
    </p>
  </div>
  <div class="toolbar">
    <input
      v-if="kind !== 'criteria'"
      v-model="query"
      type="search"
      aria-label="Поиск"
      placeholder="Найти запись…"
    /><button v-else class="btn btn--primary" @click="edit()">
      Добавить критерий
    </button>
  </div>
  <p v-if="action.success.value" role="status" class="notice">
    {{ action.success.value }}
  </p>
  <p
    v-if="action.error.value && !open && !mergeOpen"
    role="alert"
    class="error-text"
  >
    {{ action.error.value }}
  </p>
  <LoadState
    skeleton="table"
    :loading="loading"
    :error="error"
    :empty="!data?.items.length"
    @retry="refresh"
    ><div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th v-if="kind === 'criteria'">Тип</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data?.items" :key="row.id">
            <td>{{ row.fullName || row.name }}</td>
            <td v-if="kind === 'criteria'">
              <span class="badge">{{
                row.object === "Teacher" ? "Преподаватель" : "Дисциплина"
              }}</span>
            </td>
            <td>
              <div class="table-actions">
                <button
                  class="action-icon-button"
                  :title="`Редактировать: ${row.fullName || row.name}`"
                  :aria-label="`Редактировать: ${row.fullName || row.name}`"
                  @click="edit(row)"
                >
                  <ActionIcon name="edit" /></button
                ><button
                  v-if="kind === 'criteria'"
                  class="action-icon-button action-icon-button--danger"
                  :aria-label="`Удалить: ${row.name}`"
                  :title="`Удалить: ${row.name}`"
                  :disabled="action.pending.value"
                  @click="remove(row)"
                >
                  <ActionIcon name="delete" /></button
                ><button v-else class="action-icon-button" :aria-label="`Объединить: ${row.fullName || row.name}`" :title="`Объединить: ${row.fullName || row.name}`" @click="startMerge(row)">
                  <ActionIcon name="merge" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination v-model:page="page" :total="data?.totalPages || 0" /></LoadState
  ><Modal
    :open="open"
    :title="form.id ? 'Редактировать запись' : 'Новый критерий'"
    @close="open = false"
    ><form class="stack" @submit.prevent="save">
      <label v-if="kind === 'teachers'" class="field"
        >Фамилия<input v-model="form.surname" required /></label
      ><label class="field"
        >{{ kind === "teachers" ? "Имя" : "Название"
        }}<input v-model="form.name" required /></label
      ><label v-if="kind === 'teachers'" class="field"
        >Отчество<input v-model="form.patronymic" /></label
      ><label v-if="kind === 'criteria'" class="field"
        >Тип критерия<AppSelect
          v-model="form.object"
          label="Тип критерия"
          :options="[
            { value: 'Teacher', label: 'Преподаватель' },
            { value: 'Discipline', label: 'Дисциплина' },
          ]"
      /></label>
      <p v-if="action.error.value" role="alert" class="error-text">
        {{ action.error.value }}
      </p>
      <button class="btn btn--primary" :disabled="action.pending.value">
        {{ form.id ? "Сохранить" : "Создать" }}
      </button>
    </form></Modal
  ><Modal
    :open="mergeOpen"
    title="Объединение записей"
    @close="mergeOpen = false"
    ><p class="muted">
      Нагрузка и отзывы исходной записи перейдут к выбранной записи.
    </p>
    <label class="field merge-search"
      >Объединить с записью<input
        v-model="mergeQuery"
        type="search"
        aria-label="Поиск записи для объединения"
        placeholder="Начните вводить название"
    /></label>
    <LoadState
      skeleton="list"
      :loading="mergeResults.loading.value"
      :error="mergeResults.error.value"
      @retry="mergeResults.refresh"
      ><div
        v-if="mergeResults.data.value?.length"
        class="merge-results"
        role="radiogroup"
        aria-label="Оставить запись"
      >
        <label
          v-for="row in mergeResults.data.value"
          :key="row.id"
          class="merge-result"
          :class="{ 'merge-result--selected': target === row.id }"
          ><input
            v-model="target"
            type="radio"
            name="merge-target"
            :value="row.id"
          /><span>{{ row.fullName || row.name }}</span></label
        >
      </div><p v-else class="muted merge-empty">Подходящих записей нет.</p></LoadState
    >
    <p v-if="action.error.value" role="alert" class="error-text">
      {{ action.error.value }}
    </p>
    <button
      class="btn btn--primary"
      :disabled="!target || action.pending.value"
      @click="merge"
    >
      Объединить
    </button></Modal
  >
</template>
