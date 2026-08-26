import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedDeliveryTotals,
  getCachedOrders,
  setCachedDeliveryTotals,
  setCachedOrders,
  upsertCachedOrder,
  type IncomingOrder,
} from './orders-cache';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const order = (id: string): IncomingOrder => ({
  id,
  orderNumber: `ORD-${id}`,
  customerName: 'Customer',
  customerPhone: '0500000000',
  deliveryDatetime: '2026-08-26T10:00:00.000Z',
  totalPrice: 100,
  status: 'New',
  isUrgent: false,
});

describe('orders cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('distinguishes a missing cache from a cached empty result', async () => {
    await expect(getCachedOrders('user-1')).resolves.toBeNull();

    await setCachedOrders('user-1', []);

    await expect(getCachedOrders('user-1')).resolves.toEqual([]);
  });

  it('isolates orders by user and can update a cached order', async () => {
    await setCachedOrders('user-1', [order('one')]);
    await setCachedOrders('user-2', [order('two')]);
    await upsertCachedOrder('user-1', {
      ...order('one'),
      status: 'Delivered',
    });

    await expect(getCachedOrders('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'one', status: 'Delivered' }),
    ]);
    await expect(getCachedOrders('user-2')).resolves.toEqual([
      expect.objectContaining({ id: 'two', status: 'New' }),
    ]);
  });

  it('isolates delivery totals by user, date, and shop', async () => {
    const firstTotals = {
      deliveredTotal: 100,
      deliveredCount: 1,
      undeliveredTotal: 200,
      undeliveredCount: 2,
    };
    const secondTotals = {
      deliveredTotal: 300,
      deliveredCount: 3,
      undeliveredTotal: 400,
      undeliveredCount: 4,
    };

    await setCachedDeliveryTotals('user-1', '2026-08-26', 'shop-1', firstTotals);
    await setCachedDeliveryTotals('user-1', '2026-08-26', 'shop-2', secondTotals);

    await expect(
      getCachedDeliveryTotals('user-1', '2026-08-26', 'shop-1'),
    ).resolves.toEqual(firstTotals);
    await expect(
      getCachedDeliveryTotals('user-1', '2026-08-26', 'shop-2'),
    ).resolves.toEqual(secondTotals);
    await expect(
      getCachedDeliveryTotals('user-2', '2026-08-26', 'shop-1'),
    ).resolves.toBeNull();
    await expect(
      getCachedDeliveryTotals('user-1', '2026-08-27', 'shop-1'),
    ).resolves.toBeNull();
  });
});
