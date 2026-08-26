import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthTokens } from '../lib/api';
import { AuthProvider, useAuth } from './auth-context';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setAuthTokens: jest.fn(),
  setAuthTokensListener: jest.fn(),
}));

function AuthProbe() {
  const { loading, user } = useAuth();
  return <Text>{loading ? 'loading' : user?.name ?? 'guest'}</Text>;
}

describe('AuthProvider startup restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores the complete persisted session without requesting /auth/me', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({
        user: {
          id: 'user-1',
          name: 'Offline User',
          phone: '0500000000',
          role: 'ShopEmployee',
          shopId: 'shop-1',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );

    const screen = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('Offline User')).toBeTruthy());
    expect(setAuthTokens).toHaveBeenCalledWith({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(api.get).not.toHaveBeenCalled();
  });
});
