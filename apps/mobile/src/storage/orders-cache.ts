import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShopSummary } from '@sugarprecision/shared-types';
import type { FactoryReportOrderItem } from '../lib/factory-order-report';

export interface IncomingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  deliveryDatetime: string;
  deliveredAt?: string | null;
  totalPrice: number;
  status: string;
  isUrgent: boolean;
  notes?: string | null;
  items?: FactoryReportOrderItem[];
  shop?: {
    id: string;
    name: string;
  } | null;
  moldDeliveryShop?: {
    name: string;
    location: string;
  } | null;
}

export interface DeliveryTotals {
  deliveredTotal: number;
  deliveredCount: number;
  undeliveredTotal: number;
  undeliveredCount: number;
}

const CACHE_PREFIX = '@sugarprecision/incoming-orders/v1';

function scopedKey(userId: string, resource: string) {
  return `${CACHE_PREFIX}/${encodeURIComponent(userId)}/${resource}`;
}

function totalsScope(dateKey: string, shopId?: string) {
  return `${encodeURIComponent(dateKey)}/${encodeURIComponent(shopId || 'all')}`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Ignoring invalid cached data for ${key}`, error);
    return null;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getCachedOrders(
  userId: string,
): Promise<IncomingOrder[] | null> {
  const value = await readJson<unknown>(scopedKey(userId, 'orders'));
  return Array.isArray(value) ? (value as IncomingOrder[]) : null;
}

export async function setCachedOrders(
  userId: string,
  orders: IncomingOrder[],
) {
  await writeJson(scopedKey(userId, 'orders'), orders);
}

export async function upsertCachedOrder(
  userId: string,
  order: IncomingOrder,
) {
  const cachedOrders = await getCachedOrders(userId);
  if (cachedOrders === null) {
    await setCachedOrders(userId, [order]);
    return;
  }

  const existingIndex = cachedOrders.findIndex((entry) => entry.id === order.id);
  const nextOrders = [...cachedOrders];
  if (existingIndex >= 0) {
    nextOrders[existingIndex] = order;
  } else {
    nextOrders.push(order);
  }
  await setCachedOrders(userId, nextOrders);
}

export async function getCachedShops(
  userId: string,
): Promise<ShopSummary[] | null> {
  const value = await readJson<unknown>(scopedKey(userId, 'shops'));
  return Array.isArray(value) ? (value as ShopSummary[]) : null;
}

export async function setCachedShops(
  userId: string,
  shops: ShopSummary[],
) {
  await writeJson(scopedKey(userId, 'shops'), shops);
}

export async function getCachedDeliveryTotals(
  userId: string,
  dateKey: string,
  shopId?: string,
): Promise<DeliveryTotals | null> {
  return readJson<DeliveryTotals>(
    scopedKey(userId, `delivery-totals/${totalsScope(dateKey, shopId)}`),
  );
}

export async function setCachedDeliveryTotals(
  userId: string,
  dateKey: string,
  shopId: string | undefined,
  totals: DeliveryTotals,
) {
  await writeJson(
    scopedKey(userId, `delivery-totals/${totalsScope(dateKey, shopId)}`),
    totals,
  );
}

export async function getLastSuccessfulSync(userId: string) {
  return AsyncStorage.getItem(scopedKey(userId, 'last-successful-sync'));
}

export async function setLastSuccessfulSync(
  userId: string,
  timestamp: string,
) {
  await AsyncStorage.setItem(
    scopedKey(userId, 'last-successful-sync'),
    timestamp,
  );
}
