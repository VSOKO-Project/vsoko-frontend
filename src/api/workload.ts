import api from './axios';
import type { ApiSuccessResult, PagedResultDto, WorkloadDto } from '../types';

interface PaginationParams {
  Page?: number;
  PageSize?: number;
  Query?: string;
  PeriodId?: string;
}

export async function getWorkloads(params: PaginationParams, signal?: AbortSignal): Promise<PagedResultDto<WorkloadDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<WorkloadDto>>>('/Workload', { params, signal });
  return response.data.data;
}

export async function getWorkloadById(id: string, signal?: AbortSignal): Promise<WorkloadDto> {
  const response = await api.get<ApiSuccessResult<WorkloadDto>>(`/Workload/${id}`, { signal });
  return response.data.data;
}
