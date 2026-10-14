CREATE TABLE "whatsapp_report_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "groupJid" TEXT,
    "groupName" TEXT,
    "scheduledHour" INTEGER NOT NULL DEFAULT 18,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_report_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_report_logs" (
    "id" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DAILY_SALES',
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "error" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_report_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_report_logs_reportDate_kind_key" ON "whatsapp_report_logs"("reportDate", "kind");
CREATE INDEX "whatsapp_report_logs_status_attemptedAt_idx" ON "whatsapp_report_logs"("status", "attemptedAt");
