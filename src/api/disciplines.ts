import api from './axios';
import type { ApiSuccessResult, DisciplineDto, PagedResultDto, RatingDto, PeriodFilterParams } from '../types';

interface PaginationParams {
  Page?: number;
  PageSize?: number;
  Query?: string;
}

export async function getDisciplines(params: PaginationParams & PeriodFilterParams): Promise<PagedResultDto<DisciplineDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<DisciplineDto>>>('/Disciplines', { params });
  return response.data.data;
}

export async function getDisciplinesRating(params: PaginationParams & PeriodFilterParams): Promise<PagedResultDto<RatingDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<RatingDto>>>('/Disciplines/rating', { params });
  return response.data.data;
}

/** Если такое название уже есть, сервер отвечает 400: записи нужно объединить. */
export async function renameDiscipline(id: string, name: string): Promise<DisciplineDto> {
  const response = await api.put<ApiSuccessResult<DisciplineDto>>(`/Disciplines/${id}`, { name });
  return response.data.data;
}

/** Нагрузка и отзывы дисциплины sourceId переходят к targetId, sourceId удаляется. */
export async function mergeDisciplines(sourceId: string, targetId: string): Promise<DisciplineDto> {
  const response = await api.post<ApiSuccessResult<DisciplineDto>>(`/Disciplines/${sourceId}/merge`, { targetId });
  return response.data.data;
}
