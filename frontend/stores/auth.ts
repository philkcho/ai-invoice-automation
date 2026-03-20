import { create } from 'zustand';
import api from '@/lib/api';
import { tokenStore } from '@/lib/token-store';
import type { User, LoginRequest, TokenResponse } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (data: LoginRequest) => {
    const { data: tokens } = await api.post<TokenResponse>('/api/v1/auth/login', data);
    tokenStore.setTokens(tokens.access_token, tokens.refresh_token);

    const { data: user } = await api.get<User>('/api/v1/users/me');
    set({ user, isAuthenticated: true });
  },

  logout: () => {
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
