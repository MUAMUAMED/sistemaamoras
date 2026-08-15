import { Router } from 'express';
import { Prisma, ProductImageType, StockLocation, StockMovementType } from '@prisma/client';
import QRCode from 'qrcode';
import { createHmac, timingSafeEqual } from 'crypto';
import { readFile, access } from 'fs/promises';
import path from 'path';
import { prisma } from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';

const router = Router();
const MAX_IMAGES = 2;
const DRAFT_TOKEN_TTL_MS = 30 * 60 * 1000;

type DraftImage = { url: string; token: string };

type AiDraft = {
  name: string;
  categoryName: string;
  subcategoryName: string | null;
  patternName: string;
  description: string;
  confidence: number;
  notes: string[];
};

function normalizeName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function draftSecret(): string {
  return process.env.PRODUCTION_DRAFT_SECRET || process.env.JWT_SECRET || 'development-production-draft-secret';
}

function signDraftImage(url: string, expiresAt: number): string {
  return createHmac('sha256', draftSecret()).update(`${url}:${expiresAt}`).digest('hex');
}

function createImageToken(url: string): string {
  const expiresAt = Date.now() + DRAFT_TOKEN_TTL_MS;
  return `${expiresAt}.${signDraftImage(url, expiresAt)}`;
}

function isValidDraftImage(image: DraftImage): boolean {
  const [expiration, signature] = image.token.split('.');
  const expiresAt = Number(expiration);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;

  const expected = signDraftImage(image.url, expiresAt);
  const received = Buffer.from(signature, 'hex');
  const valid = Buffer.from(expected, 'hex');
  return received.length === valid.length && timingSafeEqual(received, valid);
}

function extractJson(text: string): AiDraft {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('A IA não retornou um rascunho válido.');
  const parsed = JSON.parse(json) as Partial<AiDraft>;
  const draft: AiDraft = {
    name: normalizeName(parsed.name),
    categoryName: normalizeName(parsed.categoryName),
    subcategoryName: normalizeName(parsed.subcategoryName) || null,
    patternName: normalizeName(parsed.patternName),
    description: normalizeName(parsed.description),
    confidence: Number(parsed.confidence),
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(normalizeName).filter(Boolean).slice(0, 4) : [],
  };
  if (!draft.name || !draft.categoryName || !draft.patternName) {
    throw new Error('A IA não retornou nome, categoria e estampa completos.');
  }
  draft.confidence = Number.isFinite(draft.confidence) ? Math.max(0, Math.min(1, draft.confidence)) : 0;
  return draft;
}

async function analyzeImages(files: Express.Multer.File[]): Promise<AiDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('A IA não está configurada. Defina OPENAI_API_KEY no servidor antes de gerar o rascunho.');
  }

  const imageParts = await Promise.all(files.map(async (file) => ({
    type: 'input_image',
    image_url: `data:${file.mimetype};base64,${(await readFile(file.path)).toString('base64')}`,
    detail: 'high',
  })));

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Você é assistente de cadastro de roupas da Amoras. Analise as fotos da mesma peça e responda SOMENTE JSON válido, sem markdown.\n\nFormato obrigatório:\n{"name":"nome curto da roupa","categoryName":"categoria ampla","subcategoryName":"subcategoria ou null","patternName":"nome da estampa, cor ou identidade visual","description":"descrição objetiva","confidence":0.0,"notes":["observação opcional"]}\n\nRegras: responda em português brasileiro; não invente marca, tecido ou tamanho; se a roupa não tiver uma estampa evidente, crie um nome de estampa/identidade visual que descreva a peça e seja específico (por exemplo, 'Liso Preto Elegante'); a pessoa confirmará os dados antes de publicar.`,
          },
          ...imageParts,
        ],
      }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Não foi possível gerar o rascunho com a IA (${response.status}): ${detail.slice(0, 240)}`);
  }

  const body = await response.json() as { output_text?: string };
  if (!body.output_text) throw new Error('A IA retornou uma resposta vazia.');
  return extractJson(body.output_text);
}

async function nextCode(tx: Prisma.TransactionClient, entity: 'category' | 'subcategory' | 'pattern', categoryId?: string): Promise<string> {
  const width = entity === 'pattern' ? 4 : 2;
  const maximum = 10 ** width - 1;
  const rows = entity === 'category'
    ? await tx.category.findMany({ select: { code: true } })
    : entity === 'subcategory'
      ? await tx.subcategory.findMany({ where: { categoryId }, select: { code: true } })
      : await tx.pattern.findMany({ select: { code: true } });
  const used = new Set(rows.map((row) => row.code));
  for (let number = 1; number <= maximum; number += 1) {
    const code = String(number).padStart(width, '0');
    if (!used.has(code)) return code;
  }
  throw new Error(`Não há mais códigos disponíveis para ${entity}.`);
}

async function resolveCategory(tx: Prisma.TransactionClient, value: { id?: string; name?: string }) {
  if (value.id) {
    const category = await tx.category.findFirst({ where: { id: value.id, active: true } });
    if (!category) throw new Error('A categoria selecionada não existe ou está inativa.');
    return { category, created: false };
  }
  const name = normalizeName(value.name);
  if (!name) throw new Error('Informe uma categoria.');
  const existing = await tx.category.findFirst({ where: { name, active: true } });
  if (existing) return { category: existing, created: false };
  const category = await tx.category.create({ data: { name, code: await nextCode(tx, 'category') } });
  return { category, created: true };
}

