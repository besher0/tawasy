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
    expect(getByText('ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ¯ط·آ®ط¸ث†ط¸â€‍ ط¸ظ¾ط·آ±ط¸ظ¹ط¸â€ڑ ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·ع¾ط·آ§ط·آ¬')).toBeTruthy();
  });
});