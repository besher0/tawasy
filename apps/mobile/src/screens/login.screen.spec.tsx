import React from 'react';
import { render } from '@testing-library/react-native';
import { LoginScreen } from './login.screen';

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    login: jest.fn(),
  }),
}));

describe('LoginScreen', () => {
  it('renders login fields', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('تسجيل دخول فريق الإنتاج')).toBeTruthy();
  });
});