import api from './axios';
import type { ApiSuccessResult, FeedbackDto, PagedResultDto, PostFeedbackRequest, PutFeedbackRequest } from '../types';

interface FeedbackParams {
  Page?: number;
  PageSize?: number;
  DisciplineId?: string;
  TeacherId?: string;
  WorkloadId?: string;
}

export async function getFeedbacks(params: FeedbackParams): Promise<PagedResultDto<FeedbackDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<FeedbackDto>>>('/Feedback', { params });
  return response.data.data;
}

export async function getFeedbackById(id: string): Promise<FeedbackDto> {
  const response = await api.get<ApiSuccessResult<FeedbackDto>>(`/Feedback/${id}`);
  return response.data.data;
}

export async function createFeedback(data: PostFeedbackRequest): Promise<string> {
  const response = await api.post<ApiSuccessResult<string>>('/Feedback', data);
  return response.data.data;
}

export async function updateFeedback(data: PutFeedbackRequest): Promise<void> {
  await api.put(`/Feedback/${data.id}`, data);
}

export async function deleteFeedback(id: string): Promise<void> {
  await api.delete(`/Feedback/${id}`);
}
