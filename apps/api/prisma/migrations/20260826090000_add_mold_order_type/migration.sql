DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MoldOrderType') THEN
    CREATE TYPE "MoldOrderType" AS ENUM ('STANDARD', 'FRIDGE');
  END IF;
END $$;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "moldOrderType" "MoldOrderType" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "fridgeMoldName" TEXT;
