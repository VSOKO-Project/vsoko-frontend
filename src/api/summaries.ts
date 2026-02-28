import api from './axios';
import type { ApiSuccessResult } from '../types';

export async function getTeacherSummary(id: string): Promise<string> {
  const response = await api.get<ApiSuccessResult<string>>(`/Summaries/teacher/${id}`);
  return response.data.data;
}

export async function getDisciplineSummary(id: string): Promise<string> {
  const response = await api.get<ApiSuccessResult<string>>(`/Summaries/discipline/${id}`);
  return response.data.data;
}
