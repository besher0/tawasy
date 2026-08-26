import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import api from '../lib/api';
import { getDeliveryTotalsDateRange } from '../services/orders-sync.service';
import {
  setCachedOrders,
  type IncomingOrder,
} from '../storage/orders-cache';
import {
  deriveDeliveryTotals,
  filterIncomingOrders,
  IncomingOrdersScreen,
} from './incoming-orders.screen';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'cached-user',
      name: 'Cached User',
      phone: '0500000000',
      role: 'ShopEmployee',
      shopId: 'shop-1',
    },
  }),
}));

const makeOrder = (
  overrides: Partial<IncomingOrder> & Pick<IncomingOrder, 'id'>,
): IncomingOrder => ({
  orderNumber: `ORD-${overrides.id}`,
  customerName: 'Default Customer',
  customerPhone: '0500000000',
  deliveryDatetime: '2026-08-26T10:00:00',
  totalPrice: 100,
  status: 'New',
  isUrgent: false,
  ...overrides,
});

describe('offline incoming-order projections', () => {
  const orders = [
    makeOrder({
      id: 'one',
      orderNumber: 'ORD-ALPHA',
      customerName: 'Alice Bakery',
      customerPhone: '0501111111',
      shop: { id: 'shop-1', name: 'First' },
    }),
    makeOrder({
      id: 'two',
      orderNumber: 'ORD-BETA',
      customerName: 'Bob Cakes',
      customerPhone: '0502222222',
      deliveryDatetime: '2026-08-27T10:00:00',
      status: 'Cancelled',
      shop: { id: 'shop-2', name: 'Second' },
    }),
  ];

  it.each([
    ['ord-alpha', 'one'],
    ['alice', 'one'],
    ['0502222222', 'two'],
  ])('searches cached orders locally for %s', (search, expectedId) => {
    const result = filterIncomingOrders(orders, {
      search,
      cancellation: 'all',
      deliveryDate: '',
      shopId: '',
      isFactoryView: true,
    });

    expect(result.map((order) => order.id)).toEqual([expectedId]);
  });

  it('combines cancellation, date, and factory-shop filters locally', () => {
    const result = filterIncomingOrders(orders, {
      search: '',
      cancellation: 'active',
      deliveryDate: '2026-08-26',
      shopId: 'shop-1',
      isFactoryView: true,
    });

    expect(result.map((order) => order.id)).toEqual(['one']);
  });

  it('derives delivery totals with the same status and date boundaries as the API', () => {
    const dateKey = '2026-08-26';
    const range = getDeliveryTotalsDateRange(dateKey);
    const totals = deriveDeliveryTotals(
      [
        makeOrder({
          id: 'delivered',
          status: 'Delivered',
          deliveredAt: new Date(
            new Date(range.start).getTime() + 60_000,
          ).toISOString(),
          totalPrice: 125,
          shop: { id: 'shop-1', name: 'First' },
        }),
        makeOrder({
          id: 'pending',
          deliveryDatetime: new Date(
            new Date(range.start).getTime() + 120_000,
          ).toISOString(),
          totalPrice: 250,
          shop: { id: 'shop-1', name: 'First' },
        }),
        makeOrder({
          id: 'other-shop',
          totalPrice: 500,
          shop: { id: 'shop-2', name: 'Second' },
        }),
      ],
      dateKey,
      'shop-1',
      true,
    );

    expect(totals).toEqual({
      deliveredTotal: 125,
      deliveredCount: 1,
      undeliveredTotal: 250,
      undeliveredCount: 1,
    });
  });
});

describe('IncomingOrdersScreen cache-first behavior', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders a cached order and searches it without requesting the API', async () => {
    await setCachedOrders('cached-user', [
      makeOrder({
        id: 'cached',
        customerName: 'Cached Customer',
        customerPhone: '0509999999',
      }),
    ]);
    const apiGet = jest.spyOn(api, 'get').mockRejectedValue(new Error('offline'));
    const screen = render(React.createElement(IncomingOrdersScreen));

    await waitFor(() =>
      expect(screen.getByText('Cached Customer')).toBeTruthy(),
    );
    expect(apiGet).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByPlaceholderText('بحث عن طلب أو عميل'),
      '0509999999',
    );

    expect(screen.getByText('Cached Customer')).toBeTruthy();
    expect(apiGet).not.toHaveBeenCalled();
  });
});
