import api from '../lib/api';
import {
  setCachedDeliveryTotals,
  setCachedOrders,
  setCachedShops,
  setLastSuccessfulSync,
} from '../storage/orders-cache';
import { syncIncomingOrders } from './orders-sync.service';

jest.mock('../lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../storage/orders-cache', () => ({
  setCachedDeliveryTotals: jest.fn(() => Promise.resolve()),
  setCachedOrders: jest.fn(() => Promise.resolve()),
  setCachedShops: jest.fn(() => Promise.resolve()),
  setLastSuccessfulSync: jest.fn(() => Promise.resolve()),
}));

const mockedGet = api.get as jest.Mock;

describe('syncIncomingOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches unfiltered orders and persists all factory resources', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/orders') {
        return Promise.resolve({ data: [{ id: 'order-1' }] });
      }
      if (url === '/shops') {
        return Promise.resolve({ data: [{ id: 'shop-1' }] });
      }
      return Promise.resolve({
        data: {
          deliveredTotal: 10,
          deliveredCount: 1,
          undeliveredTotal: 20,
          undeliveredCount: 2,
        },
      });
    });

    const result = await syncIncomingOrders({
      userId: 'user-1',
      isFactoryView: true,
      totalsDateKey: '2026-08-26',
      shopId: 'shop-1',
    });

    expect(mockedGet).toHaveBeenCalledWith('/orders');
    expect(mockedGet).toHaveBeenCalledWith(
      '/analytics/delivery-totals',
      expect.objectContaining({
        params: expect.objectContaining({ shopId: 'shop-1' }),
      }),
    );
    expect(setCachedOrders).toHaveBeenCalledWith('user-1', [{ id: 'order-1' }]);
    expect(setCachedShops).toHaveBeenCalled();
    expect(setCachedDeliveryTotals).toHaveBeenCalled();
    expect(setLastSuccessfulSync).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
    );
    expect(result.errors).toEqual({});
  });

  it('preserves independent resources when the orders request fails', async () => {
    const ordersError = new Error('offline');
    mockedGet.mockImplementation((url: string) => {
      if (url === '/orders') {
        return Promise.reject(ordersError);
      }
      return Promise.resolve({
        data: {
          deliveredTotal: 10,
          deliveredCount: 1,
          undeliveredTotal: 20,
          undeliveredCount: 2,
        },
      });
    });

    const result = await syncIncomingOrders({
      userId: 'user-1',
      isFactoryView: false,
      totalsDateKey: '2026-08-26',
    });

    expect(result.orders).toBeUndefined();
    expect(result.deliveryTotals).toEqual(
      expect.objectContaining({ deliveredTotal: 10 }),
    );
    expect(result.errors.orders).toBe(ordersError);
    expect(setCachedOrders).not.toHaveBeenCalled();
    expect(setLastSuccessfulSync).not.toHaveBeenCalled();
    expect(setCachedDeliveryTotals).toHaveBeenCalled();
    expect(mockedGet).not.toHaveBeenCalledWith('/shops', expect.anything());
  });
});
