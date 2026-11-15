import { beforeEach, expect, it, vi } from "vitest";
import client from "../src/api/client";
import { ApiError } from "../src/api/transport";
import * as api from "../src/api/import";
import { importReport } from "./fixtures";

vi.mock("../src/api/client", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

it("sends the exact file, mode and confirmation token as multipart fields", async () => {
  vi.mocked(client.post).mockResolvedValue({ data: { data: importReport } });
  const file = new File(["xlsx"], "source.xlsx");
  const params = { file, startYear: 2026, term: "Spring" as const, mode: "UpdateExisting" as const };
  const signal = new AbortController().signal;
  await api.previewImport(params, signal);
  let form = vi.mocked(client.post).mock.calls[0]![1] as FormData;
  expect(form.get("file")).toBe(file);
  expect(form.get("mode")).toBe("UpdateExisting");
  expect(form.get("previewToken")).toBeNull();
  expect(vi.mocked(client.post).mock.calls[0]![2]).toEqual(expect.objectContaining({ signal }));
  await api.applyImport({ ...params, previewToken: "confirmed-plan" });
  form = vi.mocked(client.post).mock.calls[1]![1] as FormData;
  expect(form.get("previewToken")).toBe("confirmed-plan");
  expect(form.get("startYear")).toBe("2026");
  expect(form.get("term")).toBe("Spring");
  expect(vi.mocked(client.post).mock.calls[1]![2]).toEqual(expect.objectContaining({ timeout: 300_000 }));
});

it("extracts validation and changed-plan reports, and handles ordinary errors", () => {
  expect(api.getImportErrorReport(new ApiError(400, { report: importReport }))).toBe(importReport);
  expect(api.getImportErrorReport(new ApiError(409, { report: importReport }))).toBe(importReport);
  expect(api.getImportErrorReport(new ApiError(503, { detail: "Недоступно" }))).toBeNull();
  expect(api.getImportErrorReport(new Error("offline"))).toBeNull();
});

it("preserves teacher and group scope in downloads and supports cancellation", async () => {
  const blob = new Blob(["xlsx"]);
  vi.mocked(client.get).mockResolvedValue({ data: blob });
  expect(await api.downloadImportTemplate()).toBe(blob);
  expect(await api.exportPeriod({ startYear: 2026, term: "Spring" }, ["t1", "t2"])).toBe(blob);
  expect(client.get).toHaveBeenLastCalledWith("/Import/export", expect.objectContaining({ params: { startYear: 2026, term: "Spring", teacherIds: ["t1", "t2"] } }));
  await api.downloadCredentials(["g2"]);
  expect(client.get).toHaveBeenLastCalledWith("/Import/credentials", expect.objectContaining({ params: { groupIds: ["g2"] } }));
  vi.mocked(client.get).mockResolvedValue({ data: { data: [] } });
  const signal = new AbortController().signal;
  expect(await api.getImportGroups(signal)).toEqual([]);
  expect(client.get).toHaveBeenLastCalledWith("/Import/groups", { signal });
  expect(await api.getPeriodTeachers({ startYear: 2026, term: "Spring" }, signal)).toEqual([]);
  expect(client.get).toHaveBeenLastCalledWith("/Import/teachers", { params: { startYear: 2026, term: "Spring" }, signal });
});
