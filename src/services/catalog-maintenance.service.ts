import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
type Db = Prisma.TransactionClient;

export async function duplicateProductGroups(db: Db, patternIds?: string[]) {
  const products = await db.product.findMany({ where: { active: true, isDraft: false, categoryId: { not: null }, sizeId: { not: null },
    patternId: patternIds ? { in: patternIds } : { not: null } }, include: { category: true, subcategory: true, pattern: true, size: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  const groups = new Map<string, typeof products>();
  for (const product of products) {
    const key = JSON.stringify([product.categoryId, product.subcategoryId, product.patternId, product.sizeId]);
    groups.set(key, [...(groups.get(key) || []), product]);
  }
  return [...groups.values()].filter((items) => items.length > 1).map((items) => {
    const p = items[0];
    const barcode = `${p.size!.code}${p.category!.code}${p.subcategory?.code || '00'}${p.pattern!.code}`;
    const target = items.find((item) => item.barcode === barcode) || p;
    return { target, sources: items.filter((item) => item.id !== target.id) };
  });
}

export async function maintenancePreview(db: Db) {
  const groups = await duplicateProductGroups(db);
  const sourceIds = groups.flatMap((g) => g.sources.map((p) => p.id));
  const [categories, subcategories, saleItems, stockMovements, images, aliases, commercialProducts] = await Promise.all([
    db.category.findMany({ where: { products: { none: {} }, subcategories: { every: { products: { none: {} } } } } }),
    db.subcategory.findMany({ where: { products: { none: {} } } }),
    db.saleItem.findMany({ where: { productId: { in: sourceIds } }, select: { id: true, productId: true } }),
    db.stockMovement.findMany({ where: { productId: { in: sourceIds } }, select: { id: true, productId: true } }),
    db.productImage.findMany({ where: { productId: { in: sourceIds } }, select: { id: true, productId: true, position: true } }),
    db.productBarcodeAlias.findMany({ where: { productId: { in: sourceIds } } }),
    db.commercialProduct.findMany({ where: { erpProductId: { in: sourceIds } }, select: { id: true, erpProductId: true } }),
  ]);
  const fingerprint = createHash('sha256').update(JSON.stringify({ groups: groups.map((g) => [g.target, ...g.sources].map((p) => [p.id, p.updatedAt, p.stock, p.stockLoja, p.stockArmazem])),
    categories: categories.map((c) => c.id).sort(), subcategories: subcategories.map((s) => s.id).sort(),
    references: [saleItems, stockMovements, images, aliases, commercialProducts].map((rows) => [...rows].sort((a, b) => a.id.localeCompare(b.id))) })).digest('hex');
  return { fingerprint, groups, emptyCategories: categories, emptySubcategories: subcategories, references: { saleItems, stockMovements, images, aliases, commercialProducts } };
}

export async function consolidateDuplicateProducts(db: Db, patternIds?: string[]) {
  const groups = await duplicateProductGroups(db, patternIds);
  const merged: Array<{ targetId: string; sourceIds: string[]; stockLoja: number; stockArmazem: number }> = [];
  const skipped: Array<{ ids: string[]; reason: string }> = [];
  for (const group of groups) {
    const ids = [group.target.id, ...group.sources.map((p) => p.id)];
    await db.$queryRaw(Prisma.sql`SELECT id FROM products WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
    const members = [group.target, ...group.sources];
    const fiscalFields = ['ncm', 'cest', 'cfop', 'fiscalOrigin', 'unitOfMeasure', 'icmsCst', 'icmsRate', 'pisCst', 'cofinsCst'] as const;
    let reason = members.some((p) => p.stockLoja < 0 || p.stockArmazem < 0 || p.stock !== p.stockLoja + p.stockArmazem) ? 'Saldos inconsistentes.' : '';
    if (fiscalFields.some((field) => new Set(members.map((p) => String(p[field] ?? '')).filter(Boolean)).size > 1)) reason = 'Classificação fiscal divergente.';
    if (await db.inventorySession.count({ where: { status: 'OPEN', items: { some: { productId: { in: ids } } } } })) reason = 'Conferência aberta para estas roupas.';
    if (await db.commercialProduct.count({ where: { erpProductId: { in: ids } } }) > 1) reason = 'Mais de um anúncio comercial vinculado.';
    if (reason) { skipped.push({ ids, reason }); continue; }
    const sourceIds = group.sources.map((p) => p.id);
    for (const source of group.sources) {
      if (!source.barcode) continue;
      const alias = await db.productBarcodeAlias.findUnique({ where: { barcode: source.barcode } });
      if (alias && !ids.includes(alias.productId)) throw new Error('Código antigo aponta para outra roupa; consolidação interrompida.');
    }
    const stockLoja = members.reduce((sum, p) => sum + p.stockLoja, 0);
    const stockArmazem = members.reduce((sum, p) => sum + p.stockArmazem, 0);
    await db.saleItem.updateMany({ where: { productId: { in: sourceIds } }, data: { productId: group.target.id } });
    await db.stockMovement.updateMany({ where: { productId: { in: sourceIds } }, data: { productId: group.target.id } });
    await db.productImage.updateMany({ where: { productId: { in: sourceIds } }, data: { productId: group.target.id } });
    await db.commercialProduct.updateMany({ where: { erpProductId: { in: sourceIds } }, data: { erpProductId: group.target.id } });
    await db.productBarcodeAlias.updateMany({ where: { productId: { in: sourceIds } }, data: { productId: group.target.id } });
    for (const source of group.sources) if (source.barcode) await db.productBarcodeAlias.upsert({ where: { barcode: source.barcode },
      create: { barcode: source.barcode, productId: group.target.id }, update: { productId: group.target.id } });
    await db.product.update({ where: { id: group.target.id }, data: { stockLoja, stockArmazem, stock: stockLoja + stockArmazem } });
    // Os IDs e cadastros anteriores continuam disponíveis para o histórico das conferências.
    await db.product.updateMany({ where: { id: { in: sourceIds } }, data: { active: false, stock: 0, stockLoja: 0, stockArmazem: 0 } });
    merged.push({ targetId: group.target.id, sourceIds, stockLoja, stockArmazem });
  }
  return { merged, skipped };
}

export async function removeUnusedClassification(db: Db, preview: Awaited<ReturnType<typeof maintenancePreview>>) {
  const subcategories = await db.subcategory.deleteMany({ where: { id: { in: preview.emptySubcategories.map((s) => s.id) }, products: { none: {} } } });
  const categories = await db.category.deleteMany({ where: { id: { in: preview.emptyCategories.map((c) => c.id) }, products: { none: {} }, subcategories: { none: {} } } });
  return { removedCategories: categories.count, removedSubcategories: subcategories.count };
}
