import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;
export const catalogText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
export type ModelFilters = { categoryId?: string; subcategoryId?: string };

export function modelFilters(input: Record<string, unknown>): ModelFilters {
  const result: ModelFilters = {};
  for (const field of ['categoryId', 'subcategoryId'] as const) {
    const value = input[field];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string' || value.length > 100 || !value.trim()) throw Object.assign(new Error('Filtro de modelo inválido.'), { statusCode: 400 });
    result[field] = value.trim();
  }
  return result;
}

/** Resolve toda a cadeia de unificação, inclusive IDs que ficaram salvos no celular. */
export async function canonicalPattern(db: Db, id: string) {
  const visited = new Set<string>();
  for (let current = id; current; ) {
    if (visited.has(current)) throw new Error('Há um ciclo no histórico de unificação de estampas.');
    visited.add(current);
    const pattern = await db.pattern.findUnique({ where: { id: current } });
    if (!pattern) throw Object.assign(new Error('Estampa não encontrada.'), { statusCode: 400 });
    if (!pattern.canonicalPatternId) {
      if (!pattern.active) throw Object.assign(new Error('Estampa inativa. Escolha uma estampa disponível.'), { statusCode: 400 });
      return pattern;
    }
    current = pattern.canonicalPatternId;
  }
  throw new Error('Estampa inválida.');
}

export async function patternByIdentity(db: Db, input: { id?: string; name?: string }) {
  if (input.id) return canonicalPattern(db, input.id);
  const name = catalogText(input.name || '');
  if (!name) return null;
  const patterns = await db.pattern.findMany({ select: { id: true, name: true, active: true, canonicalPatternId: true } });
  const found = patterns.find((p) => catalogText(p.name) === name);
  if (found) return canonicalPattern(db, found.id);
  const redirects = await db.patternRedirect.findMany({ select: { sourcePatternName: true, targetPatternId: true } });
  const alias = redirects.find((r) => catalogText(r.sourcePatternName) === name);
  return alias ? canonicalPattern(db, alias.targetPatternId) : null;
}

/** A identidade da roupa é modelo + estampa canônica + tamanho; códigos antigos são aliases. */
export async function existingProductByIdentity(db: Db, identity: { categoryId: string; subcategoryId: string | null; patternId: string; sizeId: string }, barcode: string) {
  const products = await db.product.findMany({ where: { ...identity, active: true, isDraft: false }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  return products.find((p) => p.barcode === barcode) || products[0] || null;
}

/** Produtos arquivados pela consolidação mantêm seu ID histórico e seu código antigo. */
export async function operationalProductId(db: Db, id: string): Promise<string> {
  const product = await db.product.findUnique({ where: { id }, select: { active: true, barcode: true } });
  if (!product || product.active || !product.barcode) return id;
  const alias = await db.productBarcodeAlias.findUnique({ where: { barcode: product.barcode }, select: { product: { select: { id: true, active: true } } } });
  return alias?.product.active ? alias.product.id : id;
}
