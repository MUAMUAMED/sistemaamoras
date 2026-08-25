import { Router } from 'express';
import { Prisma, ProductImageType, StockLocation, StockMovementType } from '@prisma/client';
import QRCode from 'qrcode';
import { createHmac, timingSafeEqual } from 'crypto';
import { access, readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadProductImage } from '../middleware/upload';
import { modelReferences } from '../data/modelReference';

const router = Router();
const IMAGE_LIMIT = 2;
const DRAFT_TTL = 30 * 60 * 1000;
// A base é uma referência de modelagem, não uma fonte de IDs do catálogo.
// Os IDs/códigos válidos continuam sendo buscados no banco da Zeabur abaixo.
const modelsForPrompt = modelReferences.map((reference) => ({
  categoriaDeReferencia: reference.categoria,
  modelo: reference.modelo,
  descricaoTecnica: reference.descricaoTecnica,
  fotosValidadas: reference.quantidadeFotosAnalisadas,
}));

type DraftImage = { url: string; token: string };
type AiDraft = { name: string; categoryName: string; categoryCode: string; categoryId?: string; subcategoryName: string; subcategoryCode: string; subcategoryId?: string; patternName: string; description: string; confidence: number; notes: string[] };
type PatternSuggestion = { patternName: string; patternId?: string; reusedExisting: boolean; reason: string };

const clean = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const comparable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const sameCatalogName = (first: string, second: string) => {
  const a = comparable(first); const b = comparable(second);
  if (a === b) return true;
  const singular = (value: string) => value.endsWith('s') ? value.slice(0, -1) : value;
  return singular(a) === singular(b);
};
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
    name: clean(result.name), categoryName: clean(result.categoryName), categoryCode: clean(result.categoryCode), subcategoryName: clean(result.subcategoryName), subcategoryCode: clean(result.subcategoryCode),
    patternName: clean(result.patternName), description: clean(result.description), confidence: Number(result.confidence),
    notes: Array.isArray(result.notes) ? result.notes.map(clean).filter(Boolean).slice(0, 4) : [],
  };
  if (!draft.name || !draft.categoryName || !draft.categoryCode || !draft.subcategoryName || !draft.subcategoryCode || !draft.patternName) throw new Error('A IA não retornou nome, categoria, subcategoria e estampa completos.');
  if (comparable(draft.categoryName) === comparable(draft.subcategoryName)) throw new Error('A IA repetiu a categoria como subcategoria. Gere o rascunho novamente.');
  draft.confidence = Number.isFinite(draft.confidence) ? Math.max(0, Math.min(1, draft.confidence)) : 0;
  return draft;
}

