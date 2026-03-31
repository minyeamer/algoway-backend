import apiClient from './client';
import type { PodSummary, PodDetail, CreatePodRequest, FetchPodsParams, JoinPodResult } from '@/types/pod';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export const fetchPods = async (params: FetchPodsParams) => {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<PodSummary>>>('/pods', { params });
  return data.data;
};

export const fetchPodById = async (podId: string) => {
  const { data } = await apiClient.get<ApiResponse<PodDetail>>(`/pods/${podId}`);
  return data.data;
};

export const createPod = async (body: CreatePodRequest) => {
  const { data } = await apiClient.post<ApiResponse<PodDetail>>('/pods', body);
  return data.data;
};

export const joinPod = async (podId: string) => {
  const { data } = await apiClient.post<ApiResponse<JoinPodResult>>(`/pods/${podId}/join`);
  return data.data;
};

export const leavePod = async (podId: string) => {
  await apiClient.post(`/pods/${podId}/leave`);
};

export const fetchMyPods = async () => {
  const { data } = await apiClient.get<ApiResponse<PodSummary[]>>('/pods/my');
  return data.data;
};
