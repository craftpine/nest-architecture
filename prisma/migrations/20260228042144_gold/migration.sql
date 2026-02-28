-- CreateTable
CREATE TABLE "gold_prices" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "goldType" TEXT NOT NULL,
    "buyPrice" DOUBLE PRECISION,
    "sellPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gold_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gold_prices_type_goldType_timestamp_idx" ON "gold_prices"("type", "goldType", "timestamp");

-- CreateIndex
CREATE INDEX "gold_prices_type_timestamp_idx" ON "gold_prices"("type", "timestamp");

-- CreateIndex
CREATE INDEX "gold_prices_timestamp_idx" ON "gold_prices"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "gold_prices_type_goldType_source_timestamp_key" ON "gold_prices"("type", "goldType", "source", "timestamp");
