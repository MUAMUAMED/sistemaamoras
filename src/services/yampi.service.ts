import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../config/database';

const client = axios.create({
  baseURL: `https://api.dooki.com.br/v2/${env.YAMPI_ALIAS}`,
  timeout: 20000,
  headers: {
    'User-Token': env.YAMPI_USER_TOKEN,
    'User-Secret-Key': env.YAMPI_USER_SECRET_KEY,
    'Content-Type': 'application/json',
  },
});

const configured = () =>
  Boolean(env.YAMPI_ALIAS && env.YAMPI_USER_TOKEN && env.YAMPI_USER_SECRET_KEY);

const payload = (response: any) => response?.data?.data ?? response?.data;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const publicImageUrl = (url?: string | null) => {
  if (!url) return null;

  const trimmed = String(url).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, 'https://');
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const baseUrl = normalizeBaseUrl(env.APP_URL || env.COMMERCIAL_SITE_URL);
  return `${baseUrl}${path}`;
};

const uniqueYampiImages = (images: any[]) => {
  const seen = new Set<string>();

  return images
    .map((image) => publicImageUrl(image?.url))
    .filter((url): url is string => Boolean(url))
    .filter((url) => {
      const key = url.split('?')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map((url) => ({ url }));
};

export async function syncCommercialProductWithYampi(commercialProductId: string) {
  if (!configured()) throw new Error('Integracao Yampi nao configurada');

  const product = await (prisma as any).commercialProduct.findUnique({
    where: { id: commercialProductId },
    include: {
      images: { orderBy: [{ isCover: 'desc' }, { position: 'asc' }] },
      erpProduct: {
        include: {
          size: true,
          images: { orderBy: { position: 'asc' } },
        },
      },
    },
  });
  if (!product?.erpProduct) throw new Error('Produto ERP vinculado nao encontrado');

  const erp = product.erpProduct;
  const skuCode = String(erp.barcode || `AMORAS-${erp.id.slice(-12)}`).slice(0, 40);
  const numericErpId = /^\d+$/.test(String(erp.barcode || ''))
    ? Number(erp.barcode)
    : Number.parseInt(erp.id.replace(/\D/g, '').slice(-9), 10) || Date.now() % 1000000000;
  const images = uniqueYampiImages([
    ...(product.images || []),
    ...(erp.images || []),
    erp.imageUrl ? { url: erp.imageUrl } : null,
  ].filter(Boolean));
  const skuData = {
    sku: skuCode,
    erp_id: numericErpId,
    price_cost: Number(erp.cost || 0),
    price_sale: Number(erp.price),
    weight: env.YAMPI_PRODUCT_WEIGHT,
    height: env.YAMPI_PRODUCT_HEIGHT,
    width: env.YAMPI_PRODUCT_WIDTH,
    length: env.YAMPI_PRODUCT_LENGTH,
    quantity_managed: true,
    availability: Math.max(0, erp.stockLoja),
    availability_soldout: 0,
    blocked_sale: erp.stockLoja <= 0,
    variations_values_ids: [],
    allow_sell_without_customization: true,
    images,
  };

  try {
    let yampiProductId = product.yampiProductId;
    let yampiSkuId = product.yampiSkuId;

    if (!yampiProductId) {
      const created = payload(await client.post('/catalog/products', {
        simple: true,
        brand_id: env.YAMPI_BRAND_ID,
        erp_id: numericErpId,
        active: product.published && erp.active,
        searchable: true,
        is_digital: false,
        buy_similars: true,
        priority: product.featured ? 3 : 1,
        name: product.title,
        slug: product.slug,
        description: product.description || erp.description || product.title,
        seo_title: product.seoTitle || product.title,
        seo_description: product.seoDescription || product.shortDescription || product.description,
        skus: [skuData],
      }));
      yampiProductId = String(created.id);
      const skus = payload(await client.get(`/catalog/products/${yampiProductId}/skus`));
      const skuList = Array.isArray(skus) ? skus : (skus?.data || []);
      yampiSkuId = String(skuList[0]?.id || '');
      if (!yampiSkuId) throw new Error('Yampi nao retornou o SKU criado');
    } else {
      await client.put(`/catalog/products/${yampiProductId}`, {
        active: product.published && erp.active,
        name: product.title,
        slug: product.slug,
        description: product.description || erp.description || product.title,
      });
      if (yampiSkuId) {
        await client.put(`/catalog/skus/${yampiSkuId}`, {
          product_id: Number(yampiProductId),
          ...skuData,
        });
      }
    }

    return await (prisma as any).commercialProduct.update({
      where: { id: product.id },
      data: {
        yampiProductId,
        yampiSkuId,
        yampiSyncedAt: new Date(),
        yampiSyncError: null,
      },
    });
  } catch (error: any) {
    const responseData = error.response?.data;
    const message = responseData
      ? JSON.stringify(responseData)
      : error.message;
    await (prisma as any).commercialProduct.update({
      where: { id: product.id },
      data: { yampiSyncError: String(message).slice(0, 1000) },
    });
    throw new Error(`Falha ao sincronizar com a Yampi: ${message}`);
  }
}

export async function createYampiCheckout(items: Array<{ commercialProductId: string; quantity: number }>) {
  if (!configured()) throw new Error('Integracao Yampi nao configurada');
  const skus = [];

  for (const item of items) {
    const quantity = Math.max(1, Math.floor(item.quantity));
    const synced = await syncCommercialProductWithYampi(item.commercialProductId);
    const product = await (prisma as any).commercialProduct.findUnique({
      where: { id: item.commercialProductId },
      include: { erpProduct: true },
    });
    if (!product?.published || product.erpProduct.stockLoja < quantity) {
      throw new Error(`Estoque indisponivel para ${product?.title || 'produto'}`);
    }
    skus.push({ id: Number(synced.yampiSkuId), quantity });
  }

  const result = payload(await client.post('/checkout/payment-link', {
    name: `Amoras Capital ${Date.now()}`,
    active: true,
    skus,
  }));
  const checkoutUrl = new URL(result.link_url);
  checkoutUrl.protocol = 'https:';
  checkoutUrl.host = env.YAMPI_CHECKOUT_DOMAIN || `${env.YAMPI_ALIAS}.pay.yampi.com.br`;
  return { checkoutUrl: checkoutUrl.toString(), paymentLinkId: String(result.id) };
}
