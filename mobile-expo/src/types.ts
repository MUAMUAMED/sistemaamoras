export type AuthUser = { id: string; name: string; email: string; role: string };

export type CatalogItem = { id: string; name: string; code: string; categoryId?: string };

export type DraftImage = { url: string; token: string };

export type ClothingDraft = {
  name: string;
  categoryName: string;
  subcategoryName: string | null;
  patternName: string;
  description: string;
  confidence: number;
  notes: string[];
};

export type DraftResponse = { draft: ClothingDraft; images: DraftImage[] };

export type Catalog = { categories: CatalogItem[]; subcategories: CatalogItem[]; patterns: CatalogItem[]; sizes: CatalogItem[] };

export type ListedProduct = {
  id: string;
  name?: string | null;
  price?: number | null;
  stock: number;
  stockLoja: number;
  stockArmazem: number;
  barcode?: string | null;
  category?: { name: string } | null;
  subcategory?: { name: string } | null;
  pattern?: { name: string } | null;
  size?: { name: string } | null;
};

export type ProductListResponse = {
  data: ListedProduct[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type ClothingForm = ClothingDraft & {
  categoryId?: string;
  subcategoryId?: string;
  patternId?: string;
  sizeId: string;
  price: string;
  stock: string;
  initialLocation: 'LOJA' | 'ARMAZEM';
};
