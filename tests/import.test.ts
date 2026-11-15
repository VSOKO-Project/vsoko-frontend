import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Import from "../src/views/Import.vue";
import ImportReport from "../src/components/ImportReport.vue";
import type { ImportReportDto } from "../src/types";
import { importReport, period, teacher } from "./fixtures";
import * as api from "../src/api/import";
import { confirmAction } from "../src/composables/confirmation";
import { saveBlob } from "../src/utils/download";
import { getSuggestedPeriods } from "../src/api/periods";

vi.mock("../src/api/import", () => ({
  previewImport: vi.fn(), applyImport: vi.fn(), getImportGroups: vi.fn(async () => []),
  getPeriodTeachers: vi.fn(async () => []), downloadCredentials: vi.fn(),
  downloadImportTemplate: vi.fn(), exportPeriod: vi.fn(), getImportErrorReport: vi.fn(),
}));
vi.mock("../src/api/periods", () => ({ getSuggestedPeriods: vi.fn(async () => [{ ...period, exists: true, isCurrent: true }]) }));
vi.mock("../src/composables/confirmation", () => ({ confirmAction: vi.fn(async () => true) }));
vi.mock("../src/utils/download", () => ({ saveBlob: vi.fn() }));

const base = () => structuredClone(importReport) as ImportReportDto;
let view: VueWrapper;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.previewImport).mockResolvedValue(base());
  vi.mocked(api.applyImport).mockResolvedValue(base());
  vi.mocked(api.getImportErrorReport).mockReturnValue(null);
  vi.mocked(api.getImportGroups).mockResolvedValue([]);
  vi.mocked(api.getPeriodTeachers).mockResolvedValue([]);
  vi.mocked(getSuggestedPeriods).mockResolvedValue([{ ...period, exists: true, isCurrent: true }]);
  vi.mocked(confirmAction).mockResolvedValue(true);
});
afterEach(() => view?.unmount());
async function open() {
  view = mount(Import, { global: { stubs: { AppSelect: {
    props: ["modelValue", "options", "label"], emits: ["update:modelValue"],
    template: '<select :aria-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :value="o.value">{{o.label}}</option></select>',
  } } } });
  await flushPromises();
}
async function select(file = new File(["xlsx"], "данные.xlsx")) {
  const input = view.get("input[type=file]");
  Object.defineProperty(input.element, "files", { configurable: true, value: [file] });
  await input.trigger("change");
  await flushPromises();
}
const apply = () => view.findAll("button").find(b => b.text() === "Импортировать")!;

