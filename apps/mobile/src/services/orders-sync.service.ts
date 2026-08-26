import { ShopType } from '@sugarprecision/shared-types';
import type { ShopSummary } from '@sugarprecision/shared-types';
import api from '../lib/api';
import {
  type DeliveryTotals,
  type IncomingOrder,
  setCachedDeliveryTotals,
  setCachedOrders,
  setCachedShops,
  setLastSuccessfulSync,
} from '../storage/orders-cache';

export interface SyncIncomingOrdersOptions {
  userId: string;
  isFactoryView: boolean;
  totalsDateKey: string;
  shopId?: string;
}

type SyncResource = 'orders' | 'shops' | 'deliveryTotals' | 'lastSuccessfulSync';

export interface IncomingOrdersSyncResult {
  orders?: IncomingOrder[];
  shops?: ShopSummary[];
  deliveryTotals?: DeliveryTotals;
  lastSuccessfulSync?: string;
  errors: Partial<Record<SyncResource, unknown>>;
}

type SyncRequestListener = () => void;
const syncRequestListeners = new Set<SyncRequestListener>();

export function subscribeToIncomingOrdersSyncRequests(
  listener: SyncRequestListener,
) {
  syncRequestListeners.add(listener);
  return () => {
    syncRequestListeners.delete(listener);
  };
}

export function requestIncomingOrdersSync() {
  for (const listener of syncRequestListeners) {
    listener();
  }
}

export function getDeliveryTotalsDateRange(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function normalizeDeliveryTotals(value: Partial<DeliveryTotals>): DeliveryTotals {
  return {
    deliveredTotal: value.deliveredTotal ?? 0,
    deliveredCount: value.deliveredCount ?? 0,
    undeliveredTotal: value.undeliveredTotal ?? 0,
    undeliveredCount: value.undeliveredCount ?? 0,
  };
}

export async function syncIncomingOrders(
  options: SyncIncomingOrdersOptions,
): Promise<IncomingOrdersSyncResult> {
  const errors: IncomingOrdersSyncResult['errors'] = {};
  const result: IncomingOrdersSyncResult = { errors };
  const range = getDeliveryTotalsDateRange(options.totalsDateKey);

  const ordersRequest = api.get<IncomingOrder[]>('/orders');
  const totalsRequest = api.get<DeliveryTotals>('/analytics/delivery-totals', {
    params: {
      ...range,
      shopId: options.isFactoryView && options.shopId ? options.shopId : undefined,
    },
  });
  const shopsRequest = options.isFactoryView
    ? api.get<ShopSummary[]>('/shops', { params: { type: ShopType.BRANCH } })
    : null;

  const [ordersOutcome, totalsOutcome, shopsOutcome] = await Promise.all([
    ordersRequest.then(
      (response) => ({ data: response.data ?? [] }),
      (error: unknown) => ({ error }),
    ),
    totalsRequest.then(
      (response) => ({ data: normalizeDeliveryTotals(response.data ?? {}) }),
      (error: unknown) => ({ error }),
    ),
    shopsRequest
      ? shopsRequest.then(
          (response) => ({ data: response.data ?? [] }),
          (error: unknown) => ({ error }),
        )
      : Promise.resolve(null),
  ]);

  if ('data' in ordersOutcome) {
    result.orders = ordersOutcome.data;
    const timestamp = new Date().toISOString();
    result.lastSuccessfulSync = timestamp;

    try {
      await setCachedOrders(options.userId, ordersOutcome.data);
    } catch (error) {
      errors.orders = error;
    }

    try {
      await setLastSuccessfulSync(options.userId, timestamp);
    } catch (error) {
      errors.lastSuccessfulSync = error;
    }
  } else {
    errors.orders = ordersOutcome.error;
  }

  if ('data' in totalsOutcome) {
    result.deliveryTotals = totalsOutcome.data;
    try {
      await setCachedDeliveryTotals(
        options.userId,
        options.totalsDateKey,
        options.isFactoryView ? options.shopId : undefined,
        totalsOutcome.data,
      );
    } catch (error) {
      errors.deliveryTotals = error;
    }
  } else {
    errors.deliveryTotals = totalsOutcome.error;
  }

  if (shopsOutcome && 'data' in shopsOutcome) {
    result.shops = shopsOutcome.data;
    try {
      await setCachedShops(options.userId, shopsOutcome.data);
    } catch (error) {
      errors.shops = error;
    }
  } else if (shopsOutcome) {
    errors.shops = shopsOutcome.error;
  }

  return result;
}
