CREATE TYPE "MoldBaseType" AS ENUM ('None', 'Foam', 'Cake');

ALTER TABLE "OrderItem"
  ADD COLUMN "moldBaseType" "MoldBaseType" NOT NULL DEFAULT 'None',
  ADD COLUMN "cakeLayerCount" INTEGER;

UPDATE "OrderItem"
SET "moldBaseType" = CASE
  WHEN "withFoam" = TRUE THEN 'Foam'::"MoldBaseType"
  ELSE 'None'::"MoldBaseType"
END;

ALTER TABLE "OrderItem" DROP COLUMN "withFoam";