async function resolveSubcategory(tx: Prisma.TransactionClient, categoryId: string, value?: { id?: string; name?: string } | null) {
  if (!value?.id && !normalizeName(value?.name)) return { subcategory: null, created: false };
  const requested = value!;
  if (requested.id) {
    const subcategory = await tx.subcategory.findFirst({ where: { id: requested.id, categoryId, active: true } });
    if (!subcategory) throw new Error('A subcategoria selecionada não pertence à categoria escolhida.');
    return { subcategory, created: false };
  }
  const name = normalizeName(requested.name);
  const existing = await tx.subcategory.findFirst({ where: { categoryId, name, active: true } });
  if (existing) return { subcategory: existing, created: false };
  const subcategory = await tx.subcategory.create({ data: { name, categoryId, code: await nextCode(tx, 'subcategory', categoryId) } });
  return { subcategory, created: true };
}

async function resolvePattern(tx: Prisma.TransactionClient, value: { id?: string; name?: string }) {
  if (value.id) {
    const pattern = await tx.pattern.findFirst({ where: { id: value.id, active: true } });
    if (!pattern) throw new Error('A estampa selecionada não existe ou está inativa.');
    return { pattern, created: false };
  }
  const name = normalizeName(value.name);
  if (!name) throw new Error('Informe uma estampa ou identidade visual.');
  const existing = await tx.pattern.findFirst({ where: { name, active: true } });
  if (existing) return { pattern: existing, created: false };
  const pattern = await tx.pattern.create({ data: { name, code: await nextCode(tx, 'pattern') } });
  return { pattern, created: true };
}

router.post('/draft', authenticateToken, uploadProductImage.array('images', MAX_IMAGES), async (req, res, next) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length || files.length > MAX_IMAGES) {
      return res.status(400).json({ error: 'Envie uma ou duas fotos da roupa.' });
    }
    const draft = await analyzeImages(files);
    const images = files.map((file) => {
      const url = `/uploads/products/${file.filename}`;
      return { url, token: createImageToken(url) };
    });
    return res.status(201).json({ draft, images });
  } catch (error) {
    return next(error);
  }
});

router.post('/publish', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, description, category, subcategory, pattern, sizeId, price, stock, initialLocation = 'ARMAZEM', images = [] } = req.body as {
      name?: string; description?: string; category?: { id?: string; name?: string }; subcategory?: { id?: string; name?: string } | null;
      pattern?: { id?: string; name?: string }; sizeId?: string; price?: number; stock?: number; initialLocation?: StockLocation; images?: DraftImage[];
    };
    const productName = normalizeName(name);
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (!productName || !category || !pattern || !sizeId || !Number.isFinite(numericPrice) || numericPrice <= 0 || !Number.isInteger(numericStock) || numericStock < 0) {
      return res.status(400).json({ error: 'Preencha nome, categoria, estampa, tamanho, preço e estoque válidos.' });
    }
    if (!['LOJA', 'ARMAZEM'].includes(initialLocation)) return res.status(400).json({ error: 'Local inicial inválido.' });
    if (!Array.isArray(images) || images.length < 1 || images.length > MAX_IMAGES || !images.every(isValidDraftImage)) {
      return res.status(400).json({ error: 'As fotos do rascunho expiraram ou são inválidas. Gere o rascunho novamente.' });
    }
    for (const image of images) {
      if (!/^\/uploads\/products\/product-[\w-]+\.[a-zA-Z0-9]+$/.test(image.url)) throw new Error('Caminho de imagem inválido.');
      await access(path.resolve(process.cwd(), `.${image.url}`));
    }

    const result = await prisma.$transaction(async (tx) => {
      const size = await tx.size.findFirst({ where: { id: sizeId, active: true } });
      if (!size) throw new Error('O tamanho selecionado não existe ou está inativo.');
      const categoryResult = await resolveCategory(tx, category);
      const subcategoryResult = await resolveSubcategory(tx, categoryResult.category.id, subcategory);
      const patternResult = await resolvePattern(tx, pattern);
      const barcode = `${size.code}${categoryResult.category.code}${subcategoryResult.subcategory?.code || '00'}${patternResult.pattern.code}`;
      const existing = await tx.product.findUnique({ where: { barcode } });
      const qrcodeUrl = existing ? existing.qrcodeUrl : await QRCode.toDataURL(barcode);

      const product = existing
        ? await tx.product.update({
            where: { id: existing.id },
            data: {
              price: numericPrice,
              description: normalizeName(description) || existing.description,
              stock: { increment: numericStock },
              stockLoja: initialLocation === 'LOJA' ? { increment: numericStock } : undefined,
              stockArmazem: initialLocation === 'ARMAZEM' ? { increment: numericStock } : undefined,
            },
          })
        : await tx.product.create({
            data: {
              name: productName, categoryId: categoryResult.category.id, subcategoryId: subcategoryResult.subcategory?.id,
              patternId: patternResult.pattern.id, sizeId, price: numericPrice, stock: numericStock,
              stockLoja: initialLocation === 'LOJA' ? numericStock : 0, stockArmazem: initialLocation === 'ARMAZEM' ? numericStock : 0,
              // O operador já revisou o rascunho neste fluxo, portanto a peça nasce publicada no estoque.
              barcode, qrcodeUrl, description: normalizeName(description) || null, status: 'ATIVO', inProduction: false,
            },
          });

      await tx.productImage.createMany({ data: images.map((image, position) => ({ productId: product.id, url: image.url, type: ProductImageType.ROUPA, position })) });
      if (numericStock > 0) {
        await tx.stockMovement.create({ data: { productId: product.id, type: StockMovementType.ENTRY, quantity: numericStock, reason: existing ? 'Entrada via aplicativo de produção' : 'Cadastro via aplicativo de produção', location: initialLocation, userId: req.user!.id } });
      }
      return {
        product: await tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { category: true, subcategory: true, pattern: true, size: true, images: true } }),
        created: { category: categoryResult.created, subcategory: subcategoryResult.created, pattern: patternResult.created },
        mergedIntoExisting: Boolean(existing),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
