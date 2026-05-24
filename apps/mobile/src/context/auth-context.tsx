import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import api, { setAccessToken } from '../lib/api';
import { UserRole } from '@sugarprecision/shared-types';

interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  shopId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextValue extends AuthState {
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_KEY = 'sugarprecision_auth';
const IS_WEB = Platform.OS === 'web';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function getPersistedState() {
  if (IS_WEB) {
    return globalThis.localStorage?.getItem(AUTH_KEY) ?? null;
  }

  return SecureStore.getItemAsync(AUTH_KEY);
}

async function persistState(state: AuthState | null) {
  if (IS_WEB) {
    if (!state) {
      globalThis.localStorage?.removeItem(AUTH_KEY);
      return;
    }

    globalThis.localStorage?.setItem(AUTH_KEY, JSON.stringify(state));
    return;
  }

  if (!state) {
    await SecureStore.deleteItemAsync(AUTH_KEY);
    return;
  }

  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(state));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
  });

  useEffect(() => {
    async function load() {
      try {
        const raw = await getPersistedState();
        if (raw) {
          const parsed = JSON.parse(raw) as AuthState;
          setState(parsed);
          setAccessToken(parsed.accessToken);
        }
      } catch (error) {
        console.warn('Failed to load persisted auth state', error);
      }

      setLoading(false);
    }

    void load();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loading,
      login: async (phone: string, password: string) => {
        const response = await api.post('/auth/login', { phone, password });
        const nextState: AuthState = {
          user: response.data.user,
          accessToken: response.data.tokens.accessToken,
          refreshToken: response.data.tokens.refreshToken,
        };

        setState(nextState);
        setAccessToken(nextState.accessToken);
        try {
          await persistState(nextState);
        } catch (error) {
          console.warn('Failed to persist auth state', error);
        }
      },
      logout: async () => {
        const tokenToRevoke = state.accessToken;
        const emptyState: AuthState = {
          user: null,
          accessToken: null,
          refreshToken: null,
        };

        setState(emptyState);
        setAccessToken(null);

        try {
          await persistState(null);
        } catch (error) {
          console.warn('Failed to clear persisted auth state', error);
        }

        if (tokenToRevoke) {
          void api.post('/auth/logout', undefined, {
            headers: { Authorization: `Bearer ${tokenToRevoke}` },
          }).catch(() => {
            // Local logout has already completed.
          });
        }
      },
    }),
    [state, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
