CREATE TABLE "whatsapp_auth_credentials" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_auth_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_auth_keys" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "data" JSONB,
    CONSTRAINT "whatsapp_auth_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_auth_keys_category_keyId_key" ON "whatsapp_auth_keys"("category", "keyId");
