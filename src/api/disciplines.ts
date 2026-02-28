import api from './axios';
import type { ApiSuccessResult, DisciplineDto, PagedResultDto, RatingDto } from '../types';

interface PaginationParams {
  Page?: number;
  PageSize?: number;
  Query?: string;
}

export async function getDisciplines(params: PaginationParams): Promise<PagedResultDto<DisciplineDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<DisciplineDto>>>('/Disciplines', { params });
  return response.data.data;
}

export async function getDisciplinesRating(params: PaginationParams): Promise<PagedResultDto<RatingDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<RatingDto>>>('/Disciplines/rating', { params });
  return response.data.data;
}
