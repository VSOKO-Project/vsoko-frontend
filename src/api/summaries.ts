import api from "./client";
import type { ApiSuccessResult, PeriodFilterParams, FeedbackReportDto, FeedbackCategoryDto } from "../types";

function toParams(period: PeriodFilterParams) {
  return { periodId: period.PeriodId, startYear: period.StartYear };
}

export async function getTeacherSummary(
  id: string,
  period: PeriodFilterParams = {},
): Promise<FeedbackReportDto> {
  const response = await api.get<ApiSuccessResult<FeedbackReportDto>>(
    `/Summaries/teacher/${id}`,
    { params: toParams(period) },
  );
  return response.data.data;
}

export async function getDisciplineSummary(
  id: string,
  period: PeriodFilterParams = {},
): Promise<FeedbackReportDto> {
  const response = await api.get<ApiSuccessResult<FeedbackReportDto>>(
    `/Summaries/discipline/${id}`,
    { params: toParams(period) },
  );
  return response.data.data;
}

export async function getFeedbackCategories(): Promise<FeedbackCategoryDto[]> {
  return (await api.get<ApiSuccessResult<FeedbackCategoryDto[]>>("/Summaries/categories")).data.data;
}
export async function addFeedbackCategory(data: Omit<FeedbackCategoryDto, "id">): Promise<FeedbackCategoryDto> {
  return (await api.post<ApiSuccessResult<FeedbackCategoryDto>>("/Summaries/categories", data)).data.data;
}
export async function reviewFeedbackSignal(feedbackId: string, signalKey: string, data: { status: string; note: string }): Promise<void> {
  await api.put(`/Summaries/signals/${encodeURIComponent(feedbackId)}/${encodeURIComponent(signalKey)}`, data);
}
