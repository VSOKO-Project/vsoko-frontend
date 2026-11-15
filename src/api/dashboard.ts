import api from './client';
import type { ApiSuccessResult, DashboardDto, PeriodFilterParams } from '../types';

export async function getDashboard(params: PeriodFilterParams, signal?: AbortSignal): Promise<DashboardDto> {
  const response = await api.get<ApiSuccessResult<DashboardDto>>('/Dashboard', { params, signal });
  return response.data.data;
}
