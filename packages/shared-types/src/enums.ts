export enum ShopType {
  BRANCH = 'Branch',
  FACTORY = 'Factory',
}

export enum UserRole {
  ADMIN = 'Admin',
  FACTORY_MANAGER = 'FactoryManager',
  SHOP_MANAGER = 'ShopManager',
  SHOP_EMPLOYEE = 'ShopEmployee',
}

export enum PaymentStatus {
  UNPAID = 'Unpaid',
  PARTIAL = 'Partial',
  PAID = 'Paid',
}

export enum OrderStatus {
  NEW = 'New',
  REVIEWING = 'Reviewing',
  IN_PRODUCTION = 'In_Production',
  READY = 'Ready',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

export enum CakeType {
  CAKE = 'Cake',
  DUMMY = 'Dummy',
  COVERED = 'Covered',
  UNCOVERED = 'Uncovered',
}

export enum CakeShape {
  ROUND = 'Round',
  SQUARE = 'Square',
  HEART = 'Heart',
  CUSTOM = 'Custom',
}

export enum OrderItemKind {
  PIECES = 'Pieces',
  MOLD = 'Mold',
}

export enum MoldFlavor {
  WHITE = 'White',
  BLACK = 'Black',
  MIXED = 'Mixed',
  CREAM = 'Cream',
  CHOCOLATE = 'Chocolate',
  HARISSA = 'Harissa',
}

export enum CakeFinish {
  NONE = 'None',
  DISK_ENLARGEMENT = 'Disk_Enlargement',
  COVERING = 'Covering',
}

export enum EssentialsCategory {
  READY_CAKE = 'Ready_Cake',
  RAW_MATERIALS = 'Raw_Materials',
  PIECES = 'Pieces',
  SUPPLIES = 'Supplies',
}

export enum EssentialsStatus {
  PENDING = 'Pending',
  PREPARED = 'Prepared',
  OUT_FOR_DELIVERY = 'Out_for_Delivery',
}

export enum OrderPriority {
  NORMAL = 'Normal',
  URGENT = 'Urgent',
}

export enum PrintJobStatus {
  PENDING = 'Pending',
  SENT = 'Sent',
  FAILED = 'Failed',
}
