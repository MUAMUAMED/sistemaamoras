import { api } from './api';
import { mapCommercialProduct } from './commercialApi';
import type { CatalogProduct, CommercialCategory } from '../data/catalog';

export type CommercialCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  active?: boolean;
  position?: number;
};

export type CommercialProductInput = {
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  material?: string;
  careInstructions?: string;
  colorNotes?: string;
  categoryId?: string | null;
  published?: boolean;
  featured?: boolean;
  position?: number;
};

export type CommercialSiteSettings = {
  id?: string;
  brandName: string;
  announcement?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export const commercialAdminApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: { id: string; name: string; email: string; role: string } }> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  categories: async (): Promise<CommercialCategory[]> => {
    const response = await api.get('/commercial/admin/categories');
    return response.data || [];
  },

  createCategory: async (data: CommercialCategoryInput): Promise<CommercialCategory> => {
    const response = await api.post('/commercial/admin/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: Partial<CommercialCategoryInput>): Promise<CommercialCategory> => {
    const response = await api.put(`/commercial/admin/categories/${id}`, data);
    return response.data;
  },

  products: async (): Promise<CatalogProduct[]> => {
    const response = await api.get('/commercial/admin/products');
    return (response.data || []).map(mapCommercialProduct);
  },

  updateProduct: async (id: string, data: CommercialProductInput): Promise<CatalogProduct> => {
    const response = await api.put(`/commercial/admin/products/${id}`, data);
    return mapCommercialProduct(response.data);
  },

  replaceProductImages: async (id: string, files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    await api.post(`/commercial/admin/products/${id}/images?replace=true`, formData);
  },

  deleteProductImage: async (productId: string, imageId: string): Promise<void> => {
    await api.delete(`/commercial/admin/products/${productId}/images/${imageId}`);
  },

  settings: async (): Promise<CommercialSiteSettings | null> => {
    const response = await api.get('/commercial/admin/settings');
    return response.data;
  },

  updateSettings: async (data: CommercialSiteSettings): Promise<CommercialSiteSettings> => {
    const response = await api.put('/commercial/admin/settings', data);
    return response.data;
  },
};
