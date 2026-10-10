import api from './axios';
import type { ApiSuccessResult, PeriodDto, PeriodListItemDto, SuggestedPeriodDto } from '../types';

export async function getPeriods(signal?: AbortSignal): Promise<PeriodListItemDto[]> {
  const response = await api.get<ApiSuccessResult<PeriodListItemDto[]>>('/Periods', { signal });
  return response.data.data;
}

export async function getSuggestedPeriods(signal?: AbortSignal): Promise<SuggestedPeriodDto[]> {
  const response = await api.get<ApiSuccessResult<SuggestedPeriodDto[]>>('/Periods/suggested', { signal });
  return response.data.data;
}

export async function setPeriodFeedback(id: string, isOpen: boolean): Promise<PeriodDto> {
  const response = await api.put<ApiSuccessResult<PeriodDto>>(`/Periods/${id}/feedback`, { isOpen });
  return response.data.data;
}
