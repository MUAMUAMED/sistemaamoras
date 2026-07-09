export type CatalogCategory = string;

export interface CommercialCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  active: boolean;
  position: number;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: CatalogCategory;
  categoryId?: string | null;
  categoryName: string;
  price: number;
  oldPrice?: number;
  tag: string;
  description: string;
  shortDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  material?: string;
  careInstructions?: string;
  colorNotes?: string;
  image: string;
  gallery: string[];
  commercialImages?: Array<{ id: string; url: string; alt?: string; isCover?: boolean; position: number }>;
  erpImages?: Array<{ id: string; url: string; type?: string; position: number }>;
  colors: string[];
  sizes: string[];
  details: string[];
  specs: Record<string, string>;
  availableQuantity: number;
  published?: boolean;
  featured?: boolean;
  position?: number;
  erpProductId: string;
  erpProduct: {
    id: string;
    name: string;
    price: number;
    stock: number;
    stockLoja: number;
    stockArmazem: number;
    availableQuantity: number;
    size?: { id: string; name: string; code: string };
    pattern?: { id: string; name: string; code: string };
    category?: { id: string; name: string; code: string };
    subcategory?: { id: string; name: string; code: string };
    images?: Array<{ id: string; url: string; type?: string; position: number }>;
  };
}

export const categoryLabels: Record<string, string> = {
  novidades: 'Novidades',
};

export const categoryDescriptions: Record<string, string> = {
  novidades: 'Pecas publicadas no site comercial e sincronizadas com estoque do ERP.',
};

export const newestProducts: CatalogProduct[] = [];

export const getProductPath = (product: CatalogProduct) => `/produto/${product.slug}`;

export const getCategoryPath = (slug: string) => `/produtos/${slug}`;