describe("import workflow", () => {
  it("blocks empty and oversized files locally, then allows a corrected file", async () => {
    await open();
    await select(new File([], "empty.xlsx"));
    expect(view.text()).toContain("Файл пустой");
    await select(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.xlsx"));
    expect(view.text()).toContain("Файл больше 5 МБ");
    expect(api.previewImport).not.toHaveBeenCalled();
    await select();
    expect(api.previewImport).toHaveBeenCalledOnce();
    expect(view.text()).not.toContain("Файл больше 5 МБ");
  });

  it("sends the chosen mode and preview token only after confirmation", async () => {
    await open();
    await view.get("select[aria-label='Режим импорта']").setValue("UpdateExisting");
    await select();
    expect(api.previewImport).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "UpdateExisting" }), expect.any(AbortSignal));
    vi.mocked(confirmAction).mockResolvedValueOnce(false);
    await apply().trigger("click");
    await flushPromises();
    expect(api.applyImport).not.toHaveBeenCalled();
    await apply().trigger("click");
    await flushPromises();
    expect(api.applyImport).toHaveBeenCalledWith(expect.objectContaining({ mode: "UpdateExisting", previewToken: "preview-v1", startYear: 2026, term: "Autumn" }));
    expect(view.text()).toContain("Импорт выполнен");
  });

  it("shows an updated error report and clears it on changing modes", async () => {
    const changed = { ...base(), previewToken: "new-token", errors: [{ sheet: "Студенты", row: 2, message: "Исправьте номер" }] };
    vi.mocked(api.applyImport).mockRejectedValueOnce(new Error("План изменился"));
    vi.mocked(api.getImportErrorReport).mockReturnValue(changed);
    await open();
    await select();
    await apply().trigger("click");
    await flushPromises();
    expect(view.text()).toContain("Исправьте номер");
    expect(apply().attributes("disabled")).toBeDefined();
    await view.get("select[aria-label='Режим импорта']").setValue("UpdateExisting");
    await flushPromises();
    expect(view.text()).not.toContain("Исправьте номер");
    expect(apply().attributes("disabled")).toBeUndefined();
  });

  it("retains the checked file after a network failure and allows an explicit retry", async () => {
    vi.mocked(api.previewImport).mockResolvedValue({ ...base(),
      changes: [{ entity: "Студент", key: "001", field: "ФИО", before: "Иванов Иван", after: "Новиков Иван" }],
    });
    vi.mocked(api.applyImport).mockRejectedValueOnce(new Error("Соединение прервано"))
      .mockResolvedValueOnce({ ...base(), studentGroupIds: null });
    await open(); await select();
    await apply().trigger("click"); await flushPromises();
    expect(view.get("[role=alert]").text()).toContain("Соединение прервано");
    expect(view.text()).toContain("данные.xlsx");
    expect(api.applyImport).toHaveBeenCalledOnce();
    await apply().trigger("click"); await flushPromises();
    expect(api.applyImport).toHaveBeenCalledTimes(2);
    expect(view.text()).toContain("Импорт выполнен");
    expect(view.text()).not.toContain("Скачать логины и пароли");
  });

  it("shows failure of a background recheck and retries the current file", async () => {
    await open();
    await select();
    vi.mocked(api.previewImport).mockRejectedValueOnce(new Error("Не удалось проверить"));
    await view.get("select[aria-label='Режим импорта']").setValue("SynchronizeWorkloads");
    await flushPromises();
    expect(view.text()).toContain("Не удалось проверить");
    expect(apply()).toBeUndefined();
    await view.findAll("button").find(b => b.text() === "Повторить")!.trigger("click");
    await flushPromises();
    expect(apply().attributes("disabled")).toBeUndefined();
  });

  it("does not show or apply a delayed report for a replaced file", async () => {
    let complete!: (report: ImportReportDto) => void;
    vi.mocked(api.previewImport).mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    await open();
    await select();
    const staleSignal = vi.mocked(api.previewImport).mock.calls[0]![1]!;
    await select(new File(["new"], "новый.xlsx"));
    expect(staleSignal.aborted).toBe(true);
    complete({ ...base(), previewToken: "stale", errors: [{ sheet: "", row: 0, message: "Старый отчёт" }] });
    await flushPromises();
    expect(view.text()).not.toContain("Старый отчёт");
    await apply().trigger("click");
    await flushPromises();
    expect(api.applyImport).toHaveBeenCalledWith(expect.objectContaining({ previewToken: "preview-v1", file: expect.objectContaining({ name: "новый.xlsx" }) }));
  });

  it("downloads preparation files and credentials for just-imported groups", async () => {
    vi.mocked(api.getPeriodTeachers).mockResolvedValue([teacher]);
    const blob = new Blob(["xlsx"]);
    vi.mocked(api.downloadImportTemplate).mockResolvedValue(blob);
    vi.mocked(api.exportPeriod).mockResolvedValue(blob);
    vi.mocked(api.downloadCredentials).mockResolvedValue(blob);
    await open();
    await view.get("input[aria-label='Поиск преподавателей для выгрузки']").setValue("несуществующий");
    expect(view.text()).toContain("Преподаватели не найдены");
    await view.get("input[aria-label='Поиск преподавателей для выгрузки']").setValue("  АННА  ");
    await view.get("input[type=checkbox][value=t1]").setValue(true);
    const button = (name: string) => view.findAll("button").find(b => b.text() === name)!;
    await button("Пустой шаблон").trigger("click"); await flushPromises();
    expect(saveBlob).toHaveBeenLastCalledWith(blob, "vsoko-import-template.xlsx");
    await button("Скачать данные семестра").trigger("click"); await flushPromises();
    expect(api.exportPeriod).toHaveBeenCalledWith({ startYear: 2026, term: "Autumn" }, ["t1"]);
    await button("Сбросить выбор").trigger("click");
    await button("Скачать данные семестра").trigger("click"); await flushPromises();
    expect(api.exportPeriod).toHaveBeenLastCalledWith(expect.anything(), []);
    await select(); await apply().trigger("click"); await flushPromises();
    await button("Скачать логины и пароли").trigger("click"); await flushPromises();
    expect(api.downloadCredentials).toHaveBeenLastCalledWith(["g1"]);
  });

  it("clears file errors and the preview when removing a file", async () => {
    await open(); await select();
    await select(new File(["bad"], "bad.csv"));
    expect(apply().attributes("disabled")).toBeDefined();
    await view.findAll("button").find(b => b.text() === "Убрать файл")!.trigger("click");
    await flushPromises();
    expect(view.text()).not.toContain("Принимается только");
    expect(view.find(".uploaded-file").exists()).toBe(false);
    expect(apply()).toBeUndefined();
  });

  it("requires a preview token and keeps errors from downloads visible", async () => {
    vi.mocked(api.previewImport).mockResolvedValue({ ...base(), previewToken: "" });
    vi.mocked(api.downloadImportTemplate).mockRejectedValueOnce(new Error("Шаблон недоступен"));
    await open(); await select();
    expect(apply().attributes("disabled")).toBeDefined();
    await view.findAll("button").find(b => b.text() === "Пустой шаблон")!.trigger("click");
    await flushPromises();
    expect(view.get("[role=alert]").text()).toContain("Шаблон недоступен");
  });

  it("accepts drag and drop but ignores a replacement while saving", async () => {
    await open();
    const zone = view.get(".file-upload");
    await zone.trigger("dragover");
    expect(zone.classes()).toContain("file-upload--active");
    await zone.trigger("dragleave", { relatedTarget: zone.find("button").element });
    expect(zone.classes()).toContain("file-upload--active");
    await zone.trigger("dragleave", { relatedTarget: null });
    expect(zone.classes()).not.toContain("file-upload--active");
    await zone.trigger("dragover");
    await zone.trigger("dragleave", { relatedTarget: document.body });
    expect(zone.classes()).not.toContain("file-upload--active");
    await zone.trigger("drop");
    expect(api.previewImport).not.toHaveBeenCalled();
    const dropped = new File(["xlsx"], "drop.xlsx");
    await zone.trigger("drop", { dataTransfer: { files: [dropped] } });
    await flushPromises();
    expect(view.text()).toContain("drop.xlsx");
    let finish!: (report: ImportReportDto) => void;
    vi.mocked(api.applyImport).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await apply().trigger("click"); await flushPromises();
    expect(view.get("fieldset").attributes("disabled")).toBeDefined();
    await zone.trigger("drop", { dataTransfer: { files: [new File(["new"], "ignored.xlsx")] } });
    expect(view.text()).not.toContain("ignored.xlsx");
    finish(base()); await flushPromises();
    expect(view.text()).toContain("Импорт выполнен");
  });

  it("explains creation of a new closed semester without requesting its teachers", async () => {
    vi.mocked(getSuggestedPeriods).mockResolvedValue([{ ...period, exists: false, isCurrent: false }]);
    vi.mocked(api.previewImport).mockResolvedValue({ ...base(), period: { ...base().period, willBeCreated: true } });
    await open(); await select();
    expect(api.getPeriodTeachers).not.toHaveBeenCalled();
    expect(view.text()).toContain("будет создан, сбор закрыт");
    expect(view.findAll("button").some(b => b.text() === "Скачать данные семестра")).toBe(false);
  });

  it("does not preview or save until a semester is available", async () => {
    vi.mocked(getSuggestedPeriods).mockResolvedValue([]);
    await open(); await select();
    expect(api.previewImport).not.toHaveBeenCalled();
    expect(apply()).toBeUndefined();
    expect(api.applyImport).not.toHaveBeenCalled();
  });

  it("confirms deletion count and global renames before applying", async () => {
    const report = { ...base(), mode: "SynchronizeWorkloads" as const,
      changes: [{ entity: "Дисциплина", key: "d1", field: "Название", before: "А", after: "Б" }],
      workloadsToDelete: [{ teacher: "Петров Иван Иванович", discipline: "Химия", group: "Г-1" }],
    };
    vi.mocked(api.previewImport).mockResolvedValue(report);
    await open(); await select();
    await apply().trigger("click"); await flushPromises();
    expect(confirmAction).toHaveBeenCalledWith(expect.objectContaining({ danger: true, description: expect.stringContaining("Будет удалено нагрузок: 1") }));
    expect(vi.mocked(confirmAction).mock.calls[0]![0].description).toContain("во всех семестрах");
  });

  it("opens the native picker and handles cancellation without uploading", async () => {
    await open();
    const input = view.get("input[type=file]");
    const click = vi.spyOn(input.element as HTMLInputElement, "click").mockImplementation(() => {});
    await view.findAll("button").find(b => b.text() === "Выбрать файл")!.trigger("click");
    expect(click).toHaveBeenCalledOnce();
    Object.defineProperty(input.element, "files", { configurable: true, value: [] });
    await input.trigger("change"); await flushPromises();
    expect(api.previewImport).not.toHaveBeenCalled();
  });
});

