import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import Export from "../src/views/Export.vue";
import { getImportGroups, downloadCredentials } from "../src/api/import";
import { saveBlob } from "../src/utils/download";
import { ApiError } from "../src/api/transport";
import { group } from "./fixtures";

vi.mock("../src/api/import", () => ({ getImportGroups: vi.fn(), downloadCredentials: vi.fn() }));
vi.mock("../src/utils/download", () => ({ saveBlob: vi.fn() }));
let view: VueWrapper;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getImportGroups).mockResolvedValue([group, { ...group, id: "g2", name: "ПИ-27" }]);
  vi.mocked(downloadCredentials).mockResolvedValue(new Blob(["xlsx"]));
});
afterEach(() => view?.unmount());
async function open() { view = mount(Export); await flushPromises(); }

it("downloads all groups by default and only the chosen groups after selection", async () => {
  await open();
  expect(view.get("h1").text()).toBe("Экспорт");
  await view.get("button").trigger("click"); await flushPromises();
  expect(downloadCredentials).toHaveBeenLastCalledWith([]);
  expect(saveBlob).toHaveBeenLastCalledWith(expect.any(Blob), "vsoko-credentials.xlsx");
  await view.get("input[value=g2]").setValue(true);
  expect(view.get("button").text()).toBe("Скачать (1)");
  await view.get("button").trigger("click"); await flushPromises();
  expect(downloadCredentials).toHaveBeenLastCalledWith(["g2"]);
});

it("explains an empty group list and disables download", async () => {
  vi.mocked(getImportGroups).mockResolvedValue([]);
  await open();
  expect(view.text()).toContain("Пока нет групп для выгрузки");
  expect(view.get("button").attributes("disabled")).toBeDefined();
  expect(view.find("fieldset").exists()).toBe(false);
});

it("offers retry after loading groups fails", async () => {
  vi.mocked(getImportGroups).mockRejectedValueOnce(new ApiError(503, { detail: "Группы недоступны" }));
  await open();
  expect(view.get("[role=alert]").text()).toContain("Группы недоступны");
  await view.get("button").trigger("click"); await flushPromises();
  expect(view.findAll("input[type=checkbox]")).toHaveLength(2);
});

it("retains the selected groups after a failed download", async () => {
  vi.mocked(downloadCredentials).mockRejectedValueOnce(new Error("Не удалось скачать"));
  await open();
  await view.get("input[value=g1]").setValue(true);
  await view.get("button").trigger("click"); await flushPromises();
  expect(view.get("[role=alert]").text()).toContain("Не удалось скачать");
  await view.get("button").trigger("click"); await flushPromises();
  expect(downloadCredentials).toHaveBeenLastCalledWith(["g1"]);
  expect(view.find("[role=alert]").exists()).toBe(false);
});

it("blocks selection changes and duplicate downloads while a download is running", async () => {
  let finish!: (blob: Blob) => void;
  vi.mocked(downloadCredentials).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await open();
  await view.get("button").trigger("click");
  expect(view.get("button").text()).toBe("Скачиваем…");
  expect(view.get("button").attributes("disabled")).toBeDefined();
  expect(view.get("fieldset").attributes("disabled")).toBeDefined();
  finish(new Blob(["xlsx"])); await flushPromises();
  expect(view.get("button").attributes("disabled")).toBeUndefined();
  expect(downloadCredentials).toHaveBeenCalledOnce();
});
