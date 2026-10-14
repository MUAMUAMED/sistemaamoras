CREATE TYPE "FiscalEnvironment" AS ENUM ('HOMOLOGATION', 'PRODUCTION');
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'DENIED', 'CONTINGENCY', 'CANCELLED', 'VOIDED', 'ERROR');

ALTER TABLE "products"
ADD COLUMN "ncm" TEXT,
ADD COLUMN "cest" TEXT,
ADD COLUMN "cfop" TEXT,
ADD COLUMN "fiscalOrigin" TEXT NOT NULL DEFAULT '0',
ADD COLUMN "unitOfMeasure" TEXT NOT NULL DEFAULT 'UN',
ADD COLUMN "icmsCst" TEXT,
ADD COLUMN "icmsRate" DECIMAL(7,4),
ADD COLUMN "pisCst" TEXT,
ADD COLUMN "cofinsCst" TEXT;

ALTER TABLE "sales" ADD COLUMN "customerTaxId" TEXT;

CREATE TABLE "fiscal_config" (
  "id" TEXT NOT NULL DEFAULT 'default', "active" BOOLEAN NOT NULL DEFAULT false,
  "companyName" TEXT NOT NULL, "tradeName" TEXT, "taxId" TEXT NOT NULL, "stateTaxId" TEXT NOT NULL,
  "taxRegime" INTEGER NOT NULL, "stateCode" TEXT NOT NULL, "cityCode" TEXT NOT NULL, "cityName" TEXT NOT NULL,
  "street" TEXT NOT NULL, "streetNumber" TEXT NOT NULL, "district" TEXT NOT NULL, "zipCode" TEXT NOT NULL,
  "addressComplement" TEXT, "environment" "FiscalEnvironment" NOT NULL DEFAULT 'HOMOLOGATION',
  "nfeSeries" INTEGER NOT NULL DEFAULT 1, "nfceSeries" INTEGER NOT NULL DEFAULT 1,
  "nextNfeNumber" INTEGER NOT NULL DEFAULT 1, "nextNfceNumber" INTEGER NOT NULL DEFAULT 1,
  "cscId" TEXT, "cscTokenEncrypted" TEXT, "certificatePfxEncrypted" TEXT,
  "certificatePasswordEncrypted" TEXT, "certificateValidUntil" TIMESTAMP(3),
  "defaultNcm" TEXT, "defaultCfop" TEXT, "defaultIcmsCst" TEXT, "defaultPisCst" TEXT, "defaultCofinsCst" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fiscal_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fiscal_documents" (
  "id" TEXT NOT NULL, "saleId" TEXT NOT NULL, "model" INTEGER NOT NULL, "series" INTEGER NOT NULL,
  "number" INTEGER NOT NULL, "accessKey" TEXT, "operationNature" TEXT NOT NULL DEFAULT 'VENDA',
  "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'PENDING', "environment" "FiscalEnvironment" NOT NULL,
  "requestXml" TEXT, "responseXml" TEXT, "protocolXml" TEXT, "protocolNumber" TEXT,
  "statusCode" INTEGER, "statusMessage" TEXT, "recipientTaxId" TEXT, "recipientName" TEXT,
  "totalAmount" DECIMAL(14,2) NOT NULL, "paymentSnapshot" JSONB, "isContingency" BOOLEAN NOT NULL DEFAULT false,
  "contingencyReason" TEXT, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorizedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fiscal_document_items" (
  "id" TEXT NOT NULL, "documentId" TEXT NOT NULL, "productId" TEXT, "itemNumber" INTEGER NOT NULL,
  "productCode" TEXT NOT NULL, "description" TEXT NOT NULL, "ncm" TEXT NOT NULL, "cest" TEXT,
  "cfop" TEXT NOT NULL, "unitOfMeasure" TEXT NOT NULL, "quantity" DECIMAL(14,4) NOT NULL,
  "unitPrice" DECIMAL(14,4) NOT NULL, "totalPrice" DECIMAL(14,2) NOT NULL, "fiscalOrigin" TEXT NOT NULL,
  "icmsCst" TEXT NOT NULL, "icmsRate" DECIMAL(7,4), "pisCst" TEXT NOT NULL, "cofinsCst" TEXT NOT NULL,
  CONSTRAINT "fiscal_document_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fiscal_events" (
  "id" TEXT NOT NULL, "documentId" TEXT NOT NULL, "type" TEXT NOT NULL, "sequence" INTEGER NOT NULL DEFAULT 1,
  "protocolNumber" TEXT, "statusCode" INTEGER, "reason" TEXT, "requestXml" TEXT, "responseXml" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fiscal_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fiscal_documents_accessKey_key" ON "fiscal_documents"("accessKey");
CREATE UNIQUE INDEX "fiscal_documents_model_series_number_key" ON "fiscal_documents"("model", "series", "number");
CREATE INDEX "fiscal_documents_saleId_status_idx" ON "fiscal_documents"("saleId", "status");
CREATE INDEX "fiscal_document_items_documentId_idx" ON "fiscal_document_items"("documentId");
CREATE INDEX "fiscal_events_documentId_type_idx" ON "fiscal_events"("documentId", "type");

ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_document_items" ADD CONSTRAINT "fiscal_document_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "fiscal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fiscal_events" ADD CONSTRAINT "fiscal_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "fiscal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