async function createAiDraft(files: Express.Multer.File[]): Promise<AiDraft> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('A IA não está configurada. Defina OPENROUTER_API_KEY no serviço Zeabur.');
  const categories = await prisma.category.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, subcategories: { where: { active: true }, select: { id: true, name: true, code: true } } },
    orderBy: { name: 'asc' },
  });
  const catalogForPrompt = categories.map((category) => ({ categoryCode: category.code, categoryName: category.name, subcategories: category.subcategories.map((subcategory) => ({ subcategoryCode: subcategory.code, subcategoryName: subcategory.name })) }));
  const images = await Promise.all(files.map(async (file) => ({ type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${(await readFile(file.path)).toString('base64')}` } })));
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Amoras Produção' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash', temperature: 0.2, messages: [{ role: 'user', content: [
      { type: 'text', text: `Analise as fotos da mesma roupa. Responda somente JSON válido em português: {"name":"nome curto","categoryName":"nome exibido","categoryCode":"código da categoria existente","subcategoryName":"nome exibido","subcategoryCode":"código da subcategoria existente","patternName":"rascunho do nome da estampa ou identidade visual","description":"descrição objetiva","confidence":0.0,"notes":["observação"]}.\n\nUse as referências de modelos validados abaixo para reconhecer a modelagem, silhueta, decote, mangas, comprimento, barra, fechamento e caimento. Escolha mentalmente a referência mais próxima e use esse entendimento para compor name e description. As categorias dessas referências são apenas rótulos de modelagem: NUNCA as trate como códigos, IDs ou categorias oficiais do sistema.\n\nVocê DEVE selecionar uma combinação existente no catálogo abaixo, copiando categoryCode e subcategoryCode exatamente como estão na lista. Categoria e subcategoria são obrigatórias e diferentes; categoryName identifica o grupo principal e subcategoryName o tipo dentro desse grupo. Não crie categoria ou subcategoria, nem use texto livre no lugar dos códigos. patternName é apenas uma sugestão de rascunho: a estampa só será criada no banco se o usuário publicar o cadastro. Não invente marca, tecido ou tamanho.\n\nReferências de modelos validados: ${JSON.stringify(modelsForPrompt)}\n\nCadastros disponíveis para seleção: ${JSON.stringify(catalogForPrompt)}` },
      ...images,
    ] }], }),
  });
  if (!response.ok) throw new Error(`Não foi possível gerar o rascunho com a IA (${response.status}).`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const output = body.choices?.[0]?.message?.content;
  if (!output) throw new Error('A IA retornou uma resposta vazia.');
  const draft = parseDraft(output);
  const category = categories.find((item) => item.code === draft.categoryCode);
  const subcategory = category?.subcategories.find((item) => item.code === draft.subcategoryCode);
  if (!category || !subcategory) throw new Error('A IA não selecionou uma categoria e subcategoria válidas. Gere o rascunho novamente.');
  return {
    ...draft,
    categoryName: category.name,
    categoryId: category.id,
    subcategoryName: subcategory.name,
    subcategoryId: subcategory.id,
  };
}

/**
 * Fluxo híbrido: a IA só olha a identidade visual da roupa. Todos os campos
 * de produto continuam sendo escolhidos pela pessoa no aplicativo.
 */
async function createPatternSuggestion(files: Express.Multer.File[]): Promise<PatternSuggestion> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('A IA não está configurada. Defina OPENROUTER_API_KEY no serviço Zeabur.');

  const patterns = await prisma.pattern.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  const images = await Promise.all(files.map(async (file) => ({
    type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${(await readFile(file.path)).toString('base64')}` },
  })));
  // GPT-5 Nano aceita imagens e saída estruturada, mantendo este passo curto
  // (somente a sugestão da estampa) com baixo custo e boa aderência ao JSON.
  const model = 'openai/gpt-5-nano';
  const prompt = `Analise somente a ESTAMPA ou identidade visual das fotos da mesma roupa. Não classifique a roupa, não escolha categoria, subcategoria, tamanho, preço, nome da roupa nem descrição do produto.\n\nResponda SOMENTE JSON válido: {"patternName":"nome curto da estampa","existingPatternId":"id existente ou string vazia","reason":"justificativa curta"}.\n\nRegras obrigatórias:\n1. Primeiro compare a estampa com os nomes já usados abaixo. Se representar a mesma identidade visual, informe exatamente o id correspondente em existingPatternId e repita exatamente o nome existente em patternName.\n2. Se não houver nome correspondente, crie um nome curto, descritivo e distinto. Não repita nem faça variação superficial dos nomes existentes.\n3. Se a roupa for lisa, descreva a identidade visual de modo objetivo, sem inventar detalhes que não apareçam na foto.\n4. existingPatternId só pode ser um dos IDs fornecidos.\n\nEstampas já cadastradas: ${JSON.stringify(patterns)}`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Amoras Produção' },
    // Forçamos JSON para não depender de markdown ou de texto explicativo do
    // provedor. O limite também deixa espaço para a resposta final do modelo.
    body: JSON.stringify({ model, max_tokens: 2048, response_format: { type: 'json_object' }, reasoning: { effort: 'minimal' }, ...(model.startsWith('openai/gpt-5') ? {} : { temperature: 0.2 }), messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...images] }] }),
  });
  if (!response.ok) throw new Error(`Não foi possível sugerir a estampa com a IA (${response.status}).`);
  const body = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: unknown; reasoning?: unknown; reasoning_content?: unknown } }> };
  const message = body.choices?.[0]?.message;
  const textFrom = (value: unknown): string => typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map((part) => typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : '').join('')
      : '';
  // Alguns provedores OpenAI-compatíveis devolvem a resposta final em
  // reasoning_content; aceitamos os três formatos, priorizando content.
  const output = [textFrom(message?.content), textFrom(message?.reasoning_content), textFrom(message?.reasoning)].find(Boolean) || '';
  const json = output.match(/\{[\s\S]*\}/)?.[0];
  if (!json) {
    console.error('Resposta de IA sem JSON', { finishReason: body.choices?.[0]?.finish_reason, contentLength: textFrom(message?.content).length, reasoningLength: textFrom(message?.reasoning_content || message?.reasoning).length });
    throw new Error('A IA não retornou um nome de estampa válido.');
  }
  const parsed = JSON.parse(json) as { patternName?: unknown; existingPatternId?: unknown; reason?: unknown };
  const requestedId = clean(parsed.existingPatternId);
  const matchedById = patterns.find((pattern) => pattern.id === requestedId);
  const suggestedName = clean(parsed.patternName);
  const matchedByName = suggestedName ? patterns.find((pattern) => sameCatalogName(pattern.name, suggestedName)) : undefined;
  const existing = matchedById || matchedByName;
  if (existing) return { patternName: existing.name, patternId: existing.id, reusedExisting: true, reason: 'A sugestão corresponde a uma estampa já cadastrada.' };
  if (!suggestedName) throw new Error('A IA não informou um nome de estampa.');
  return { patternName: suggestedName, reusedExisting: false, reason: clean(parsed.reason) || 'Sugestão criada a partir das fotos.' };
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
  if (!input?.id && !clean(input?.name)) throw new Error('Informe uma subcategoria.');
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

