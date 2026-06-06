import {
  CakeShape,
  CakeType,
  EssentialsCategory,
  EssentialsStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  ShopType,
  UserRole,
} from './enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  shopId?: string | null;
}

export interface OrderItemInput {
  cakeType: CakeType;
  layers: number;
  shape: CakeShape;
  filling: string;
  specialDetails?: string;
  peopleCount: number;
  referenceImages: string[];
}

export interface CreateOrderInput {
  shopId?: string;
  moldDeliveryShopId?: string;
  customerName: string;
  customerPhone: string;
  deliveryDatetime: string;
  totalPrice: number;
  depositAmount: number;
  paymentStatus: PaymentStatus;
  isUrgent: boolean;
  notes?: string;
  items: OrderItemInput[];
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  shopId: string;
  moldDeliveryShopId?: string | null;
  customerName: string;
  deliveryDatetime: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  isUrgent: boolean;
  totalPrice: number;
  shopName?: string;
  moldDeliveryShopName?: string;
}

export interface ShopSummary {
  id: string;
  name: string;
  location: string;
  contactInfo?: string | null;
  type: ShopType;
}

export interface DailyEssentialInput {
  shopId?: string;
  category: EssentialsCategory;
  itemName: string;
  quantity: number;
  notes?: string;
  targetDate: string;
  status?: EssentialsStatus;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  payload?: Record<string, unknown>;
  createdAt: string;
}