describe("import report", () => {
  it("shows differences, new catalog entries, protected deletions and row errors", async () => {
    const report: ImportReportDto = { ...base(), changes: [{ entity: "Дисциплина", key: "d1", field: "Название", before: "А", after: "Б" }],
      summary: { ...base().summary, workloads: { create: 0, update: 0, existing: 1, delete: 1 } },
      newTeachers: ["Петров Иван Иванович"], newDisciplines: ["Физика"],
      workloadsToDelete: [{ teacher: "Иванов Иван Иванович", discipline: "Химия", group: "Г-1" }],
      errors: [{ sheet: "Студенты", row: 2, message: "Нет фамилии" }], warnings: [{ sheet: "", row: 0, message: "Нагрузка с отзывами сохранена" }],
    };
    view = mount(ImportReport, { props: { report } });
    expect(view.text()).toContain("было → станет");
    expect(view.text()).toContain("во всех семестрах");
    expect(view.text()).toContain("Будет удалено из нагрузки: 1");
    expect(view.text()).toContain("Нет фамилии");
    expect(view.text()).toContain("Нагрузка с отзывами сохранена");
    expect(view.text()).toContain("Петров Иван Иванович");
    await view.setProps({ applied: true });
    expect(view.text()).toContain("Применённые изменения");
    expect(view.text()).toContain("Добавленные записи справочников");
    expect(view.text()).not.toContain("Будет удалено");
    expect(view.text()).toContain("добавлено");
    expect(view.text()).toContain("1 удалено");
  });

  it("lists new disciplines without new teachers and avoids a global rename notice for student-only changes", () => {
    view = mount(ImportReport, { props: { report: { ...base(), newDisciplines: ["Физика"],
      changes: [{ entity: "Студент", key: "001", field: "Группа", before: "Г-1", after: "Г-2" }],
    } } });
    expect(view.text()).toContain("Дисциплина: Физика");
    expect(view.text()).not.toContain("во всех семестрах");
  });
});
