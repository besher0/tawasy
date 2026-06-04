DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShopType') THEN
    CREATE TYPE "ShopType" AS ENUM ('Branch', 'Factory');
  END IF;
END $$;

ALTER TABLE "Shop"
  ADD COLUMN IF NOT EXISTS "type" "ShopType" NOT NULL DEFAULT 'Branch'::"ShopType";

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "moldDeliveryShopId" TEXT;

UPDATE "Shop"
SET "type" = 'Factory'::"ShopType"
WHERE lower("name") LIKE '%factory%'
   OR "name" LIKE '%معمل%'
   OR "name" LIKE '%مصنع%';

UPDATE "Order"
SET "moldDeliveryShopId" = "shopId"
WHERE "moldDeliveryShopId" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_moldDeliveryShopId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_moldDeliveryShopId_fkey"
      FOREIGN KEY ("moldDeliveryShopId") REFERENCES "Shop"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Shop_type_idx" ON "Shop"("type");
CREATE INDEX IF NOT EXISTS "Order_moldDeliveryShopId_idx" ON "Order"("moldDeliveryShopId");
