import type { Product } from '../types';

type ProductIdentity = Pick<Product, 'name' | 'category' | 'subcategory' | 'pattern' | 'size'>;

const clean = (value?: string | null) => value?.trim() || '';

/**
 * Identificação usada em buscas e seletores. O nome gravado do produto costuma
 * ser a estampa; aqui ele ganha o contexto necessário para não confundir duas
 * peças diferentes que usam a mesma estampa.
 */
export function productDisplayName(product: ProductIdentity): string {
  const category = clean(product.category?.name);
  const subcategory = clean(product.subcategory?.name);
  const pattern = clean(product.pattern?.name) || clean(product.name);
  const size = clean(product.size?.name);

  return [category, subcategory, pattern, size].filter(Boolean).join(' · ') || 'Produto sem identificação';
}

/** Texto completo para que qualquer parte da identificação encontre a peça. */
export function productSearchText(product: ProductIdentity & Pick<Product, 'barcode'>): string {
  return [productDisplayName(product), product.name, product.barcode]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pt-BR');
}
