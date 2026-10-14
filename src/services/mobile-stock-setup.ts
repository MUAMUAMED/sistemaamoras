import { prisma } from '../config/database';

// Compatível com o deploy existente, que não usa prisma migrate deploy.
// Somente cria estruturas novas; nunca altera saldos ou registros operacionais.
export async function ensureMobileStockSetup() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(72301922)`;
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS inventory_sessions (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP(3), result JSONB
    )`);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS inventory_sessions_user_status_idx ON inventory_sessions ("userId", status)`);
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS inventory_items (
      "sessionId" TEXT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
      "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      "expectedQuantity" INTEGER NOT NULL, "countedQuantity" INTEGER NOT NULL DEFAULT 0,
      "snapshotUpdatedAt" TIMESTAMP(3) NOT NULL,
      PRIMARY KEY ("sessionId", "productId"), CHECK ("countedQuantity" >= 0)
    )`);
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS inventory_requests (
      id TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
      payload TEXT NOT NULL
    )`);
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS stock_operations (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, payload TEXT NOT NULL, result JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}
