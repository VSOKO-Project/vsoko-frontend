import api from './axios';
import type { ApiSuccessResult, CriteriaDto, PostCriteriaCommandRequest, PutCriteriaCommandRequest } from '../types';

export async function getCriteria(): Promise<CriteriaDto[]> {
  const response = await api.get<ApiSuccessResult<CriteriaDto[]>>('/Criteria');
  return response.data.data;
}

export async function getCriteriaById(id: string): Promise<CriteriaDto> {
  const response = await api.get<ApiSuccessResult<CriteriaDto>>(`/Criteria/${id}`);
  return response.data.data;
}

export async function createCriteria(data: PostCriteriaCommandRequest): Promise<CriteriaDto> {
  const response = await api.post<ApiSuccessResult<CriteriaDto>>('/Criteria', data);
  return response.data.data;
}

export async function updateCriteria(data: PutCriteriaCommandRequest): Promise<CriteriaDto> {
  const response = await api.put<ApiSuccessResult<CriteriaDto>>(`/Criteria/${data.id}`, data);
  return response.data.data;
}

export async function deleteCriteria(id: string): Promise<void> {
  await api.delete(`/Criteria/${id}`);
}
