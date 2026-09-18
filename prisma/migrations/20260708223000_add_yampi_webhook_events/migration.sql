CREATE TABLE "yampi_webhook_events" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "yampiOrderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "saleId" TEXT,
  "payload" JSONB NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "yampi_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "yampi_webhook_events_eventKey_key" ON "yampi_webhook_events"("eventKey");
CREATE INDEX "yampi_webhook_events_yampiOrderId_idx" ON "yampi_webhook_events"("yampiOrderId");
