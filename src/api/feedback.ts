import api from "./client";
import type {
  ApiSuccessResult,
  FeedbackDto,
  FeedbackSort,
  PagedResultDto,
  PostFeedbackRequest,
  PutFeedbackRequest,
} from "../types";

interface FeedbackParams {
  Sort?: FeedbackSort;
  Page?: number;
  PageSize?: number;
  DisciplineId?: string;
  PeriodId?: string;
  StartYear?: number;
  TeacherId?: string;
  WorkloadId?: string;
}

export async function getFeedbacks(
  params: FeedbackParams,
  signal?: AbortSignal,
): Promise<PagedResultDto<FeedbackDto>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<FeedbackDto>>>(
    "/Feedback",
    { params, signal },
  );
  return response.data.data;
}

export async function getFeedbackById(id: string): Promise<FeedbackDto> {
  const response = await api.get<ApiSuccessResult<FeedbackDto>>(
    `/Feedback/${id}`,
  );
  return response.data.data;
}

export async function createFeedback(
  data: PostFeedbackRequest,
): Promise<string> {
  const response = await api.post<ApiSuccessResult<string>>("/Feedback", data);
  return response.data.data;
}

export async function updateFeedback(data: PutFeedbackRequest): Promise<void> {
  await api.put(`/Feedback/${data.id}`, data);
}

export async function deleteFeedback(id: string): Promise<void> {
  await api.delete(`/Feedback/${id}`);
}
