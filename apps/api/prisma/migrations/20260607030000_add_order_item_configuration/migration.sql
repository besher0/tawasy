DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderItemKind') THEN
    CREATE TYPE "OrderItemKind" AS ENUM ('Pieces', 'Mold');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MoldFlavor') THEN
    CREATE TYPE "MoldFlavor" AS ENUM ('White', 'Black', 'Mixed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CakeFinish') THEN
    CREATE TYPE "CakeFinish" AS ENUM ('None', 'Disk_Enlargement', 'Covering');
  END IF;
END $$;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "itemKind" "OrderItemKind" NOT NULL DEFAULT 'Mold',
  ADD COLUMN IF NOT EXISTS "pieceType" TEXT,
  ADD COLUMN IF NOT EXISTS "hasTopDecoration" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moldFlavor" "MoldFlavor",
  ADD COLUMN IF NOT EXISTS "hasFillings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "withFoam" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "finishType" "CakeFinish" NOT NULL DEFAULT 'None';

ALTER TABLE "OrderItem"
  ALTER COLUMN "cakeType" SET DEFAULT 'Cake',
  ALTER COLUMN "shape" DROP NOT NULL,
  ALTER COLUMN "filling" DROP NOT NULL,
  ALTER COLUMN "peopleCount" SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS "OrderItem_itemKind_idx" ON "OrderItem"("itemKind");
