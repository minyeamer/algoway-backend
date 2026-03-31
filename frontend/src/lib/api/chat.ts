import apiClient from './client';
import type { Message, ReadyStatus } from '@/types/chat';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export const fetchMessages = async (roomId: string, page = 1, limit = 50) => {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Message>>>(
    `/chat/rooms/${roomId}/messages`,
    { params: { page, limit } }
  );
  return data.data;
};

export const fetchReadyStatuses = async (roomId: string) => {
  const { data } = await apiClient.get<ApiResponse<{ readyStatuses: ReadyStatus[] }>>(
    `/chat/rooms/${roomId}/ready`
  );
  return data.data.readyStatuses;
};

export const fetchMyChatRooms = async () => {
  const { data } = await apiClient.get('/chat/rooms');
  return data.data;
};
