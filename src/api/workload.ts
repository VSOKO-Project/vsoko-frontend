import api from './axios';
import type { ApiSuccessResult, PagedResultDto, WorkloadDto } from '../types';

interface PaginationParams {
  Page?: number;
  PageSize?: number;
  Query?: string;
}

export async function getWorkloads(params: PaginationParams): Promise<PagedResultDto<WorkloadDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<WorkloadDto>>>('/Workload', { params });
  return response.data.data;
}

export async function getWorkloadById(id: string): Promise<WorkloadDto> {
  const response = await api.get<ApiSuccessResult<WorkloadDto>>(`/Workload/${id}`);
  return response.data.data;
}
