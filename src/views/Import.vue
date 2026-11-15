<script setup lang="ts">
import MultiSelectPicker from "../components/MultiSelectPicker.vue";
import PageHeader from "../components/PageHeader.vue";
import { ref, computed, watch } from "vue";
import { getSuggestedPeriods } from "../api/periods";
import {
  applyImport,
  previewImport,
  getPeriodTeachers,
  downloadCredentials,
  downloadImportTemplate,
  exportPeriod,
  getImportErrorReport,
} from "../api/import";
import { useResource, useAction } from "../composables/resource";
import { saveBlob } from "../utils/download";
import type { ImportMode, ImportReportDto, Term } from "../types";
import { getApiErrorMessage } from "../api/errors";
import { confirmAction } from "../composables/confirmation";
import AppSelect from "../components/AppSelect.vue";
import LoadState from "../components/LoadState.vue";
import ImportReport from "../components/ImportReport.vue";
const periodKey = ref("");
const mode = ref<ImportMode>("AddOnly");
const previewError = ref("");
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
const teacherIds = ref<string[]>([]);
const action = useAction();
const downloads = useAction();
const periods = useResource((signal) => getSuggestedPeriods(signal));
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
    const sourceMode = mode.value;
    previewError.value = "";
    try {
      const result = await previewImport(
        { file: sourceFile, ...params.value, mode: sourceMode }, signal,
      );
      return { report: result, file: sourceFile, period: sourcePeriod, mode: sourceMode };
    } catch (error) {
      if (!signal.aborted) previewError.value = getApiErrorMessage(error, "Не удалось проверить файл. Повторите проверку.");
      throw error;
    }
  },
  [periodKey, fileVersion, mode],
);
watch([periodKey, mode], () => {
  applyReport.value = undefined;
  applied.value = undefined;
  action.error.value = "";
});
watch(periodKey, () => { teacherIds.value = []; });
const report = computed(
  () =>
    applyReport.value ||
    (preview.data.value?.file === file.value &&
    preview.data.value?.period === periodKey.value && preview.data.value?.mode === mode.value
      ? preview.data.value?.report
      : undefined),
);
const modeLabels: Record<ImportMode, string> = { AddOnly: "Добавить данные", UpdateExisting: "Добавить и обновить", SynchronizeWorkloads: "Синхронизировать нагрузку" };
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
  if (!value.size) { fileError.value = "Файл пустой"; return; }
  file.value = value;
  fileVersion.value++;
  applied.value = undefined;
  applyReport.value = undefined;
  action.error.value = "";
}
function clearFile() {
  file.value = undefined;
  fileVersion.value++;
  fileError.value = "";
  previewError.value = "";
  applyReport.value = undefined;
  action.error.value = "";
}
async function retryPreview() {
  applyReport.value = undefined;
  action.error.value = "";
  await preview.refresh();
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
    fileError.value || previewError.value ||
    !report.value ||
    !report.value.previewToken ||
    report.value.errors.length ||
    preview.loading.value ||
    preview.refreshing.value
  )
    return;
  const chosenFile = file.value;
  const chosenPeriod = { ...params.value };
  const chosenMode = mode.value;
  const chosenReport = report.value;
  if (
    !(await confirmAction({
      title: "Импортировать данные?",
      description: `Семестр: ${chosenReport.period.title}. ${modeLabels[chosenMode]}. Изменений полей: ${chosenReport.changes.length}.${chosenReport.workloadsToDelete.length ? ` Будет удалено нагрузок: ${chosenReport.workloadsToDelete.length}.` : ""}${chosenReport.changes.some(c => c.entity !== 'Студент') ? " Переименования действуют во всех семестрах." : ""}`,
      confirmText: "Импортировать",
      danger: report.value.workloadsToDelete.length > 0,
    }))
  )
    return;
  const ok = await action.run(async () => {
    try {
      applied.value = await applyImport({ file: chosenFile, ...chosenPeriod, mode: chosenMode, previewToken: chosenReport.previewToken });
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
      teachers.refresh(),
    ]);
  }
}
async function download(
  kind: "template" | "period" | "credentials",
  ids: string[] = [],
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
  <PageHeader title="Импорт">Загрузка студентов и нагрузки из Excel с проверкой перед сохранением.</PageHeader>
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
        Для первой загрузки заполните пустой шаблон. Для исправлений скачайте данные
        семестра и сохраните колонки ID. Новые строки добавляйте с пустыми ID.
      </p>
      <LoadState
        skeleton="field"
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
      <MultiSelectPicker v-if="selected?.exists && teachers.data.value?.length"
        :key="periodKey" v-model="teacherIds"
        :options="teachers.data.value.map(teacher => ({ id: teacher.id, label: teacher.fullName }))"
        label="Преподаватели для выгрузки" search-label="Поиск преподавателей для выгрузки"
        search-placeholder="Поиск по ФИО" empty-message="Преподаватели не найдены. Попробуйте другое ФИО."
        :disabled="downloads.pending.value || action.pending.value" />
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
      <label class="field">Что сделать с данными<AppSelect v-model="mode" label="Режим импорта"
        :options="Object.entries(modeLabels).map(([value, label]) => ({ value, label }))" /></label>
      <p class="muted" v-if="mode === 'AddOnly'">Добавятся только новые записи. Существующие ФИО, группы и нагрузка сохранятся. Изменения существующих записей будут отмечены в предупреждениях.</p>
      <p class="muted" v-else-if="mode === 'UpdateExisting'">Добавятся новые записи, обновятся ФИО и группы студентов по номеру зачётки. Номер зачётки определяет учётную запись: его изменение создаст нового студента. Преподаватели и дисциплины обновятся по ID из выгрузки. Удалений не будет.</p>
      <p class="muted" v-else>Добавятся и обновятся записи. Нагрузка, убранная из выгрузки выбранного семестра, удалится в пределах исходного выбора преподавателей. Нагрузка с отзывами и студенты не удаляются.</p>
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
        <button type="button" class="text-link" @click="clearFile">Убрать файл</button>
      </div>
      <p v-if="fileError" class="error-text" role="alert">{{ fileError }}</p>
    </section>
    <section v-if="file" class="card stack">
      <h2>3. Проверка</h2>
      <LoadState
        skeleton="import"
        :loading="preview.loading.value || preview.refreshing.value"
        :error="previewError || preview.error.value"
        @retry="retryPreview"
        ><template v-if="report"
          ><p class="muted">
            Период: {{ report.period.title
            }}{{
              report.period.willBeCreated ? " — будет создан, сбор закрыт" : ""
            }}
          </p>
          <p class="muted">{{ report.scopeDescription }}</p>
          <p v-if="mode !== 'SynchronizeWorkloads'" class="muted">Удалений не будет. Студенты, отсутствующие в файле, сохранятся.</p>
          <ImportReport :report="report" />
          <p v-if="report.errors.length" class="error-text">
            Исправьте ошибки и загрузите файл снова.
          </p>
          <button
            class="btn btn--primary"
            :disabled="
              !!report.errors.length || !!fileError || !report.previewToken ||
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
    <p>{{ applied.period.title }} · {{ modeLabels[applied.mode] }}</p>
    <ImportReport :report="applied" applied />
    <button
      v-if="applied.studentGroupIds?.length"
      class="btn btn--secondary"
      :disabled="downloads.pending.value"
      @click="download('credentials', applied.studentGroupIds)"
    >
      Скачать логины и пароли
    </button>
  </section>

</template>
