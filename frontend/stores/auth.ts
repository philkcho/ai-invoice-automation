import { create } from 'zustand';
import api from '@/lib/api';
import { tokenStore } from '@/lib/token-store';
import type { User, LoginRequest, AccessTokenResponse } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (data: LoginRequest) => {
    // 로그인 응답: access_token만 본문, refresh_token은 HttpOnly 쿠키로 자동 설정
    const { data: tokens } = await api.post<AccessTokenResponse>('/api/v1/auth/login', data);
    tokenStore.setAccessToken(tokens.access_token);

    const { data: user } = await api.get<User>('/api/v1/users/me');
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      // refresh token은 HttpOnly 쿠키로 자동 전송
      await api.post('/api/v1/auth/logout');
    } catch {
      // 로그아웃 API 실패해도 클라이언트 토큰은 삭제
    }
    tokenStore.clear();
    set({ user: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  fetchMe: async () => {
    try {
      const { data: user } = await api.get<User>('/api/v1/users/me');
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  initialize: async () => {
    const token = tokenStore.getAccessToken();
    if (token) {
      try {
        const { data: user } = await api.get<User>('/api/v1/users/me');
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        tokenStore.clear();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
