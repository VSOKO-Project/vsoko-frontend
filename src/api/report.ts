import api from "./client";
import type { ApiSuccessResult, PagedResultDto, PeriodFilterParams } from "../types";

export interface ReportHistoryEntry {
  id: string;
  periodTitle: string;
  createdAtUtc: string;
  fileName: string;
  sizeBytes: number;
}

export async function getReportHistory(page: number, signal?: AbortSignal): Promise<PagedResultDto<ReportHistoryEntry>> {
  const response = await api.get<ApiSuccessResult<PagedResultDto<ReportHistoryEntry>>>("/Report/history", { params: { page }, signal });
  return response.data.data;
}

export async function downloadReport(id: string): Promise<Blob> {
  const response = await api.get(`/Report/history/${encodeURIComponent(id)}`, { responseType: "blob" });
  return response.data;
}

export async function generateReport(
  period: PeriodFilterParams = {},
): Promise<Blob> {
  const response = await api.post("/Report", null, {
    params: { periodId: period.PeriodId, startYear: period.StartYear },
    responseType: "blob",
  });
  return response.data;
}
