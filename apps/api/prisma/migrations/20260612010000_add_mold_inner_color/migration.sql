DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MoldInnerColor') THEN
    CREATE TYPE "MoldInnerColor" AS ENUM ('White', 'Black', 'Mixed');
  END IF;
END $$;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "moldInnerColor" "MoldInnerColor";

UPDATE "OrderItem"
SET "moldInnerColor" = ("moldFlavor"::text)::"MoldInnerColor"
WHERE "moldInnerColor" IS NULL
  AND "moldFlavor"::text IN ('White', 'Black', 'Mixed');
