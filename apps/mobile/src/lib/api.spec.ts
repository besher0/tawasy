import { ensureTrailingSlash } from './api';

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
