import { ensureTrailingSlash, isDefinitiveRefreshFailure } from './api';

describe('ensureTrailingSlash', () => {
  it.each([
    ['/orders', '/orders/'],
    ['/orders?date=2026-07-13', '/orders/?date=2026-07-13'],
    ['/orders/#details', '/orders/#details'],
    ['https://zerba.duckdns.org/auth/refresh', 'https://zerba.duckdns.org/auth/refresh/'],
  ])('normalizes %s without losing its suffix', (input, expected) => {
    expect(ensureTrailingSlash(input)).toBe(expected);
  });

  it('preserves empty and undefined request URLs', () => {
    expect(ensureTrailingSlash('')).toBe('');
    expect(ensureTrailingSlash(undefined)).toBeUndefined();
  });
});

describe('isDefinitiveRefreshFailure', () => {
  it.each([401, 403])('recognizes refresh credential rejection %s', (status) => {
    expect(
      isDefinitiveRefreshFailure({
        isAxiosError: true,
        response: { status },
      }),
    ).toBe(true);
  });

  it.each([undefined, 408, 500, 503])(
    'preserves authentication for transient status %s',
    (status) => {
      expect(
        isDefinitiveRefreshFailure({
          isAxiosError: true,
          response: status ? { status } : undefined,
        }),
      ).toBe(false);
    },
  );
});
