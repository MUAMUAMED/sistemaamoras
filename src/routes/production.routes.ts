import { Router } from 'express';
import { Prisma, ProductImageType, StockLocation, StockMovementType } from '@prisma/client';
import QRCode from 'qrcode';
import { createHmac, timingSafeEqual } from 'crypto';
import { access, readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';

const router = Router();
const IMAGE_LIMIT = 2;
const DRAFT_TTL = 30 * 60 * 1000;

type DraftImage = { url: string; token: string };
type AiDraft = { name: string; categoryName: string; subcategoryName: string | null; patternName: string; description: string; confidence: number; notes: string[] };

const clean = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const secret = () => process.env.PRODUCTION_DRAFT_SECRET || process.env.JWT_SECRET || 'development-production-draft-secret';
const signature = (url: string, expiresAt: number) => createHmac('sha256', secret()).update(`${url}:${expiresAt}`).digest('hex');

function imageToken(url: string): string {
  const expiresAt = Date.now() + DRAFT_TTL;
  return `${expiresAt}.${signature(url, expiresAt)}`;
}

function validImage(image: DraftImage): boolean {
  const [rawExpiry, received] = image.token.split('.');
  const expiry = Number(rawExpiry);
  if (!Number.isFinite(expiry) || expiry < Date.now() || !received) return false;
  const expected = Buffer.from(signature(image.url, expiry), 'hex');
  const actual = Buffer.from(received, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseDraft(output: string): AiDraft {
  const json = output.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('A IA não retornou um rascunho válido.');
  const result = JSON.parse(json) as Partial<AiDraft>;
  const draft: AiDraft = {
    name: clean(result.name), categoryName: clean(result.categoryName), subcategoryName: clean(result.subcategoryName) || null,
    patternName: clean(result.patternName), description: clean(result.description), confidence: Number(result.confidence),
    notes: Array.isArray(result.notes) ? result.notes.map(clean).filter(Boolean).slice(0, 4) : [],
  };
  if (!draft.name || !draft.categoryName || !draft.patternName) throw new Error('A IA não retornou nome, categoria e estampa completos.');
  draft.confidence = Number.isFinite(draft.confidence) ? Math.max(0, Math.min(1, draft.confidence)) : 0;
  return draft;
}

async function createAiDraft(files: Express.Multer.File[]): Promise<AiDraft> {
  if (!process.env.OPENAI_API_KEY) throw new Error('A IA não está configurada. Defina OPENAI_API_KEY no serviço Zeabur.');
  const images = await Promise.all(files.map(async (file) => ({ type: 'input_image', image_url: `data:${file.mimetype};base64,${(await readFile(file.path)).toString('base64')}`, detail: 'high' })));
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini', temperature: 0.2, input: [{ role: 'user', content: [
      { type: 'input_text', text: 'Analise as fotos da mesma roupa. Responda somente JSON válido em português: {"name":"nome curto","categoryName":"categoria","subcategoryName":"subcategoria ou null","patternName":"nome da estampa ou identidade visual","description":"descrição objetiva","confidence":0.0,"notes":["observação"]}. Não invente marca, tecido ou tamanho. Se não houver estampa, crie uma identidade visual específica para a peça.' },
      ...images,
    ] }], }),
  });
  if (!response.ok) throw new Error(`Não foi possível gerar o rascunho com a IA (${response.status}).`);
  const body = await response.json() as { output_text?: string };
  if (!body.output_text) throw new Error('A IA retornou uma resposta vazia.');
  return parseDraft(body.output_text);
}

async function freeCode(tx: Prisma.TransactionClient, kind: 'category' | 'subcategory' | 'pattern', categoryId?: string): Promise<string> {
  const width = kind === 'pattern' ? 4 : 2;
  const rows = kind === 'category' ? await tx.category.findMany({ select: { code: true } }) : kind === 'subcategory' ? await tx.subcategory.findMany({ where: { categoryId }, select: { code: true } }) : await tx.pattern.findMany({ select: { code: true } });
  const used = new Set(rows.map((item) => item.code));
  for (let number = 1; number < 10 ** width; number += 1) { const code = String(number).padStart(width, '0'); if (!used.has(code)) return code; }
  throw new Error(`Não há códigos disponíveis para ${kind}.`);
}

async function categoryFor(tx: Prisma.TransactionClient, input: { id?: string; name?: string }) {
  if (input.id) { const value = await tx.category.findFirst({ where: { id: input.id, active: true } }); if (!value) throw new Error('Categoria inválida.'); return { value, created: false }; }
  const name = clean(input.name); if (!name) throw new Error('Informe uma categoria.');
  const existing = await tx.category.findFirst({ where: { name, active: true } });
  if (existing) return { value: existing, created: false };
  return { value: await tx.category.create({ data: { name, code: await freeCode(tx, 'category') } }), created: true };
}

