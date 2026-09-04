import { PrismaClient } from '@prisma/client';

let client: PrismaClient | null = null;

/** Banco isolado para vetores. Nunca compartilha o schema operacional do ERP. */
export function vectorDatabase(): PrismaClient {
  const url = process.env.VECTOR_DATABASE_URL;
  if (!url) throw new Error('Busca visual não configurada: defina VECTOR_DATABASE_URL para o PostgreSQL com pgvector.');
  if (!client) client = new PrismaClient({ datasources: { db: { url } } });
  return client;
}

export async function disconnectVectorDatabase() {
  await client?.$disconnect();
  client = null;
}
