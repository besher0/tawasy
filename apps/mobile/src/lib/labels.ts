const roleLabels: Record<string, string> = {
  Admin: 'مدير النظام',
  FactoryManager: 'مدير المصنع',
  ShopManager: 'مدير الفرع',
  ShopEmployee: 'موظف الفرع',
};

const orderStatusLabels: Record<string, string> = {
  New: 'جديد',
  Reviewing: 'قيد المراجعة',
  In_Production: 'قيد الإنتاج',
  Ready: 'جاهز',
  Delivered: 'تم التسليم',
  Cancelled: 'ملغي',
};

const paymentStatusLabels: Record<string, string> = {
  Unpaid: 'غير مدفوع',
  Partial: 'مدفوع جزئياً',
  Paid: 'مدفوع',
};

const essentialsCategoryLabels: Record<string, string> = {
  Ready_Cake: 'كيك جاهز',
  Raw_Materials: 'مواد خام',
  Pieces: 'قطع',
  Supplies: 'مستلزمات',
};

const essentialsStatusLabels: Record<string, string> = {
  Pending: 'بانتظار التحضير',
  Prepared: 'تم التحضير',
  Out_for_Delivery: 'قيد التوصيل',
};

const cakeTypeLabels: Record<string, string> = {
  Cake: 'كيك',
  Dummy: 'مجسم',
  Covered: 'مغلف',
  Uncovered: 'غير مغلف',
};

const cakeShapeLabels: Record<string, string> = {
  Round: 'دائري',
  Square: 'مربع',
  Heart: 'قلب',
  Custom: 'مخصص',
};

export function roleLabel(value?: string | null) {
  return value ? roleLabels[value] ?? value : '-';
}

export function orderStatusLabel(value?: string | null) {
  return value ? orderStatusLabels[value] ?? value : '-';
}

export function paymentStatusLabel(value?: string | null) {
  return value ? paymentStatusLabels[value] ?? value : '-';
}

export function essentialsCategoryLabel(value?: string | null) {
  return value ? essentialsCategoryLabels[value] ?? value : '-';
}

export function essentialsStatusLabel(value?: string | null) {
  return value ? essentialsStatusLabels[value] ?? value : '-';
}

export function cakeTypeLabel(value?: string | null) {
  return value ? cakeTypeLabels[value] ?? value : '-';
}

export function cakeShapeLabel(value?: string | null) {
  return value ? cakeShapeLabels[value] ?? value : '-';
}
