import axios from 'axios';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<AuthTokens> | null = null;
let authTokensListener: ((tokens: AuthTokens | null) => void) | null = null;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://tawasy-0bq7.onrender.com';

export function setAuthTokens(tokens: AuthTokens | null) {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;
}

export function getAccessToken() {
  return accessToken;
}

export function setAuthTokensListener(listener: ((tokens: AuthTokens | null) => void) | null) {
  authTokensListener = listener;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const isAuthRequest =
      request?.url?.includes('/auth/login') ||
      request?.url?.includes('/auth/refresh');

    if (
      error.response?.status !== 401 ||
      request?._retry ||
      isAuthRequest ||
      !refreshToken
    ) {
      return Promise.reject(error);
    }

    request._retry = true;

    try {
      refreshPromise ??= axios
        .post<{ tokens: AuthTokens }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: 60000 },
        )
        .then((response) => response.data.tokens)
        .finally(() => {
          refreshPromise = null;
        });

      const tokens = await refreshPromise;
      setAuthTokens(tokens);
      authTokensListener?.(tokens);
      request.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(request);
    } catch (refreshError) {
      setAuthTokens(null);
      authTokensListener?.(null);
      return Promise.reject(refreshError);
    }
  },
);

export default api;
