import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { prisma } from '../config/database';
import { vectorDatabase } from '../config/vector-database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';
import { BarcodeService } from '../services/barcode.service';
import { embedImages, vectorLiteral, imageEmbeddingModel } from '../services/image-embedding.service';
import { ensureVisualSearchSetup } from '../services/product-image-embedding.service';
import { StockError, stockTransaction, stockProductInclude, ownedSession, sessionDetails, startInventory, countInventory,
  inventoryReview, refreshInventoryItem, finalizeInventory, adjustRestock } from '../services/mobile-stock.service';

const router = Router();
router.use(authenticateToken);
const route = (handler: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { handler(req, res).catch((error) => {
    if (error instanceof StockError) res.status(error.status).json({ error: error.message });
    else next(error);
  }); };
function requestId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(value)) throw new StockError(400, 'Identificador da operação inválido.');
  return value;
}
function quantity(value: unknown, min: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > 1000000) throw new StockError(400, 'Informe uma quantidade inteira válida.');
  return value;
}
function productId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 100) throw new StockError(400, 'Informe o produto.');
  return value;
}

router.get('/inventory/active', route(async (req, res) => {
  const session = await prisma.inventorySession.findFirst({ where: { userId: req.user!.id, status: 'OPEN' } });
  return res.json(session ? await sessionDetails(prisma, session.id) : null);
}));
router.post('/inventory', route(async (req, res) => res.status(201).json(await startInventory(req.user!.id))));
router.get('/inventory/:id', route(async (req, res) => {
  const session = await prisma.inventorySession.findUnique({ where: { id: req.params.id } });
  if (!session || session.userId !== req.user!.id) throw new StockError(404, 'Conferência não encontrada.');
  return res.json(await sessionDetails(prisma, session.id));
}));
router.post('/inventory/:id/count', route(async (req, res) => {
  const { code, mode = 'ADD' } = req.body;
  if (mode !== 'ADD' && mode !== 'SET') throw new StockError(400, 'Modo de contagem inválido.');
  const amount = quantity(req.body.quantity, mode === 'ADD' ? 1 : 0);
  const operation = requestId(req.body.requestId);
  let id: string;
  if (code !== undefined) {
    if (typeof code !== 'string' || !code.trim() || code.length > 100) throw new StockError(400, 'Código inválido.');
    const p = await BarcodeService.findProductByCode(code.trim());
    if (!p) throw new StockError(404, 'Etiqueta não encontrada. Confira o código ou cadastre a peça antes de continuar.');
    id = p.id;
  } else id = productId(req.body.productId);
  return res.json(await countInventory(req.user!.id, req.params.id, id, mode, amount, operation));
}));
router.get('/inventory/:id/review', route(async (req, res) => res.json(await stockTransaction(async (tx) => {
  await ownedSession(tx, req.params.id, req.user!.id);
  return inventoryReview(tx, req.params.id);
}))));
router.post('/inventory/:id/recount', route(async (req, res) => res.json(await refreshInventoryItem(req.user!.id, req.params.id, productId(req.body.productId)))));
router.post('/inventory/:id/finalize', route(async (req, res) => {
  if (typeof req.body.reviewToken !== 'string' || !/^[a-f0-9]{64}$/.test(req.body.reviewToken)) throw new StockError(400, 'Revise as baixas antes de confirmar.');
  return res.json(await finalizeInventory(req.user!.id, req.params.id, req.body.reviewToken, req.body.allowEmpty === true));
}));
router.post('/inventory/:id/cancel', route(async (req, res) => res.json(await stockTransaction(async (tx) => {
  await ownedSession(tx, req.params.id, req.user!.id);
  return tx.inventorySession.update({ where: { id: req.params.id }, data: { status: 'CANCELLED', completedAt: new Date() } });
}))));

// Ranking por PRODUTO, preservando tamanhos/variantes, sem gerar novos cadastros.
router.post('/restock/search', uploadProductImage.array('images', 2), route(async (req, res) => {
  const files = (req.files || []) as Express.Multer.File[];
  try {
    if (!files.length) throw new StockError(400, 'Envie uma ou duas fotos da roupa.');
    const vector = vectorLiteral(await embedImages(files.map((file) => ({ path: file.path, mimeType: file.mimetype }))));
    await ensureVisualSearchSetup();
    const model = imageEmbeddingModel();
    // Os vetores podem estar em outro PostgreSQL; os produtos ficam no ERP.
    const rows = await vectorDatabase().$queryRaw<{ productImageId: string; score: number }[]>(Prisma.sql`
      SELECT "productImageId", 1 - (embedding <=> ${vector}::vector) AS score
      FROM product_image_embeddings
      WHERE model IN (${model}, ${model.replace(/^google\//, '')})
      ORDER BY embedding <=> ${vector}::vector LIMIT 500
    `);
    const images = await prisma.productImage.findMany({ where: {
      id: { in: rows.map((r) => r.productImageId) }, type: 'ROUPA',
      product: { active: true, isDraft: false },
    }, select: { id: true, productId: true, product: { select: { patternId: true, categoryId: true, subcategoryId: true } } } });
    const scores = new Map(rows.map((row) => [row.productImageId, Number(row.score)]));
    const ranking = new Map<string, number>();
    images.forEach((image) => ranking.set(image.productId, Math.max(ranking.get(image.productId) ?? -1, scores.get(image.id) ?? -1)));
    // Uma variante sem foto própria também aparece ao lado dos tamanhos da mesma roupa.
    const families = images.filter((image) => image.product?.patternId).map((image) => ({
      patternId: image.product!.patternId, categoryId: image.product!.categoryId, subcategoryId: image.product!.subcategoryId,
    }));
    const products = await prisma.product.findMany({ where: { active: true, isDraft: false,
      OR: [{ id: { in: [...ranking.keys()] } }, ...families],
    }, include: stockProductInclude });
    const matches = products.map((product) => ({ product, score: ranking.get(product.id) ?? Math.max(-1, ...images.filter((image) =>
      image.product?.patternId && image.product.patternId === product.patternId && image.product.categoryId === product.categoryId && image.product.subcategoryId === product.subcategoryId
    ).map((image) => scores.get(image.id) ?? -1)) })).sort((a, b) => b.score - a.score || (a.product.size?.name || '').localeCompare(b.product.size?.name || '')).slice(0, 30);
    return res.json({ matches });
  } finally { await Promise.allSettled(files.map((file) => unlink(file.path))); }
}));
router.get('/products/:id', route(async (req, res) => {
  const product = await prisma.product.findFirst({ where: { id: req.params.id, active: true, isDraft: false }, include: stockProductInclude });
  if (!product) throw new StockError(404, 'Roupa não encontrada.');
  return res.json(product);
}));
router.post('/restock/adjust', route(async (req, res) => {
  const { location, delta, reason } = req.body;
  if (location !== 'LOJA' && location !== 'ARMAZEM') throw new StockError(400, 'Escolha loja ou armazém.');
  if (typeof delta !== 'number' || !Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1000000) throw new StockError(400, 'Informe um ajuste inteiro diferente de zero.');
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 300) throw new StockError(400, 'Informe o motivo do ajuste (até 300 caracteres).');
  return res.json(await adjustRestock(req.user!.id, productId(req.body.productId), location, delta, reason.trim(), requestId(req.body.requestId)));
}));

export default router;
