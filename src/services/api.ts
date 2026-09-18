import axios from 'axios';
import {
  User,
  Lead,
  Product,
  Category,
  Subcategory,
  Pattern,
  PatternCluster,
  PatternRedirect,
  MergePatternsPayload,
  MergePatternsResponse,
  Size,
  Sale,
  SaleItem,
  StockMovement,
  StockLocation,
  Interaction,
  SystemConfig,
  DashboardMetrics,
  PipelineMetrics,
  GeneratedCodes,
  ProductCodeData,
  WebhookLog,
  LoginData,
  LoginResponse,
  ProductFormData,
  SubcategoryFormData,
  LeadFormData,
  InteractionFormData,
  SaleFormData,
  LeadFilters,
  ProductFilters,
  SaleFilters,
  PaginatedResponse,
  ApiResponse,
  FiscalConfig,
  FiscalDocument,
  FiscalDanfe,
  SalesReportData,
} from '../types';

// Configuração base do Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (
    process.env.NODE_ENV === 'production' 
      ? 'https://amorasbackenddd.zeabur.app/api'
      : 'https://amorasbackenddd.zeabur.app/api'
  ),
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authApi = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  me: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Serviços de usuários
export const usersApi = {
  list: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<User>): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

// Serviços de tamanhos
export const sizesApi = {
  list: async (filters?: { active?: boolean }): Promise<Size[]> => {
    const response = await api.get('/sizes', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Size> => {
    const response = await api.get(`/sizes/${id}`);
    return response.data;
  },
  
  create: async (data: Omit<Size, 'id' | 'createdAt' | 'updatedAt'>): Promise<Size> => {
    const response = await api.post('/sizes', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Size>): Promise<Size> => {
    const response = await api.put(`/sizes/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string, force?: boolean): Promise<void> => {
    const params = force ? { force: 'true' } : {};
    await api.delete(`/sizes/${id}`, { params });
  },
};

// Serviços de categorias
export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data;
  },
  
  getById: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Category>): Promise<Category> => {
    const response = await api.post('/categories', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string, force?: boolean): Promise<void> => {
    const params = force ? { force: 'true' } : {};
    await api.delete(`/categories/${id}`, { params });
  },
};

// Serviços de subcategorias
export const subcategoriesApi = {
  list: async (filters?: { categoryId?: string; active?: boolean }): Promise<Subcategory[]> => {
    const response = await api.get('/subcategories', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Subcategory> => {
    const response = await api.get(`/subcategories/${id}`);
    return response.data;
  },
  
  create: async (data: SubcategoryFormData): Promise<Subcategory> => {
    const response = await api.post('/subcategories', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<SubcategoryFormData>): Promise<Subcategory> => {
    const response = await api.put(`/subcategories/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string, force?: boolean): Promise<void> => {
    const params = force ? { force: 'true' } : {};
    await api.delete(`/subcategories/${id}`, { params });
  },
  
  getByCategory: async (categoryId: string): Promise<Subcategory[]> => {
    const response = await api.get(`/subcategories/category/${categoryId}`);
    return response.data;
  },
};

// Serviços de padrões/estampas
export const patternsApi = {
  list: async (): Promise<Pattern[]> => {
    const response = await api.get('/patterns');
    return response.data;
  },
  
  getById: async (id: string): Promise<Pattern> => {
    const response = await api.get(`/patterns/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<Pattern>): Promise<Pattern> => {
    const response = await api.post('/patterns', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<Pattern>): Promise<Pattern> => {
    const response = await api.put(`/patterns/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string, force?: boolean): Promise<void> => {
    const params = force ? { force: 'true' } : {};
    await api.delete(`/patterns/${id}`, { params });
  },

  getClusters: async (): Promise<{ clusters: PatternCluster[]; totalDuplicatesFound: number }> => {
    const response = await api.get('/patterns/clusters');
    return response.data;
  },

  merge: async (data: MergePatternsPayload): Promise<MergePatternsResponse> => {
    const response = await api.post('/patterns/merge', data);
    return response.data;
  },

  getRedirects: async (): Promise<PatternRedirect[]> => {
    const response = await api.get('/patterns/redirects');
    return response.data;
  },
};

// Serviços de produtos
export const productsApi = {
  list: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/products', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  
  create: async (data: ProductFormData): Promise<Product> => {
    const response = await api.post('/products', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<ProductFormData>): Promise<Product> => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
  
  searchByCode: async (code: string): Promise<Product> => {
    const response = await api.get(`/products/search/${code}`);
    return response.data;
  },
  
  generateCodes: async (data: ProductCodeData): Promise<GeneratedCodes> => {
    const response = await api.post('/products/generate-codes', data);
    return response.data;
  },
  
  uploadImage: async (id: string, imageFile: File): Promise<{ product: Product; imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await api.post(`/products/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadImages: async (id: string, images: File[], type: 'ROUPA' | 'IA'): Promise<{ message: string }> => {
    const formData = new FormData();
    images.forEach((file) => formData.append('images', file));
    const response = await api.post(`/products/${id}/images?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  finishProduction: async (id: string): Promise<Product> => {
    const response = await api.put(`/products/${id}/finish-production`);
    return response.data;
  },
  
  addStock: async (id: string, quantity: number, reason?: string): Promise<{
    message: string;
    product: Product;
    stockAdded: number;
    previousStock: number;
    newStock: number;
  }> => {
    const response = await api.put(`/products/${id}/stock/add`, {
      quantity,
      reason: reason || 'Adição manual de estoque'
    });
    return response.data;
  },
  
  removeStock: async (id: string, quantity: number, reason?: string): Promise<{
    message: string;
    product: Product;
    stockRemoved: number;
    previousStock: number;
    newStock: number;
  }> => {
    const response = await api.put(`/products/${id}/stock/remove`, {
      quantity,
      reason: reason || 'Retirada manual de estoque'
    });
    return response.data;
  },
  
  getStockHistory: async (id: string): Promise<{
    product: { id: string; name: string; stock: number };
    movements: StockMovement[];
    totalMovements: number;
  }> => {
    const response = await api.get(`/products/${id}/stock/history`);
    return response.data;
  },
  
  addStockLocation: async (id: string, quantity: number, location: StockLocation, reason?: string): Promise<{
    message: string;
    product: Product;
  }> => {
    const response = await api.patch(`/products/${id}/stock/add-location`, {
      quantity,
      location,
      reason: reason || `Adição manual de estoque - ${location}`
    });
    return response.data;
  },
  
  removeStockLocation: async (id: string, quantity: number, location: StockLocation, reason?: string): Promise<{
    message: string;
    product: Product;
  }> => {
    const response = await api.patch(`/products/${id}/stock/remove-location`, {
      quantity,
      location,
      reason: reason || `Retirada manual de estoque - ${location}`
    });
    return response.data;
  },
  
  transferStock: async (id: string, quantity: number, fromLocation: StockLocation, toLocation: StockLocation, reason?: string): Promise<{
    message: string;
    product: Product;
    transferDetails: {
      quantity: number;
      fromLocation: StockLocation;
      toLocation: StockLocation;
      previousFromStock: number;
      newFromStock: number;
      previousToStock: number;
      newToStock: number;
    };
  }> => {
    const response = await api.patch(`/products/${id}/stock/transfer`, {
      quantity,
      fromLocation,
      toLocation,
      reason: reason || `Transferência de estoque: ${fromLocation} → ${toLocation}`
    });
    return response.data;
  },

  publishToCommercialSite: async (id: string, data?: {
    title?: string;
    slug?: string;
    description?: string;
    shortDescription?: string;
    categoryId?: string | null;
    featured?: boolean;
    position?: number;
  }): Promise<Product['commercialProduct']> => {
    const response = await api.post(`/commercial/admin/products/publish/${id}`, data || {});
    return response.data;
  },

  unpublishFromCommercialSite: async (commercialProductId: string): Promise<Product['commercialProduct']> => {
    const response = await api.put(`/commercial/admin/products/${commercialProductId}/unpublish`);
    return response.data;
  },
};

// Serviços de movimentações de estoque
export const stockMovementsApi = {
  list: async (filters?: {
    productId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<StockMovement>> => {
    const response = await api.get('/stock-movements', { params: filters });
    return response.data;
  },
  
  create: async (data: {
    productId: string;
    type: string;
    quantity: number;
    reason: string;
    reference?: string;
  }): Promise<StockMovement> => {
    const response = await api.post('/stock-movements', data);
    return response.data;
  },
  
  getByProduct: async (productId: string, page?: number, limit?: number): Promise<PaginatedResponse<StockMovement>> => {
    const response = await api.get(`/stock-movements/product/${productId}`, {
      params: { page, limit }
    });
    return response.data;
  },
  
  adjustStock: async (data: {
    productId: string;
    newStock: number;
    reason: string;
  }): Promise<{ movement: StockMovement; product: Product }> => {
    const response = await api.post('/stock-movements/adjust', data);
    return response.data;
  },
};

// Serviços de leads
export const leadsApi = {
  list: async (filters?: LeadFilters): Promise<PaginatedResponse<Lead>> => {
    const response = await api.get('/leads', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Lead> => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },
  
  create: async (data: LeadFormData): Promise<Lead> => {
    const response = await api.post('/leads', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<LeadFormData>): Promise<Lead> => {
    const response = await api.put(`/leads/${id}`, data);
    return response.data;
  },
  
  updateStatus: async (id: string, data: { status: string; notes?: string }): Promise<Lead> => {
    const response = await api.put(`/leads/${id}/status`, data);
    return response.data;
  },
  
  updateScore: async (id: string, data: { score: number; reason?: string }): Promise<Lead> => {
    const response = await api.put(`/leads/${id}/score`, data);
    return response.data;
  },
  
  updateTags: async (id: string, data: { tags: string[] }): Promise<Lead> => {
    const response = await api.put(`/leads/${id}/tags`, data);
    return response.data;
  },
  
  getPipeline: async (): Promise<PipelineMetrics> => {
    const response = await api.get('/leads/pipeline');
    return response.data;
  },
  
  getDashboard: async (): Promise<{
    totalLeads: number;
    newLeadsToday: number;
    newLeadsThisWeek: number;
    newLeadsThisMonth: number;
    hotLeads: number;
    coldLeads: number;
    conversions: number;
    conversionRate: number;
    topPerformers: Array<{
      id: string;
      name: string;
      conversions: number;
    }>;
  }> => {
    const response = await api.get('/leads/dashboard');
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/leads/${id}`);
  },
};

// Serviços de interações
export const interactionsApi = {
  list: async (filters?: {
    leadId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Interaction>> => {
    const response = await api.get('/interactions', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Interaction> => {
    const response = await api.get(`/interactions/${id}`);
    return response.data;
  },
  
  create: async (data: InteractionFormData & { leadId: string }): Promise<Interaction> => {
    const { leadId, ...interactionData } = data;
    const response = await api.post(`/leads/${leadId}/interactions`, interactionData);
    return response.data;
  },
  
  update: async (id: string, data: Partial<InteractionFormData>): Promise<Interaction> => {
    const response = await api.put(`/interactions/${id}`, data);
    return response.data;
  },
  
  getByLead: async (leadId: string, page?: number, limit?: number): Promise<PaginatedResponse<Interaction>> => {
    const response = await api.get(`/interactions/lead/${leadId}`, {
      params: { page, limit }
    });
    return response.data;
  },
  
  getScheduled: async (date?: string, userId?: string): Promise<Interaction[]> => {
    const response = await api.get('/interactions/scheduled', {
      params: { date, userId }
    });
    return response.data;
  },
};

// Serviços de vendas
export const salesApi = {
  list: async (filters?: SaleFilters): Promise<PaginatedResponse<Sale>> => {
    const response = await api.get('/sales', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Sale> => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },
  
  create: async (data: SaleFormData): Promise<Sale> => {
    const response = await api.post('/sales', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<SaleFormData>): Promise<Sale> => {
    const response = await api.put(`/sales/${id}`, data);
    return response.data;
  },
  
  cancel: async (id: string, reason: string): Promise<Sale> => {
    const response = await api.post(`/sales/${id}/cancel`, { reason });
    return response.data;
  },
  
  generatePayment: async (id: string): Promise<{ paymentUrl: string; qrcodeUrl: string }> => {
    const response = await api.post(`/sales/${id}/payment`);
    return response.data;
  },
  
  processPayment: async (id: string, data: {
    method: string;
    reference?: string;
  }): Promise<Sale> => {
    const response = await api.post(`/sales/${id}/process-payment`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<{ message: string; saleNumber: string }> => {
    const response = await api.delete(`/sales/${id}`);
    return response.data;
  },

  /** Emite (ou consulta, se já existir) a NFC-e da venda já concluída. */
  issueNfce: async (id: string): Promise<{ id: string; number: number; series: number; status: string; statusMessage?: string | null }> => {
    const response = await api.post(`/fiscal/sales/${id}/issue-nfce`);
    return response.data;
  },

  getReport: async (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    sellerId?: string;
  }): Promise<SalesReportData> => {
    try {
      const response = await api.get('/sales/report', { params });
      return response.data;
    } catch (err: any) {
      console.warn('Backend /sales/report fallback triggered:', err);
      // Fallback em caso de atraso na propagação do deploy
      const salesRes = await salesApi.list({ limit: 500 });
      const sales = salesRes.data || [];

      const start = params?.startDate ? new Date(params.startDate) : null;
      const end = params?.endDate ? new Date(params.endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      const filtered = sales.filter((s: Sale) => {
        if (params?.status && params.status !== 'ALL' && s.status !== params.status) return false;
        const d = new Date(s.createdAt);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });

      let totalRevenue = 0;
      let totalDiscount = 0;
      let totalItemsSold = 0;

      const patternsMap = new Map<string, any>();
      const categoriesMap = new Map<string, any>();
      const subcategoriesMap = new Map<string, any>();
      const paymentMethodsMap = new Map<string, any>();
      const timelineMap = new Map<string, any>();
      const productsMap = new Map<string, any>();

      for (const sale of filtered) {
        totalRevenue += sale.total || 0;
        totalDiscount += sale.discount || 0;

        const method = sale.paymentMethod || 'OUTRO';
        const currentMethod = paymentMethodsMap.get(method) || { method, count: 0, totalRevenue: 0 };
        currentMethod.count += 1;
        currentMethod.totalRevenue += sale.total || 0;
        paymentMethodsMap.set(method, currentMethod);

        const saleDate = new Date(sale.createdAt);
        const dateKey = saleDate.toISOString().split('T')[0];
        const formattedDate = `${String(saleDate.getDate()).padStart(2, '0')}/${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        const currentDay = timelineMap.get(dateKey) || { date: dateKey, formattedDate, totalRevenue: 0, salesCount: 0, itemsCount: 0 };
        currentDay.totalRevenue += sale.total || 0;
        currentDay.salesCount += 1;

        for (const item of sale.items || []) {
          const qty = item.quantity || 0;
          const itemRev = item.total || (qty * (item.unitPrice || 0));
          totalItemsSold += qty;
          currentDay.itemsCount += qty;

          const p = item.product;
          if (p) {
            const pat = p.pattern;
            const patId = pat?.id || 'sem-estampa';
            const patName = pat?.name || 'Sem Estampa';
            const patCode = pat?.code || '0000';
            const img = p.images?.[0]?.url || p.imageUrl;
            const curPat = patternsMap.get(patId) || { id: patId, name: patName, code: patCode, totalQuantity: 0, totalRevenue: 0, sampleImage: img };
            curPat.totalQuantity += qty;
            curPat.totalRevenue += itemRev;
            if (!curPat.sampleImage && img) curPat.sampleImage = img;
            patternsMap.set(patId, curPat);

            const cat = p.category;
            const catId = cat?.id || 'sem-categoria';
            const catName = cat?.name || 'Sem Categoria';
            const catCode = cat?.code || '00';
            const curCat = categoriesMap.get(catId) || { id: catId, name: catName, code: catCode, totalQuantity: 0, totalRevenue: 0 };
            curCat.totalQuantity += qty;
            curCat.totalRevenue += itemRev;
            categoriesMap.set(catId, curCat);

            const sub = p.subcategory;
            if (sub) {
              const curSub = subcategoriesMap.get(sub.id) || { id: sub.id, name: sub.name, code: sub.code, categoryName: catName, totalQuantity: 0, totalRevenue: 0 };
              curSub.totalQuantity += qty;
              curSub.totalRevenue += itemRev;
              subcategoriesMap.set(sub.id, curSub);
            }

            const curProd = productsMap.get(p.id) || { id: p.id, name: p.name, categoryName: catName, patternName: patName, sizeName: p.size?.name, totalQuantity: 0, totalRevenue: 0, imageUrl: img };
            curProd.totalQuantity += qty;
            curProd.totalRevenue += itemRev;
            productsMap.set(p.id, curProd);
          }
        }
        timelineMap.set(dateKey, currentDay);
      }

      return {
        period: {
          startDate: params?.startDate || '',
          endDate: params?.endDate || '',
        },
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalSales: filtered.length,
          totalItemsSold,
          averageTicket: filtered.length > 0 ? Math.round((totalRevenue / filtered.length) * 100) / 100 : 0,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
        },
        patternsRanking: Array.from(patternsMap.values())
          .map((p: any) => ({
            ...p,
            totalRevenue: Math.round(p.totalRevenue * 100) / 100,
            percentageOfTotal: totalItemsSold > 0 ? Math.round((p.totalQuantity / totalItemsSold) * 1000) / 10 : 0,
          }))
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity),
        categoriesRanking: Array.from(categoriesMap.values())
          .map((c: any) => ({
            ...c,
            totalRevenue: Math.round(c.totalRevenue * 100) / 100,
            percentageOfTotal: totalItemsSold > 0 ? Math.round((c.totalQuantity / totalItemsSold) * 1000) / 10 : 0,
          }))
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity),
        subcategoriesRanking: Array.from(subcategoriesMap.values())
          .map((s: any) => ({
            ...s,
            totalRevenue: Math.round(s.totalRevenue * 100) / 100,
            percentageOfTotal: totalItemsSold > 0 ? Math.round((s.totalQuantity / totalItemsSold) * 1000) / 10 : 0,
          }))
          .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity),
        paymentMethods: Array.from(paymentMethodsMap.values())
          .map((m: any) => ({
            ...m,
            totalRevenue: Math.round(m.totalRevenue * 100) / 100,
            percentage: totalRevenue > 0 ? Math.round((m.totalRevenue / totalRevenue) * 1000) / 10 : 0,
          }))
          .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue),
        timeline: Array.from(timelineMap.values()).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        topProducts: Array.from(productsMap.values()).sort((a: any, b: any) => b.totalQuantity - a.totalQuantity).slice(0, 20),
      };
    }
  },
};

export const fiscalApi = {
  getConfig: async (): Promise<FiscalConfig | null> => (await api.get('/fiscal/config')).data,
  updateConfig: async (data: Partial<FiscalConfig> & { cscToken?: string; certificatePfxBase64?: string; certificatePassword?: string }): Promise<FiscalConfig> =>
    (await api.put('/fiscal/config', data)).data,
  listDocuments: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    environment?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<FiscalDocument>> =>
    (await api.get('/fiscal/documents', { params })).data,
  issueNfce: async (saleId: string): Promise<FiscalDocument> => (await api.post(`/fiscal/sales/${saleId}/issue-nfce`)).data,
  issueManualNfce: async (data: {
    recipientName?: string;
    recipientTaxId?: string;
    paymentMethod: 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_SLIP' | 'BANK_TRANSFER';
    notes?: string;
    items: Array<{
      productCode?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      ncm?: string;
      cfop?: string;
    }>;
  }): Promise<FiscalDocument> => (await api.post('/fiscal/manual/issue-nfce', data)).data,
    getAiProviders: async (): Promise<{
      providers: Array<{
        id: 'gemini' | 'groq' | 'openrouter';
        label: string;
        model: string;
        configured: boolean;
        enabled: boolean;
        isDefault: boolean;
        source: 'database' | 'environment' | null;
      }>;
      defaultProvider: 'gemini' | 'groq' | 'openrouter' | null;
    }> => (await api.get('/fiscal/ai/providers')).data,
    saveAiProvider: async (
      provider: 'gemini' | 'groq' | 'openrouter',
      data: {
        apiKey?: string;
        model: string;
        enabled: boolean;
        isDefault: boolean;
        clearKey?: boolean;
      }
    ): Promise<{
      providers: Array<{
        id: 'gemini' | 'groq' | 'openrouter';
        label: string;
        model: string;
        configured: boolean;
        enabled: boolean;
        isDefault: boolean;
        source: 'database' | 'environment' | null;
      }>;
      defaultProvider: 'gemini' | 'groq' | 'openrouter' | null;
    }> => (await api.put(`/fiscal/ai/providers/${provider}`, data)).data,
    testAiProvider: async (
      provider: 'gemini' | 'groq' | 'openrouter'
    ): Promise<{ success: boolean; provider: string; model: string; message: string }> =>
      (await api.post(`/fiscal/ai/providers/${provider}/test`)).data,
    parseManualDraft: async (data: {
    provider: 'gemini' | 'groq' | 'openrouter';
    prompt: string;
  }): Promise<{
    provider: 'gemini' | 'groq' | 'openrouter';
    model: string;
    warnings: string[];
    draft: {
      recipientName: string;
      recipientTaxId: string;
      paymentMethod: 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_SLIP' | 'BANK_TRANSFER';
      notes: string;
      items: Array<{
        productCode: string;
        description: string;
        quantity: number;
        unitPrice: number;
        ncm: string;
        cfop: string;
      }>;
    };
  }> => (await api.post('/fiscal/ai/parse-draft', data)).data,
  retry: async (id: string): Promise<FiscalDocument> => (await api.post(`/fiscal/documents/${id}/retry`)).data,
  cancel: async (id: string, reason: string) => (await api.post(`/fiscal/documents/${id}/cancel`, { reason })).data,
  checkStatus: async () => (await api.get('/fiscal/status')).data,
  getDanfe: async (id: string): Promise<FiscalDanfe> => (await api.get(`/fiscal/documents/${id}/danfe`)).data,
  downloadXml: async (id: string): Promise<Blob> =>
    (await api.get(`/fiscal/documents/${id}/xml`, { responseType: 'blob' })).data,
};

// Serviços de códigos de barras
export const barcodeApi = {
  generate: async (data: ProductCodeData): Promise<GeneratedCodes> => {
    const response = await api.post('/barcode/generate', data);
    return response.data;
  },
  
  scan: async (code: string): Promise<{ product: Product; isValid: boolean }> => {
    const response = await api.post('/barcode/scan', { code });
    return response.data;
  },
  
  validate: async (barcode: string): Promise<{ isValid: boolean; checkDigit: string }> => {
    const response = await api.post('/barcode/validate', { barcode });
    return response.data;
  },
  
  parseSku: async (sku: string): Promise<{
    skuInfo: {
      sizeCode: string;
      categoryCode: string;
      patternCode: string;
    };
    details: {
      size: Size;
      category: Category;
      pattern: Pattern;
    };
  }> => {
    const response = await api.post('/barcode/parse-sku', { sku });
    return response.data;
  },
  
  generateSaleQR: async (saleId: string): Promise<{ qrcodeUrl: string }> => {
    const response = await api.post('/barcode/generate-sale-qr', { saleId });
    return response.data;
  },
};

// Serviços de configurações do sistema
export const systemConfigApi = {
  get: async (): Promise<SystemConfig> => {
    const response = await api.get('/system-config');
    return response.data;
  },
  
  update: async (data: Partial<SystemConfig>): Promise<SystemConfig> => {
    const response = await api.put('/system-config', data);
    return response.data;
  },
  
  getNextSaleNumber: async (): Promise<{ saleNumber: string; nextNumber: number }> => {
    const response = await api.post('/system-config/next-sale-number');
    return response.data;
  },
};

// Serviços de dashboard
export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const response = await api.get('/dashboard');
    return response.data;
  },
  
  getSalesMetrics: async (period?: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    averageTicket: number;
    salesByDay: Array<{ date: string; count: number; revenue: number }>;
  }> => {
    const response = await api.get('/dashboard/sales', { params: { period } });
    return response.data;
  },
  
  getStockMetrics: async (): Promise<{
    totalProducts: number;
    lowStockProducts: Product[];
    topProducts: Array<{ product: Product; quantity: number }>;
  }> => {
    const response = await api.get('/dashboard/stock');
    return response.data;
  },
};

// Serviços de webhooks
export const webhooksApi = {
  list: async (page?: number, limit?: number): Promise<PaginatedResponse<WebhookLog>> => {
    const response = await api.get('/webhooks', { params: { page, limit } });
    return response.data;
  },
  
  getById: async (id: string): Promise<WebhookLog> => {
    const response = await api.get(`/webhooks/${id}`);
    return response.data;
  },
  
  reprocess: async (id: string): Promise<WebhookLog> => {
    const response = await api.post(`/webhooks/${id}/reprocess`);
    return response.data;
  },
};

// Serviço de pagamento Mercado Pago
export const paymentGatewayApi = {
  payPix: async (valor: number, descricao: string, email: string) => {
    const response = await api.post('/payment-gateway/pay', { valor, descricao, email });
    return response.data;
  },
};

// Exportações nomeadas para compatibilidade com as páginas
export const leadService = {
  list: leadsApi.list,
  getAll: leadsApi.list, // Alias para compatibilidade
  getById: leadsApi.getById,
  create: leadsApi.create,
  update: leadsApi.update,
  updateStatus: leadsApi.updateStatus,
  updateScore: leadsApi.updateScore,
  updateTags: leadsApi.updateTags,
  getPipeline: leadsApi.getPipeline,
  getDashboard: leadsApi.getDashboard,
  addInteraction: async (leadId: string, data: any) => {
    return interactionsApi.create({ ...data, leadId });
  },
  delete: leadsApi.delete,
};

export const productService = {
  list: productsApi.list,
  getAll: productsApi.list, // Alias para compatibilidade
  getById: productsApi.getById,
  create: productsApi.create,
  update: productsApi.update,
  delete: productsApi.delete,
  searchByCode: productsApi.searchByCode,
  generateCodes: productsApi.generateCodes,
};

export const saleService = {
  list: salesApi.list,
  getAll: salesApi.list, // Alias para compatibilidade
  getById: salesApi.getById,
  create: salesApi.create,
  update: salesApi.update,
  delete: salesApi.delete,
  cancel: salesApi.cancel,
  generatePayment: salesApi.generatePayment,
  processPayment: salesApi.processPayment,
  issueNfce: salesApi.issueNfce,
  getReport: salesApi.getReport,
};

export const categoryService = categoriesApi;
export const subcategoryService = subcategoriesApi;
export const patternService = patternsApi;
export const userService = usersApi;
export const dashboardService = {
  getMetrics: dashboardApi.getMetrics,
  getStats: dashboardApi.getMetrics, // Alias para compatibilidade
  getSalesMetrics: dashboardApi.getSalesMetrics,
  getStockMetrics: dashboardApi.getStockMetrics,
};

export default api; 
