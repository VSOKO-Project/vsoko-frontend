import api from "./client";
import type {
  ApiSuccessResult,
  PagedResultDto,
  RatingDto,
  TeacherDto,
  PeriodFilterParams,
} from "../types";

interface PaginationParams {
  Page?: number;
  PageSize?: number;
  Query?: string;
}

export async function getTeachers(
  params: PaginationParams & PeriodFilterParams,
): Promise<PagedResultDto<TeacherDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<TeacherDto>>>(
    "/Teachers",
    { params },
  );
  return response.data.data;
}

export async function getTeachersRating(
  params: PaginationParams & PeriodFilterParams,
): Promise<PagedResultDto<RatingDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<RatingDto>>>(
    "/Teachers/rating",
    { params },
  );
  return response.data.data;
}

export interface TeacherName {
  surname: string;
  name: string;
  patronymic: string;
}

/** Если такое ФИО уже есть, сервер отвечает 400: записи нужно объединить. */
export async function renameTeacher(
  id: string,
  fio: TeacherName,
): Promise<TeacherDto> {
  const response = await api.put<ApiSuccessResult<TeacherDto>>(
    `/Teachers/${id}`,
    fio,
  );
  return response.data.data;
}

/** Нагрузка и отзывы преподавателя sourceId переходят к targetId, sourceId удаляется. */
export async function mergeTeachers(
  sourceId: string,
  targetId: string,
): Promise<TeacherDto> {
  const response = await api.post<ApiSuccessResult<TeacherDto>>(
    `/Teachers/${sourceId}/merge`,
    { targetId },
  );
  return response.data.data;
}
