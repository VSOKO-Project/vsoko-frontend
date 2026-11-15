import { ApiError } from "./transport";
import api from "./client";
import type {
  ApiSuccessResult,
  ImportReportDto,
  ImportMode,
  StudentGroupDto,
  TeacherDto,
  Term,
} from "../types";

export interface ImportParams {
  file: File;
  startYear: number;
  term: Term;
  mode: ImportMode;
  previewToken?: string;
}

function toForm({ file, startYear, term, mode, previewToken }: ImportParams): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("startYear", String(startYear));
  form.append("term", term);
  form.append("mode", mode);
  if (previewToken) form.append("previewToken", previewToken);
  return form;
}

// The transport lets the browser set the multipart boundary.
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export async function downloadImportTemplate(): Promise<Blob> {
  const response = await api.get("/Import/template", { responseType: "blob" });
  return response.data;
}

export interface PeriodParams {
  startYear: number;
  term: Term;
}

/** Нагрузка семестра в формате импорта. Без teacherIds — вся нагрузка. */
export async function exportPeriod(
  { startYear, term }: PeriodParams,
  teacherIds: string[],
): Promise<Blob> {
  const response = await api.get("/Import/export", {
    params: { startYear, term, teacherIds },
    paramsSerializer: { indexes: null },
    responseType: "blob",
  });
  return response.data;
}

export async function getPeriodTeachers(
  { startYear, term }: PeriodParams,
  signal?: AbortSignal,
): Promise<TeacherDto[]> {
  const response = await api.get<ApiSuccessResult<TeacherDto[]>>(
    "/Import/teachers",
    { params: { startYear, term }, signal },
  );
  return response.data.data;
}

export async function previewImport(
  params: ImportParams,
  signal?: AbortSignal,
): Promise<ImportReportDto> {
  const response = await api.post<ApiSuccessResult<ImportReportDto>>(
    "/Import/preview",
    toForm(params),
    { ...multipart, signal },
  );
  return response.data.data;
}

/** При ошибках в файле сервер отвечает 400 с отчётом: его достаёт getImportErrorReport. */
export async function applyImport(
  params: ImportParams,
): Promise<ImportReportDto> {
  const response = await api.post<ApiSuccessResult<ImportReportDto>>(
    "/Import/apply",
    toForm(params),
    {
      ...multipart,
      timeout: 300_000,
    },
  );
  return response.data.data;
}

export async function downloadCredentials(groupIds: string[]): Promise<Blob> {
  const response = await api.get("/Import/credentials", {
    params: { groupIds },
    paramsSerializer: { indexes: null },
    responseType: "blob",
  });
  return response.data;
}

export async function getImportGroups(
  signal?: AbortSignal,
): Promise<StudentGroupDto[]> {
  const response = await api.get<ApiSuccessResult<StudentGroupDto[]>>(
    "/Import/groups",
    { signal },
  );
  return response.data.data;
}

export function getImportErrorReport(error: unknown): ImportReportDto | null {
  if (!(error instanceof ApiError)) return null;
  return (
    (error.response?.data as { report?: ImportReportDto } | undefined)
      ?.report ?? null
  );
}
