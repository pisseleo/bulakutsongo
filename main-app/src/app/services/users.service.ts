// services/user.service.ts
import apiClient from './apiClient';
import type { ApiResponse } from '../types';

export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  online: boolean;
}

export const getOnlineUsers = async (): Promise<OnlineUser[]> => {
  const { data } = await apiClient.get<ApiResponse<OnlineUser[]>>('/users/online');
  return data.data!;
};