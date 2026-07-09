import { api } from './api';
import type { CatalogProduct, CommercialCategory } from '../data/catalog';

const configuredUploadUrl = import.meta.env.VITE_UPLOAD_URL;
const configuredApiUrl = import.meta.env.VITE_API_URL;
const UPLOAD_BASE_URL = configuredUploadUrl !== undefined
  ? configuredUploadUrl.replace(/\/$/, '')
  : configuredApiUrl?.startsWith('http')
    ? configuredApiUrl.replace(/\/api\/?$/, '')
    : '';
const PLACEHOLDER_IMAGE = '/amoras-logo.png';

const assetUrl = (url?: string) => {
  if (!url) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  return `${UPLOAD_BASE_URL}${url}`;
};

const fallbackColor = '#bd727a';

export const mapCommercialProduct = (item: any): CatalogProduct => {
  const erp = item.erpProduct || {};
  const images = Array.isArray(item.images) ? item.images : [];
  const gallery = images.length
    ? images.map((image: any) => assetUrl(image.url))
    : [assetUrl(undefined)];

  return {
    id: item.id,
    slug: item.slug,
    name: item.title,
    category: item.category?.slug || 'novidades',
    categoryId: item.category?.id || null,
    categoryName: item.category?.name || 'Novidades',
    price: Number(erp.price || 0),
    tag: item.featured ? 'Destaque' : 'Publicado',
    description: item.description || erp.description || item.shortDescription || 'Peca selecionada pela Amoras Capital.',
    shortDescription: item.shortDescription,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    material: item.material,
    careInstructions: item.careInstructions,
    colorNotes: item.colorNotes,
    image: gallery[0],
    gallery,
    commercialImages: images,
    colors: [fallbackColor, '#f8cfc7', '#713c4b'],
    sizes: erp.size?.name ? [erp.size.name] : ['Unico'],
    details: [
      `Disponivel: ${erp.availableQuantity || 0} unidade(s)`,
      erp.pattern?.name ? `Estampa/cor: ${erp.pattern.name}` : 'Estampa/cor vinculada ao ERP',
      item.material ? `Material: ${item.material}` : 'Material informado pela vitrine comercial',
      item.careInstructions ? `Cuidados: ${item.careInstructions}` : 'Cuidados informados pela vitrine comercial',
      erp.category?.name ? `Categoria ERP: ${erp.category.name}` : 'Categoria sincronizada',
      'Fotos comerciais administradas pela vitrine',
    ],
    specs: {
      Preco: `R$ ${Number(erp.price || 0).toFixed(2).replace('.', ',')}`,
      Tamanho: erp.size?.name || 'Unico',
      Estoque: `${erp.availableQuantity || 0} unidade(s)`,
      Material: item.material || 'A definir',
      Origem: 'ERP Amoras Capital',
    },
    availableQuantity: erp.availableQuantity || 0,
    published: item.published,
    featured: item.featured,
    position: item.position || 0,
    erpProductId: erp.id,
    erpProduct: erp,
  };
};

export const commercialApi = {
  catalog: async (): Promise<{ categories: CommercialCategory[]; products: CatalogProduct[] }> => {
    const response = await api.get('/commercial/catalog');
    return {
      categories: response.data.categories || [],
      products: (response.data.products || []).map(mapCommercialProduct),
    };
  },

  productBySlug: async (slug: string): Promise<CatalogProduct> => {
    const response = await api.get(`/commercial/products/${slug}`);
    return mapCommercialProduct(response.data);
  },

  checkout: async (items: Array<{ commercialProductId: string; quantity: number }>): Promise<{ checkoutUrl: string }> => {
    const response = await api.post('/commercial/checkout', { items });
    return response.data;
  },
};
