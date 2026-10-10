import api from './axios';
import type { ApiSuccessResult, PeriodFilterParams } from '../types';

function toParams(period: PeriodFilterParams) {
  return { periodId: period.PeriodId, startYear: period.StartYear };
}

export async function getTeacherSummary(id: string, period: PeriodFilterParams = {}): Promise<string> {
  const response = await api.get<ApiSuccessResult<string>>(`/Summaries/teacher/${id}`, { params: toParams(period) });
  return response.data.data;
}

export async function getDisciplineSummary(id: string, period: PeriodFilterParams = {}): Promise<string> {
  const response = await api.get<ApiSuccessResult<string>>(`/Summaries/discipline/${id}`, { params: toParams(period) });
  return response.data.data;
}
