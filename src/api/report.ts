import api from './axios';
import type { PeriodFilterParams } from '../types';

export async function generateReport(period: PeriodFilterParams = {}): Promise<Blob> {
  const response = await api.post('/Report', null, {
    params: { periodId: period.PeriodId, startYear: period.StartYear },
    responseType: 'blob',
  });
  return response.data;
}
