import axios from 'axios';
import {
  User,
  Lead,
  Product,
  Category,
  Pattern,
  Size,
  Sale,
  SaleItem,
  StockMovement,
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
  LeadFormData,
  InteractionFormData,
  SaleFormData,
  LeadFilters,
  ProductFilters,
  SaleFilters,
  PaginatedResponse,
  ApiResponse,
} from '../types';

// Configuração base do Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (
    process.env.NODE_ENV === 'production' 
      ? 'https://api.exemplo.com/api'
      : 'http://localhost:3001/api'
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
};

export const categoryService = categoriesApi;
export const patternService = patternsApi;
export const userService = usersApi;
export const dashboardService = {
  getMetrics: dashboardApi.getMetrics,
  getStats: dashboardApi.getMetrics, // Alias para compatibilidade
  getSalesMetrics: dashboardApi.getSalesMetrics,
  getStockMetrics: dashboardApi.getStockMetrics,
};

export default api; 