router.post('/pattern-suggestion', authenticateToken, uploadProductImage.array('images', IMAGE_LIMIT), async (req, res, next) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length || files.length > IMAGE_LIMIT) return res.status(400).json({ error: 'Envie uma ou duas fotos da roupa.' });
    const suggestion = await createPatternSuggestion(files);
    const images = files.map((file) => {
      const url = `/uploads/products/${file.filename}`;
      return { url, token: imageToken(url) };
    });
    return res.status(201).json({ suggestion, images });
  } catch (error) { return next(error); }
});

// O cadastro manual pode guardar as fotos sem passar pelo provedor de IA. As
// imagens ainda recebem o mesmo token temporário exigido pelo /publish, para
// que não seja possível apontar o produto para um arquivo arbitrário.
router.post('/manual-images', authenticateToken, uploadProductImage.array('images', IMAGE_LIMIT), async (req, res, next) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length || files.length > IMAGE_LIMIT) return res.status(400).json({ error: 'Envie uma ou duas fotos da roupa.' });
    const images = files.map((file) => {
      const url = `/uploads/products/${file.filename}`;
      return { url, token: imageToken(url) };
    });
    return res.status(201).json({ images });
  } catch (error) { return next(error); }
});

router.post('/publish', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, description, category, subcategory, pattern, sizeId, price, stock, initialLocation = 'ARMAZEM', images = [], mergeWithExisting = false } = req.body as any;
    const productName = clean(name); const numericPrice = Number(price); const numericStock = Number(stock);
    if (!productName || !category?.id || !subcategory?.id || !pattern || !sizeId || !Number.isFinite(numericPrice) || numericPrice <= 0 || !Number.isInteger(numericStock) || numericStock < 0) return res.status(400).json({ error: 'Selecione uma categoria e subcategoria válidas, e preencha estampa, tamanho, preço e estoque.' });
    if (!['LOJA', 'ARMAZEM'].includes(initialLocation)) return res.status(400).json({ error: 'Local inicial inválido.' });
    // No cadastro manual não há rascunho de IA nem fotos temporárias. Fotos,
    // quando enviadas, continuam passando pela mesma validação assinada.
    if (!Array.isArray(images) || images.length > IMAGE_LIMIT || !images.every(validImage)) return res.status(400).json({ error: 'As fotos do rascunho expiraram ou são inválidas.' });
    for (const image of images) { if (!/^\/uploads\/products\/product-[\w-]+\.[a-zA-Z0-9]+$/.test(image.url)) throw new Error('Caminho de imagem inválido.'); await access(path.resolve(process.cwd(), `.${image.url}`)); }
    const result = await prisma.$transaction(async (tx) => {
      const size = await tx.size.findFirst({ where: { id: sizeId, active: true } }); if (!size) throw new Error('Tamanho inválido.');
      const categoryResult = await categoryFor(tx, category); const subcategoryResult = await subcategoryFor(tx, categoryResult.value.id, subcategory); const patternResult = await patternFor(tx, pattern);
      const barcode = `${size.code}${categoryResult.value.code}${subcategoryResult.value.code}${patternResult.value.code}`;
      const existing = await tx.product.findUnique({ where: { barcode } });
      if (existing && mergeWithExisting !== true) {
        return {
          conflict: true as const,
          existingProduct: { id: existing.id, name: existing.name, barcode: existing.barcode, stock: existing.stock, stockLoja: existing.stockLoja, stockArmazem: existing.stockArmazem },
        };
      }
      const qrcodeUrl = existing?.qrcodeUrl || await QRCode.toDataURL(barcode);
      const product = existing ? await tx.product.update({ where: { id: existing.id }, data: { price: numericPrice, description: clean(description) || existing.description, stock: { increment: numericStock }, stockLoja: initialLocation === 'LOJA' ? { increment: numericStock } : undefined, stockArmazem: initialLocation === 'ARMAZEM' ? { increment: numericStock } : undefined } }) : await tx.product.create({ data: { name: productName, categoryId: categoryResult.value.id, subcategoryId: subcategoryResult.value.id, patternId: patternResult.value.id, sizeId, price: numericPrice, stock: numericStock, stockLoja: initialLocation === 'LOJA' ? numericStock : 0, stockArmazem: initialLocation === 'ARMAZEM' ? numericStock : 0, barcode, qrcodeUrl, description: clean(description) || null, status: 'ATIVO', inProduction: false, isDraft: false } });
      if (images.length) await tx.productImage.createMany({ data: images.map((image: DraftImage, position: number) => ({ productId: product.id, url: image.url, type: ProductImageType.ROUPA, position })) });
      if (numericStock > 0) await tx.stockMovement.create({ data: { productId: product.id, type: StockMovementType.ENTRY, quantity: numericStock, reason: existing ? 'Entrada via aplicativo de produção' : 'Cadastro via aplicativo de produção', location: initialLocation as StockLocation, userId: req.user!.id } });
      // A tela de produção só precisa do identificador e do código para mostrar
      // o resultado e imprimir a etiqueta. Evitar devolver o grafo completo do
      // Prisma (incluindo imagens) mantém a resposta estritamente serializável.
      return {
        product: { id: product.id, barcode: product.barcode },
        created: { category: categoryResult.created, subcategory: subcategoryResult.created, pattern: patternResult.created },
        mergedIntoExisting: Boolean(existing),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ('conflict' in result) {
      return res.status(409).json({
        error: 'Já existe uma roupa com este código.',
        message: 'Confirme explicitamente se deseja somar as unidades ao produto existente.',
        existingProduct: result.existingProduct,
      });
    }
    return res.status(201).json(result);
  } catch (error) { return next(error); }
});

export default router;
