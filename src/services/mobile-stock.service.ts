import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class StockError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const stockProductInclude = { size: true, category: true, subcategory: true, pattern: true,
  images: { select: { id: true, url: true, position: true, type: true } } };

// A transação é repetida apenas quando o PostgreSQL detecta concorrência.
export async function stockTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 60000 }); }
    catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || (error.code === 'P2010' && ['40001', '40P01'].includes(String(error.meta?.code))));
      if (!conflict) throw error;
      if (attempt >= 3) throw new StockError(409, 'Outro operador alterou o estoque ao mesmo tempo. Tente novamente.');
    }
  }
}

export async function ownedSession(tx: Prisma.TransactionClient, id: string, userId: string, open = true) {
  await tx.$queryRaw`SELECT id FROM inventory_sessions WHERE id = ${id} FOR UPDATE`;
  const session = await tx.inventorySession.findUnique({ where: { id } });
  if (!session || session.userId !== userId) throw new StockError(404, 'Conferência não encontrada para este usuário.');
  if (open && session.status !== 'OPEN') throw new StockError(409, 'Esta conferência já foi encerrada.');
  return session;
}

export async function sessionDetails(tx: Prisma.TransactionClient, id: string) {
  return tx.inventorySession.findUniqueOrThrow({ where: { id }, include: { items: {
    orderBy: { productId: 'asc' }, include: { product: { include: stockProductInclude } },
  } } });
}

export async function startInventory(userId: string) {
  return stockTransaction(async (tx) => {
    // Uma conferência de toda a loja por vez evita duas baixas concorrentes.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(72301921)`;
    const existing = await tx.inventorySession.findFirst({ where: { status: 'OPEN' } });
    if (existing) {
      if (existing.userId !== userId) throw new StockError(409, 'Outra pessoa já está conferindo a loja. Encerre a conferência atual antes de iniciar outra.');
      return sessionDetails(tx, existing.id);
    }
    const products = await tx.product.findMany({ where: { active: true, isDraft: false, stockLoja: { gt: 0 } } });
    const session = await tx.inventorySession.create({ data: { userId } });
    if (products.length) await tx.inventoryItem.createMany({ data: products.map((p) => ({
      sessionId: session.id, productId: p.id, expectedQuantity: p.stockLoja, snapshotUpdatedAt: p.updatedAt,
    })) });
    return sessionDetails(tx, session.id);
  });
}

export async function countInventory(userId: string, sessionId: string, productId: string, mode: 'ADD' | 'SET', quantity: number, requestId: string) {
  return stockTransaction(async (tx) => {
    await ownedSession(tx, sessionId, userId);
    const payload = JSON.stringify({ sessionId, productId, mode, quantity });
    const previous = await tx.inventoryRequest.findUnique({ where: { id: requestId } });
    if (previous) {
      if (previous.payload !== payload) throw new StockError(409, 'Identificador de leitura já utilizado com outros dados.');
      return tx.inventoryItem.findUniqueOrThrow({ where: { sessionId_productId: { sessionId, productId } }, include: { product: { include: stockProductInclude } } });
    }
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || !product.active || product.isDraft) throw new StockError(404, 'Roupa não encontrada ou inativa.');
    const item = await tx.inventoryItem.findUnique({ where: { sessionId_productId: { sessionId, productId } } });
    const countedQuantity = mode === 'ADD' ? (item?.countedQuantity || 0) + quantity : quantity;
    if (countedQuantity > 1000000) throw new StockError(400, 'Quantidade excede o limite da conferência.');
    const result = await tx.inventoryItem.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      create: { sessionId, productId, expectedQuantity: product.stockLoja, snapshotUpdatedAt: product.updatedAt, countedQuantity },
      update: { countedQuantity }, include: { product: { include: stockProductInclude } },
    });
    await tx.inventoryRequest.create({ data: { id: requestId, sessionId, payload } });
    await tx.inventorySession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    return result;
  });
}

export async function inventoryReview(tx: Prisma.TransactionClient, sessionId: string) {
  const session = await sessionDetails(tx, sessionId);
  const items = session.items.map((item) => ({ ...item,
    delta: item.countedQuantity - item.expectedQuantity,
    // Mesmo uma saída seguida de entrada (saldo igual) exige recontagem.
    conflict: !item.product.active || item.product.isDraft || item.product.updatedAt.getTime() !== item.snapshotUpdatedAt.getTime(),
  }));
  const newProducts = await tx.product.findMany({ where: {
    active: true, isDraft: false, stockLoja: { gt: 0 },
    id: { notIn: items.map((item) => item.productId) },
  }, include: stockProductInclude });
  const digest = items.map((i) => [i.productId, i.expectedQuantity, i.countedQuantity, i.product.updatedAt.toISOString(), i.product.active, i.product.isDraft]);
  const reviewToken = createHash('sha256').update(JSON.stringify({ id: session.id, digest, newProducts: newProducts.map((p) => [p.id, p.updatedAt.toISOString()]).sort() })).digest('hex');
  return { sessionId, reviewToken, items, newProducts, summary: {
    products: items.length, counted: items.reduce((sum, i) => sum + i.countedQuantity, 0),
    missing: items.filter((i) => !i.conflict && i.delta < 0).reduce((sum, i) => sum - i.delta, 0),
    surplus: items.filter((i) => !i.conflict && i.delta > 0).reduce((sum, i) => sum + i.delta, 0),
    conflicts: items.filter((i) => i.conflict).length + newProducts.length,
  } };
}

