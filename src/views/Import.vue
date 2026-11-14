<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getSuggestedPeriods } from "../api/periods";
import {
  applyImport,
  previewImport,
  getImportGroups,
  getPeriodTeachers,
  downloadCredentials,
  downloadImportTemplate,
  exportPeriod,
  getImportErrorReport,
} from "../api/import";
import { useResource, useAction } from "../composables/resource";
import { saveBlob } from "../utils/download";
import type { ImportReportDto, Term } from "../types";
import { confirmAction } from "../composables/confirmation";
import AppSelect from "../components/AppSelect.vue";
import LoadState from "../components/LoadState.vue";
const periodKey = ref("");
const file = ref<File>();
const fileInput = ref<HTMLInputElement>();
const fileSize = computed(() =>
  file.value
    ? `${Math.max(1, Math.ceil(file.value.size / 1024)).toLocaleString("ru-RU")} КБ`
    : "",
);
const fileVersion = ref(0);
const fileError = ref("");
const applied = ref<ImportReportDto>();
const applyReport = ref<ImportReportDto>();
const dragging = ref(false);
const groupIds = ref<string[]>([]);
const teacherIds = ref<string[]>([]);
const teacherSearch = ref("");
const action = useAction();
const downloads = useAction();
const periods = useResource((signal) => getSuggestedPeriods(signal));
const groups = useResource((signal) => getImportGroups(signal));
watch(periods.data, (items) => {
  if (!periodKey.value && items?.length) {
    const current = items.find((p) => p.isCurrent) || items[0]!;
    periodKey.value = `${current.startYear}:${current.term}`;
  }
});
const selected = computed(() =>
  periods.data.value?.find(
    (p) => `${p.startYear}:${p.term}` === periodKey.value,
  ),
);
const params = computed(() => {
  const [year, term] = periodKey.value.split(":");
  return { startYear: Number(year), term: term as Term };
});
const teachers = useResource(
  (signal) =>
    selected.value?.exists
      ? getPeriodTeachers(params.value, signal)
      : Promise.resolve([]),
  [periodKey, () => selected.value?.exists],
);
const preview = useResource(
  async (signal) => {
    if (!file.value || !periodKey.value) return undefined;
    const sourceFile = file.value;
    const sourcePeriod = periodKey.value;
    const result = await previewImport(
      { file: sourceFile, ...params.value },
      signal,
    );
    return { report: result, file: sourceFile, period: sourcePeriod };
  },
  [periodKey, fileVersion],
);
watch(periodKey, () => {
  teacherIds.value = [];
  applyReport.value = undefined;
  applied.value = undefined;
});
const report = computed(
  () =>
    applyReport.value ||
    (preview.data.value?.file === file.value &&
    preview.data.value?.period === periodKey.value
      ? preview.data.value?.report
      : undefined),
);
const labels: Record<keyof ImportReportDto["summary"], string> = {
  groups: "Группы",
  students: "Студенты",
  teachers: "Преподаватели",
  disciplines: "Дисциплины",
  workloads: "Нагрузка",
};
function selectFile(value?: File) {
  if (!value) return;
  fileError.value = "";
  if (!value.name.toLowerCase().endsWith(".xlsx")) {
    fileError.value = "Принимается только файл .xlsx";
    return;
  }
  if (value.size > 5 * 1024 * 1024) {
    fileError.value = "Файл больше 5 МБ";
    return;
  }
  file.value = value;
  fileVersion.value++;
  applied.value = undefined;
  applyReport.value = undefined;
}
function fileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectFile(input.files?.[0]);
  input.value = "";
}
function leaveDropzone(event: DragEvent) {
  if (
    !(event.relatedTarget instanceof Node) ||
    !(event.currentTarget as HTMLElement).contains(event.relatedTarget)
  )
    dragging.value = false;
}
function drop(event: DragEvent) {
  dragging.value = false;
  if (!action.pending.value) selectFile(event.dataTransfer?.files[0]);
}
async function apply() {
  if (
    !file.value ||
    !report.value ||
    report.value.errors.length ||
    preview.loading.value ||
    preview.refreshing.value
  )
    return;
  const chosenFile = file.value;
  const chosenPeriod = { ...params.value };
  if (
    !(await confirmAction({
      title: "Импортировать данные?",
      description: `Семестр: ${report.value.period.title}.${report.value.workloadsToDelete.length ? ` Будет удалено нагрузок: ${report.value.workloadsToDelete.length}.` : ""}`,
      confirmText: "Импортировать",
      danger: report.value.workloadsToDelete.length > 0,
    }))
  )
    return;
  const ok = await action.run(async () => {
    try {
      applied.value = await applyImport({ file: chosenFile, ...chosenPeriod });
    } catch (error) {
      applyReport.value = getImportErrorReport(error) || undefined;
      throw error;
    }
  }, "Импорт выполнен");
  if (ok) {
    file.value = undefined;
    fileVersion.value++;
    await Promise.all([
      periods.refresh(),
      groups.refresh(),
      teachers.refresh(),
    ]);
  }
}
async function download(
  kind: "template" | "period" | "credentials",
  ids = groupIds.value,
) {
  await downloads.run(async () => {
    const blob =
      kind === "template"
        ? await downloadImportTemplate()
        : kind === "period"
          ? await exportPeriod(params.value, teacherIds.value)
          : await downloadCredentials(ids);
    saveBlob(
      blob,
      kind === "template"
        ? "vsoko-import-template.xlsx"
        : kind === "period"
          ? `vsoko-${params.value.startYear}-${params.value.term}.xlsx`
          : "vsoko-credentials.xlsx",
    );
  });
}
</script>
<template>
  <div class="page-header">
    <h1 class="page-title">Импорт</h1>
    <p class="page-subtitle">
      Загрузка студентов и нагрузки из Excel с проверкой перед сохранением.
    </p>
  </div>
  <p
    v-if="downloads.error.value || action.error.value"
    role="alert"
    class="error-text"
  >
    {{ downloads.error.value || action.error.value }}
  </p>
  <fieldset :disabled="action.pending.value" class="import-fieldset">
    <section class="card stack">
      <h2>1. Семестр и файл</h2>
      <p class="muted">
        Скачайте нагрузку семестра, внесите изменения в Excel и загрузите
        обратно. Новые строки добавятся, удалённые уберутся. Нагрузка с отзывами
        не удаляется.
      </p>
      <LoadState
        skeleton="form"
        :loading="periods.loading.value"
        :error="periods.error.value"
        @retry="periods.refresh"
        ><label class="field"
          >Семестр<AppSelect
            v-model="periodKey"
            label="Семестр"
            :disabled="action.pending.value"
            :options="[
              { value: '', label: 'Выберите семестр', disabled: true },
              ...(periods.data.value || []).map((p) => ({
                value: `${p.startYear}:${p.term}`,
                label: `${p.title}${p.isCurrent ? ' · текущий' : ''}${!p.exists ? ' (будет создан)' : ''}`,
              })),
            ]" /></label
      ></LoadState>
      <details v-if="selected?.exists && teachers.data.value?.length">
        <summary>
          Выбрать преподавателей для выгрузки ({{ teacherIds.length || "все" }})
        </summary>
        <input
          v-model="teacherSearch"
          type="search"
          aria-label="Поиск преподавателей для выгрузки"
          placeholder="Поиск по ФИО"
        />
        <div class="group-picker">
          <label
            v-for="t in teachers.data.value.filter((t) =>
              t.fullName.toLowerCase().includes(teacherSearch.toLowerCase()),
            )"
            :key="t.id"
            ><input v-model="teacherIds" type="checkbox" :value="t.id" />{{
              t.fullName
            }}</label
          >
        </div>
        <button class="text-link" @click="teacherIds = []">
          Сбросить выбор
        </button>
      </details>
      <div class="feedback-actions">
        <button
          v-if="selected?.exists"
          class="btn btn--primary"
          :disabled="downloads.pending.value"
          @click="download('period')"
        >
          Скачать данные семестра</button
        ><button
          class="btn btn--secondary"
          :disabled="downloads.pending.value"
          @click="download('template')"
        >
          Пустой шаблон
        </button>
      </div>
    </section>
    <section class="card stack">
      <h2>2. Загрузка файла</h2>
      <p class="muted">
        Сначала файл проверяется. Данные сохранятся после нажатия
        «Импортировать».
      </p>
      <div
        class="file-upload"
        :class="{
          'file-upload--active': dragging,
          'file-upload--error': fileError,
        }"
        @dragover.prevent="dragging = !action.pending.value"
        @dragleave="leaveDropzone"
        @drop.prevent="drop"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Файл для импорта"
          :disabled="action.pending.value"
          hidden
          @change="fileChange"
        />
        <svg
          class="file-upload__icon"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path
            d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"
          />
        </svg>
        <div class="file-upload__copy">
          <strong>{{
            dragging ? "Отпустите файл здесь" : "Перетащите Excel-файл сюда"
          }}</strong
          ><span>Формат .xlsx · до 5 МБ</span>
        </div>
        <button
          type="button"
          class="btn btn--secondary"
          @click="fileInput?.click()"
        >
          {{ file ? "Заменить файл" : "Выбрать файл" }}
        </button>
      </div>
      <div v-if="file" class="uploaded-file" aria-live="polite">
        <span class="uploaded-file__type" aria-hidden="true">XLSX</span>
        <div class="uploaded-file__info">
          <strong>{{ file.name }}</strong
          ><span>{{ fileSize }}</span>
        </div>
      </div>
      <p v-if="fileError" class="error-text" role="alert">{{ fileError }}</p>
    </section>
    <section v-if="file" class="card stack">
      <h2>3. Проверка</h2>
      <LoadState
        skeleton="cards"
        :loading="preview.loading.value || preview.refreshing.value"
        :error="preview.error.value"
        @retry="preview.refresh"
        ><template v-if="report"
          ><p class="muted">
            Период: {{ report.period.title
            }}{{
              report.period.willBeCreated ? " — будет создан, сбор закрыт" : ""
            }}
          </p>
          <div class="import-summary">
            <div
              v-for="(counts, key) in report.summary"
              :key="key"
              class="import-summary__card"
            >
              <span>{{ labels[key] }}</span>
              <div>
                <strong>{{ counts.create }}</strong> создать ·
                {{ counts.existing }} уже есть
                <span v-if="counts.delete">· {{ counts.delete }} удалить</span>
              </div>
            </div>
          </div>
          <div v-if="report.workloadsToDelete.length" class="table-wrapper">
            <table>
              <caption>
                Будет удалено из нагрузки:
                {{
                  report.workloadsToDelete.length
                }}
              </caption>
              <thead>
                <tr>
                  <th>Преподаватель</th>
                  <th>Дисциплина</th>
                  <th>Группа</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(w, i) in report.workloadsToDelete" :key="i">
                  <td>{{ w.teacher }}</td>
                  <td>{{ w.discipline }}</td>
                  <td>{{ w.group }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-for="kind in ['errors', 'warnings'] as const" :key="kind">
            <div v-if="report[kind].length" class="table-wrapper">
              <table>
                <caption>
                  {{
                    kind === "errors" ? "Ошибки" : "Предупреждения"
                  }}:
                  {{
                    report[kind].length
                  }}
                </caption>
                <thead>
                  <tr>
                    <th>Лист</th>
                    <th>Строка</th>
                    <th>Сообщение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(issue, i) in report[kind]" :key="i">
                    <td>{{ issue.sheet }}</td>
                    <td>{{ issue.row }}</td>
                    <td>{{ issue.message }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p v-if="report.errors.length" class="error-text">
            Исправьте ошибки и загрузите файл снова.
          </p>
          <button
            class="btn btn--primary"
            :disabled="
              !!report.errors.length ||
              preview.loading.value ||
              preview.refreshing.value ||
              !periodKey
            "
            @click="apply"
          >
            {{ action.pending.value ? "Импортируем…" : "Импортировать" }}
          </button></template
        ></LoadState
      >
    </section>
  </fieldset>
  <section v-if="applied" class="card stack">
    <h2>Импорт выполнен</h2>
    <p>{{ applied.period.title }}</p>
    <button
      v-if="applied.studentGroupIds?.length"
      class="btn btn--secondary"
      :disabled="downloads.pending.value"
      @click="download('credentials', applied.studentGroupIds)"
    >
      Скачать логины и пароли
    </button>
  </section>
  <section class="card stack">
    <h2>Логины и пароли</h2>
    <p class="muted">
      Логин — номер зачётки, временный пароль — Vsoko и номер зачётки. В
      выгрузке у сменивших пароль студентов пароль не показывается. Без выбора
      выгружаются все группы.
    </p>
    <LoadState
      skeleton="form"
      :loading="groups.loading.value"
      :error="groups.error.value"
      @retry="groups.refresh"
      ><div class="group-picker">
        <label v-for="g in groups.data.value" :key="g.id"
          ><input v-model="groupIds" type="checkbox" :value="g.id" />{{
            g.name
          }}</label
        >
      </div>
      <button
        class="btn btn--secondary"
        :disabled="downloads.pending.value"
        @click="download('credentials')"
      >
        {{
          groupIds.length
            ? `Скачать (${groupIds.length})`
            : "Скачать для всех групп"
        }}
      </button></LoadState
    >
  </section>
</template>
