# SugarPrecision Monorepo

مشروع كامل لإدارة إنتاج الكيك (`NestJS` + `React Native`) مبني وفق تصميم `stitch_sweetflow_bakery_manager`.

## Structure

- `apps/api`: باكند NestJS + Prisma + Redis Jobs + OpenAPI
- `apps/mobile`: تطبيق Expo React Native متعدد الأدوار (RTL)
- `packages/shared-types`: Enums وواجهات مشاركة بين الباكند والموبايل
- `infra/docker`: نشر On-Prem عبر Docker (Postgres + Redis + API)

## Implemented Core Scope

- Auth (هاتف + كلمة مرور + Access/Refresh JWT)
- Orders + Order Items + Status Workflow + Status History
- Production Kanban API
- Daily Essentials API
- Analytics (Overview / Trends / Top Products / Top Shops)
- Exports (Orders + Analytics Excel)
- Printing (Production Sheet PDF + Print Job + IPP fallback)
- Audit Logs
- Mobile Screens:
  - Login
  - Incoming Orders (grouped by delivery day)
  - Production Kanban
  - New Order
  - Daily Orders and Essentials
  - Analytics
  - Order Details
  - Profile

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
copy .env.example .env
```

3. Generate Prisma client

```bash
npm run db:generate
```

4. Run API (dev)

```bash
npm run dev:api
```

5. Run Mobile (dev)

```bash
npm run dev:mobile
```

6. API docs

- `http://localhost:3000/docs`

## Local Docker (On-Prem style)

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
docker compose -f infra/docker/docker-compose.yml exec api npx prisma migrate deploy
```

## Seed Users (from `apps/api/prisma/seed.ts`)

- `0500000001` / `12345678` => `Admin`
- `0500000002` / `12345678` => `FactoryManager`
- `0500000003` / `12345678` => `ShopEmployee`

## Notes

- مفعّل RTL افتراضياً في الموبايل.
- العملة الافتراضية SAR.
- التنبيهات داخلية فقط في v1 (بدون WhatsApp/SMS للعملاء).
- رفع الصور المرجعية عبر Cloudinary (`/uploads/order-reference`).
- الطباعة المباشرة تعتمد IPP وقد تحتاج توافق حسب نوع الطابعة.