export async function refreshInventoryItem(userId: string, sessionId: string, productId: string) {
  return stockTransaction(async (tx) => {
    await ownedSession(tx, sessionId, userId);
    const p = await tx.product.findUnique({ where: { id: productId } });
    if (!p || !p.active || p.isDraft) throw new StockError(409, 'O produto ficou inativo. Cancele esta conferência e inicie outra.');
    await tx.inventoryItem.upsert({ where: { sessionId_productId: { sessionId, productId } },
      create: { sessionId, productId, expectedQuantity: p.stockLoja, snapshotUpdatedAt: p.updatedAt },
      update: { expectedQuantity: p.stockLoja, snapshotUpdatedAt: p.updatedAt, countedQuantity: 0 },
    });
    await tx.inventorySession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    return sessionDetails(tx, sessionId);
  });
}

export async function finalizeInventory(userId: string, sessionId: string, reviewToken: string, allowEmpty: boolean) {
  return stockTransaction(async (tx) => {
    const session = await ownedSession(tx, sessionId, userId, false);
    if (session.status === 'COMPLETED') return session.result; // Reenvio após perda de conexão.
    if (session.status !== 'OPEN') throw new StockError(409, 'Esta conferência foi cancelada.');
    // Bloqueia os produtos antes de recalcular a revisão e gravar as baixas.
    await tx.$queryRaw`SELECT p.id FROM products p INNER JOIN inventory_items i ON i."productId" = p.id WHERE i."sessionId" = ${sessionId} ORDER BY p.id FOR UPDATE OF p`;
    const review = await inventoryReview(tx, sessionId);
    if (review.reviewToken !== reviewToken) throw new StockError(409, 'Os dados mudaram desde a revisão. Revise novamente antes de confirmar.');
    if (review.summary.conflicts) throw new StockError(409, 'Há produtos alterados durante a conferência. Atualize e reconte esses produtos antes de finalizar.');
    if (!review.summary.counted && !allowEmpty) throw new StockError(400, 'Nenhuma peça foi contada. Confirme explicitamente que a loja está vazia.');
    for (const item of review.items.filter((i) => i.delta !== 0)) {
      const p = item.product;
      const changed = await tx.product.updateMany({ where: { id: p.id, updatedAt: p.updatedAt, stockLoja: item.expectedQuantity }, data: {
        stockLoja: item.countedQuantity, stock: item.countedQuantity + p.stockArmazem,
      } });
      if (changed.count !== 1) throw new StockError(409, 'O estoque foi alterado durante a baixa. Revise novamente.');
      await tx.stockMovement.create({ data: {
        productId: p.id, type: 'ADJUSTMENT', quantity: item.delta, location: 'LOJA', userId,
        reference: sessionId, reason: `Conferência física da loja: esperado ${item.expectedQuantity}, encontrado ${item.countedQuantity}. ${item.delta < 0 ? 'Baixa de peças ausentes; possível venda não cadastrada.' : 'Ajuste de peças excedentes.'}`,
      } });
    }
    const result = { ...review.summary, sessionId, completedAt: new Date().toISOString() };
    await tx.inventorySession.update({ where: { id: sessionId }, data: { status: 'COMPLETED', completedAt: new Date(), result } });
    return result;
  });
}

export async function adjustRestock(userId: string, productId: string, location: 'LOJA' | 'ARMAZEM', delta: number, reason: string, requestId: string) {
  return stockTransaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`;
    const payload = JSON.stringify({ productId, location, delta, reason });
    const previous = await tx.stockOperation.findUnique({ where: { id: requestId } });
    if (previous) {
      if (previous.userId !== userId || previous.payload !== payload) throw new StockError(409, 'Identificador de ajuste já utilizado com outros dados.');
      return previous.result;
    }
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
    const p = await tx.product.findUnique({ where: { id: productId } });
    if (!p || !p.active || p.isDraft) throw new StockError(404, 'Roupa não encontrada ou inativa.');
    const field = location === 'LOJA' ? 'stockLoja' : 'stockArmazem';
    if (p[field] + delta < 0) throw new StockError(409, `Saldo insuficiente: há ${p[field]} unidades neste local.`);
    const product = await tx.product.update({ where: { id: productId }, data: {
      [field]: { increment: delta }, stock: p.stockLoja + p.stockArmazem + delta,
    }, include: stockProductInclude });
    await tx.stockMovement.create({ data: { productId, userId, location, type: delta > 0 ? 'ENTRY' : 'EXIT',
      quantity: delta, reference: requestId, reason: `Reposição: ${reason}` } });
    const result = JSON.parse(JSON.stringify({ product })) as Prisma.InputJsonValue;
    await tx.stockOperation.create({ data: { id: requestId, userId, payload, result } });
    return result;
  });
}
