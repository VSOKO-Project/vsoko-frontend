import api from './axios';

export async function generateReport(): Promise<Blob> {
  const response = await api.post('/Report', null, {
    responseType: 'blob',
  });
  return response.data;
}
