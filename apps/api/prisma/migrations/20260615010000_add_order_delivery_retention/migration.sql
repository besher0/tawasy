ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

UPDATE "Order"
SET "deliveredAt" = "updatedAt"
WHERE "status" = 'Delivered' AND "deliveredAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Order_status_deliveredAt_idx"
ON "Order"("status", "deliveredAt");
