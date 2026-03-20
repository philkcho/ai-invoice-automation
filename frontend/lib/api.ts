import axios, { InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from '@/lib/token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 재시도 추적을 위한 확장 타입
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

const MAX_RETRY = 1;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // HttpOnly 쿠키 자동 전송
});

// 토큰 갱신 전용 인스턴스 (인터셉터 미적용 → 무한 루프 방지)
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // 쿠키로 refresh token 전송
});

// 요청 인터셉터: access token 자동 첨부
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = tokenStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 응답 인터셉터: 401 시 refresh token으로 갱신 시도 (최대 1회)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;
    const retryCount = originalRequest._retryCount ?? 0;

    if (error.response?.status === 401 && retryCount < MAX_RETRY) {
      // 인증 관련 엔드포인트는 refresh 시도 없이 에러 전파
      const requestUrl = originalRequest.url || '';
      const skipRefreshPaths = ['/auth/login', '/auth/forgot-password', '/auth/reset-password'];
      if (skipRefreshPaths.some(p => requestUrl.includes(p))) {
        return Promise.reject(error);
      }

      originalRequest._retryCount = retryCount + 1;

      try {
        // refresh token은 HttpOnly 쿠키로 자동 전송
        const { data } = await refreshClient.post('/api/v1/auth/refresh');
        tokenStore.setAccessToken(data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch {
        // refresh 실패 → 로그아웃
        try {
          await refreshClient.post('/api/v1/auth/logout');
        } catch {
          // 로그아웃 API 실패해도 진행
        }
        tokenStore.clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
