import axios from 'axios';
import api from './axios';
import type { ApiSuccessResult, ImportReportDto, StudentGroupDto, Term } from '../types';

export interface ImportParams {
  file: File;
  startYear: number;
  term: Term;
}

function toForm({ file, startYear, term }: ImportParams): FormData {
  const form = new FormData();
  form.append('file', file);
  form.append('startYear', String(startYear));
  form.append('term', term);
  return form;
}

// Без явного multipart axios сериализует FormData в JSON из-за заголовка по умолчанию.
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export async function downloadImportTemplate(): Promise<Blob> {
  const response = await api.get('/Import/template', { responseType: 'blob' });
  return response.data;
}

export async function previewImport(params: ImportParams, signal?: AbortSignal): Promise<ImportReportDto> {
  const response = await api.post<ApiSuccessResult<ImportReportDto>>('/Import/preview', toForm(params), { ...multipart, signal });
  return response.data.data;
}

/** При ошибках в файле сервер отвечает 400 с отчётом: его достаёт getImportErrorReport. */
export async function applyImport(params: ImportParams): Promise<ImportReportDto> {
  const response = await api.post<ApiSuccessResult<ImportReportDto>>('/Import/apply', toForm(params), {
    ...multipart,
    timeout: 300_000,
  });
  return response.data.data;
}

export async function downloadCredentials(groupIds: string[]): Promise<Blob> {
  const response = await api.get('/Import/credentials', {
    params: { groupIds },
    paramsSerializer: { indexes: null },
    responseType: 'blob',
  });
  return response.data;
}

export async function getImportGroups(signal?: AbortSignal): Promise<StudentGroupDto[]> {
  const response = await api.get<ApiSuccessResult<StudentGroupDto[]>>('/Import/groups', { signal });
  return response.data.data;
}

export function getImportErrorReport(error: unknown): ImportReportDto | null {
  if (!axios.isAxiosError(error)) return null;
  return (error.response?.data as { report?: ImportReportDto } | undefined)?.report ?? null;
}
