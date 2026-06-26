import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Platform } from 'react-native';
import api, {
  AUTH_BOOTSTRAP_TIMEOUT_MS,
  setAuthTokens,
  setAuthTokensListener,
} from '../lib/api';
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
    setAuthTokensListener((tokens) => {
      if (!tokens) {
        const emptyState: AuthState = {
          user: null,
          accessToken: null,
          refreshToken: null,
        };
        setState(emptyState);
        void persistState(null);
        return;
      }

      setState((current) => {
        const nextState = {
          ...current,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
        void persistState(nextState);
        return nextState;
      });
    });

    return () => setAuthTokensListener(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verifyPersistedUser() {
      try {
        const response = await api.get<AuthUser>('/auth/me', {
          timeout: AUTH_BOOTSTRAP_TIMEOUT_MS,
        });

        if (cancelled) {
          return;
        }

        setState((current) => {
          if (!current.accessToken && !current.refreshToken) {
            return current;
          }

          const nextState = { ...current, user: response.data };
          void persistState(nextState);
          return nextState;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const status = axios.isAxiosError(error) ? error.response?.status : undefined;

        if (status === 401 || status === 403) {
          const emptyState: AuthState = {
            user: null,
            accessToken: null,
            refreshToken: null,
          };
          setAuthTokens(null);
          setState(emptyState);
          await persistState(null);
          return;
        }

        console.warn('Failed to verify persisted auth state', error);
      }
    }

    async function load() {
      try {
        const raw = await getPersistedState();
        if (cancelled) {
          return;
        }

        if (raw) {
          const parsed = JSON.parse(raw) as AuthState;
          setAuthTokens({
            accessToken: parsed.accessToken ?? '',
            refreshToken: parsed.refreshToken ?? '',
          });
          setState(parsed);
          void verifyPersistedUser();
        }
      } catch (error) {
        console.warn('Failed to load persisted auth state', error);
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
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
        setAuthTokens(response.data.tokens);
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
        setAuthTokens(null);

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
