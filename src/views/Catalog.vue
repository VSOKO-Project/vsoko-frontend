<script setup lang="ts">
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
import LoadState from "../components/LoadState.vue";
import Pagination from "../components/Pagination.vue";
import Modal from "../components/Modal.vue";
const props = defineProps<{ kind: "teachers" | "disciplines" | "criteria" }>();
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
    confirm(`Удалить критерий «${row.name}»?`) &&
    (await action.run(() => deleteCriteria(row.id), "Критерий удалён"))
  )
    await refresh();
}
const mergeOptions = ref<Row[]>([]);
const mergeQuery = ref("");
async function startMerge(row: Row) {
  edit(row);
  open.value = false;
  mergeOpen.value = true;
  target.value = "";
  await searchMerge();
}
async function searchMerge() {
  await action.run(async () => {
    const result = await (
      props.kind === "teachers" ? getTeachers : getDisciplines
    )({ Page: 1, PageSize: 100, Query: mergeQuery.value });
    mergeOptions.value = result.items.filter((row) => row.id !== form.id);
  });
}
async function merge() {
  if (
    !target.value ||
    !confirm(
      "Объединить записи? Нагрузка и отзывы перейдут к выбранной записи.",
    )
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
  <div class="page-header">
    <span class="eyebrow">УПРАВЛЕНИЕ ДАННЫМИ</span>
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
                  class="text-link"
                  :aria-label="`Редактировать: ${row.fullName || row.name}`"
                  @click="edit(row)"
                >
                  Изменить</button
                ><button
                  v-if="kind === 'criteria'"
                  class="text-link danger"
                  :disabled="action.pending.value"
                  @click="remove(row)"
                >
                  Удалить</button
                ><button v-else class="text-link" @click="startMerge(row)">
                  Объединить
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
        >Тип критерия<select v-model="form.object">
          <option value="Teacher">Преподаватель</option>
          <option value="Discipline">Дисциплина</option>
        </select></label
      >
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
    <form class="toolbar" @submit.prevent="searchMerge">
      <input
        v-model="mergeQuery"
        aria-label="Поиск записи для объединения"
        placeholder="Поиск…"
      /><button class="btn btn--secondary" :disabled="action.pending.value">
        Найти
      </button>
    </form>
    <label class="field"
      >Оставить запись<select v-model="target">
        <option value="">Выберите запись</option>
        <option v-for="row in mergeOptions" :key="row.id" :value="row.id">
          {{ row.fullName || row.name }}
        </option>
      </select></label
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
