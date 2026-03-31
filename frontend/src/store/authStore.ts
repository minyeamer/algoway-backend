import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/auth';

const COOKIE_NAME = 'refresh_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function setRefreshTokenCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearRefreshTokenCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        setRefreshTokenCookie(refreshToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      clearAuth: () => {
        clearRefreshTokenCookie();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'algoway-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
