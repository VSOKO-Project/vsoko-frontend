import api from './axios';
import type { ApiSuccessResult, PagedResultDto, RatingDto, TeacherDto } from '../types';

interface PaginationParams {
  Page?: number;
  PageSize?: number;
  Query?: string;
}

export async function getTeachers(params: PaginationParams): Promise<PagedResultDto<TeacherDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<TeacherDto>>>('/Teachers', { params });
  return response.data.data;
}

export async function getTeachersRating(params: PaginationParams): Promise<PagedResultDto<RatingDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<RatingDto>>>('/Teachers/rating', { params });
  return response.data.data;
}
