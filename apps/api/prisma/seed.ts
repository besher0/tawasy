import {
  CakeShape,
  CakeType,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  ShopType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('12345678', 10);

  const factory = await prisma.shop.upsert({
    where: { name: 'Factory HQ' },
    update: { type: ShopType.Factory },
    create: {
      name: 'Factory HQ',
      location: 'Riyadh Industrial District',
      contactInfo: '+966500000000',
      type: ShopType.Factory,
    },
  });

  const branchA = await prisma.shop.upsert({
    where: { name: 'Branch Riyadh - Olaya' },
    update: { type: ShopType.Branch },
    create: {
      name: 'Branch Riyadh - Olaya',
      location: 'Riyadh - Olaya',
      contactInfo: '+966511111111',
      type: ShopType.Branch,
    },
  });

  await prisma.user.upsert({
    where: { phone: '0500000001' },
    update: {},
    create: {
      name: 'System Admin',
      phone: '0500000001',
      role: UserRole.Admin,
      passwordHash,
    },
  });

  const factoryManager = await prisma.user.upsert({
    where: { phone: '0500000002' },
    update: {},
    create: {
      name: 'Factory Manager',
      phone: '0500000002',
      role: UserRole.FactoryManager,
      passwordHash,
      shopId: factory.id,
    },
  });

  const shopEmployee = await prisma.user.upsert({
    where: { phone: '0500000003' },
    update: {},
    create: {
      name: 'Shop Employee',
      phone: '0500000003',
      role: UserRole.ShopEmployee,
      passwordHash,
      shopId: branchA.id,
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: `SP-${Date.now()}`,
      shopId: branchA.id,
      moldDeliveryShopId: branchA.id,
      customerName: 'سارة أحمد',
      customerPhone: '0501234567',
      deliveryDatetime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      totalPrice: 1250,
      depositAmount: 500,
      paymentStatus: PaymentStatus.Partial,
      status: OrderStatus.Reviewing,
      isUrgent: true,
      notes: 'طلب تجريبي من seed',
      createdById: shopEmployee.id,
      items: {
        create: [
          {
            cakeType: CakeType.Cake,
            layers: 2,
            shape: CakeShape.Round,
            filling: 'شوكولاتة بالبندق',
            specialDetails: 'تصميم وردي مع زهور',
            peopleCount: 12,
            referenceImages: [],
          },
        ],
      },
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      previousStatus: OrderStatus.New,
      newStatus: OrderStatus.Reviewing,
      changedById: factoryManager.id,
      note: 'Seed review state',
    },
  });

  await prisma.printer.upsert({
    where: { id: 'default-printer-id' },
    update: {},
    create: {
      id: 'default-printer-id',
      name: 'Kitchen Printer',
      ipAddress: '192.168.1.50',
      port: 631,
      protocol: 'IPP',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