async function subcategoryFor(tx: Prisma.TransactionClient, categoryId: string, input?: { id?: string; name?: string } | null) {
  if (!input?.id && !clean(input?.name)) return { value: null, created: false };
  if (input?.id) { const value = await tx.subcategory.findFirst({ where: { id: input.id, categoryId, active: true } }); if (!value) throw new Error('Subcategoria inválida para a categoria escolhida.'); return { value, created: false }; }
  const name = clean(input?.name); const existing = await tx.subcategory.findFirst({ where: { categoryId, name, active: true } });
  if (existing) return { value: existing, created: false };
  return { value: await tx.subcategory.create({ data: { name, categoryId, code: await freeCode(tx, 'subcategory', categoryId) } }), created: true };
}

async function patternFor(tx: Prisma.TransactionClient, input: { id?: string; name?: string }) {
  if (input.id) { const value = await tx.pattern.findFirst({ where: { id: input.id, active: true } }); if (!value) throw new Error('Estampa inválida.'); return { value, created: false }; }
  const name = clean(input.name); if (!name) throw new Error('Informe uma estampa ou identidade visual.');
  const existing = await tx.pattern.findFirst({ where: { name, active: true } });
  if (existing) return { value: existing, created: false };
  return { value: await tx.pattern.create({ data: { name, code: await freeCode(tx, 'pattern') } }), created: true };
}

router.post('/draft', authenticateToken, uploadProductImage.array('images', IMAGE_LIMIT), async (req, res, next) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length || files.length > IMAGE_LIMIT) return res.status(400).json({ error: 'Envie uma ou duas fotos da roupa.' });
    const draft = await createAiDraft(files);
    const images = files.map((file) => { const url = `/uploads/products/${file.filename}`; return { url, token: imageToken(url) }; });
    return res.status(201).json({ draft, images });
  } catch (error) { return next(error); }
});

router.post('/publish', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, description, category, subcategory, pattern, sizeId, price, stock, initialLocation = 'ARMAZEM', images = [] } = req.body as any;
    const productName = clean(name); const numericPrice = Number(price); const numericStock = Number(stock);
    if (!productName || !category || !pattern || !sizeId || !Number.isFinite(numericPrice) || numericPrice <= 0 || !Number.isInteger(numericStock) || numericStock < 0) return res.status(400).json({ error: 'Preencha nome, categoria, estampa, tamanho, preço e estoque válidos.' });
    if (!['LOJA', 'ARMAZEM'].includes(initialLocation)) return res.status(400).json({ error: 'Local inicial inválido.' });
    if (!Array.isArray(images) || !images.length || images.length > IMAGE_LIMIT || !images.every(validImage)) return res.status(400).json({ error: 'As fotos expiraram ou são inválidas. Gere o rascunho novamente.' });
    for (const image of images) { if (!/^\/uploads\/products\/product-[\w-]+\.[a-zA-Z0-9]+$/.test(image.url)) throw new Error('Caminho de imagem inválido.'); await access(path.resolve(process.cwd(), `.${image.url}`)); }
    const result = await prisma.$transaction(async (tx) => {
      const size = await tx.size.findFirst({ where: { id: sizeId, active: true } }); if (!size) throw new Error('Tamanho inválido.');
      const categoryResult = await categoryFor(tx, category); const subcategoryResult = await subcategoryFor(tx, categoryResult.value.id, subcategory); const patternResult = await patternFor(tx, pattern);
      const barcode = `${size.code}${categoryResult.value.code}${subcategoryResult.value?.code || '00'}${patternResult.value.code}`;
      const existing = await tx.product.findUnique({ where: { barcode } }); const qrcodeUrl = existing?.qrcodeUrl || await QRCode.toDataURL(barcode);
      const product = existing ? await tx.product.update({ where: { id: existing.id }, data: { price: numericPrice, description: clean(description) || existing.description, stock: { increment: numericStock }, stockLoja: initialLocation === 'LOJA' ? { increment: numericStock } : undefined, stockArmazem: initialLocation === 'ARMAZEM' ? { increment: numericStock } : undefined } }) : await tx.product.create({ data: { name: productName, categoryId: categoryResult.value.id, subcategoryId: subcategoryResult.value?.id, patternId: patternResult.value.id, sizeId, price: numericPrice, stock: numericStock, stockLoja: initialLocation === 'LOJA' ? numericStock : 0, stockArmazem: initialLocation === 'ARMAZEM' ? numericStock : 0, barcode, qrcodeUrl, description: clean(description) || null, status: 'ATIVO', inProduction: false, isDraft: false } });
      await tx.productImage.createMany({ data: images.map((image: DraftImage, position: number) => ({ productId: product.id, url: image.url, type: ProductImageType.ROUPA, position })) });
      if (numericStock > 0) await tx.stockMovement.create({ data: { productId: product.id, type: StockMovementType.ENTRY, quantity: numericStock, reason: existing ? 'Entrada via aplicativo de produção' : 'Cadastro via aplicativo de produção', location: initialLocation as StockLocation, userId: req.user!.id } });
      return { product: await tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { category: true, subcategory: true, pattern: true, size: true, images: true } }), created: { category: categoryResult.created, subcategory: subcategoryResult.created, pattern: patternResult.created }, mergedIntoExisting: Boolean(existing) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
});

export default router;
