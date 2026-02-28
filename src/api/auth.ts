import api from './axios';
import type { ApiSuccessResult, LoginQuery, LoginResultDto, LogOutQuery } from '../types';

export async function login(data: LoginQuery): Promise<ApiSuccessResult<LoginResultDto>> {
  const response = await api.post<ApiSuccessResult<LoginResultDto>>('/Security/Login', data);
  return response.data;
}

export async function logout(data: LogOutQuery): Promise<void> {
  await api.post('/Security/LogOut', data);
}
