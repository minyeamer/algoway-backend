import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/v1`,
  withCredentials: true, // Refresh Token 쿠키 자동 전송
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 — Access Token 헤더 첨부
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 — 401 발생 시 Refresh Token으로 재발급 후 재시도
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/refresh`,
          { refreshToken: document.cookie.split('; ').find(r => r.startsWith('refresh_token='))?.split('=')[1] ?? '' },
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch {
        // Refresh Token도 만료된 경우 → 로그아웃 처리
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
