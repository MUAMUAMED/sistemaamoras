
// === SISTEMA DE DEBUG ULTRA-ATIVO NO FRONTEND ===
let requestCounter = 0;

// Heartbeat do frontend
setInterval(() => {
  console.log('💓 [FRONTEND HEARTBEAT]', new Date().toISOString(), '- Sistema ativo, aguardando requisições');
}, 15000); // A cada 15 segundos

console.log('🚨🚨🚨 FRONTEND DEBUG SYSTEM ATIVO 🚨🚨🚨');
console.log('⏰ Frontend carregado em:', new Date().toISOString());
console.log('🔄 Sistema de debug ativo - logs aparecerão constantemente');
console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');

import axios from 'axios';
import {
  User,
  Lead,
  Product,
  Category,
  Subcategory,
  Pattern,
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
} from '../types';

// Configuração base do Axios
const baseURL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? 'https://amoras-sistema-gew1.gbl2yq.easypanel.host/api'
    : 'https://amoras-sistema-gew1.gbl2yq.easypanel.host/api'
);

console.log('🔧 API Configuration:');
console.log('- Base URL:', baseURL);
console.log('- Current Origin:', window.location.origin);
console.log('- Environment:', process.env.NODE_ENV);
console.log('- REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
  // Configurações adicionais para tentar contornar CORS
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Interceptor para adicionar token de autenticação

// Request interceptor with ultra debug
api.interceptors.request.use(
  (config) => {
    requestCounter++;
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('🚀🚀🚀 INTERCEPTOR REQUEST ATIVADO 🚀🚀🚀');
    console.log('🔢 Request #:', requestCounter);
    console.log('⏰ Timestamp:', timestamp);
    console.log('🔄 Método:', config.method?.toUpperCase());
    console.log('🔄 URL:', config.url);
    console.log('🔄 Base URL:', config.baseURL);
    console.log('🔄 Full URL:', `${config.baseURL}${config.url}`);
    console.log('🔄 Headers enviados:', JSON.stringify(config.headers, null, 2));
    console.log('🔄 Data/Body:', config.data);
    console.log('🔄 Params:', config.params);
    console.log('🔄 Timeout:', config.timeout);
    console.log('🔄 WithCredentials:', config.withCredentials);
    
    // Log especial para login
    if (config.url?.includes('/auth/login')) {
      console.log('🔐🔐🔐 REQUISIÇÃO DE LOGIN SENDO ENVIADA! 🔐🔐🔐');
      console.log('🔐 Esta requisição DEVE chegar no backend!');
      console.log('🔐 Se não aparecer logs no backend, o problema é de rede/proxy');
    }
    
    console.log('🚀🚀🚀 FIM INTERCEPTOR REQUEST 🚀🚀🚀');
    console.log('');
    
    return config;
  },
  (error) => {
    console.log('');
    console.log('❌❌❌ ERRO NO REQUEST INTERCEPTOR ❌❌❌');
    console.log('❌ Erro:', error);
    console.log('❌ Message:', error.message);
    console.log('❌ Stack:', error.stack);
    console.log('❌❌❌ FIM ERRO REQUEST ❌❌❌');
    console.log('');
    return Promise.reject(error);
  }
);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros

// Response interceptor with ultra debug
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('📥📥📥 INTERCEPTOR RESPONSE SUCCESS 📥📥📥');
    console.log('⏰ Timestamp:', timestamp);
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    console.log('🔄 URL:', response.config?.url);
    console.log('🔄 Método:', response.config?.method?.toUpperCase());
    console.log('📋 Headers de resposta:', JSON.stringify(response.headers, null, 2));
    console.log('💾 Data recebida:', response.data);
    
    // Verificar CORS headers especificamente
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials']
    };
    
    console.log('🌐 CORS Headers recebidos:', corsHeaders);
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log('✅ CORS OK: Access-Control-Allow-Origin presente!');
    } else {
      console.log('❌ CORS PROBLEMA: Access-Control-Allow-Origin ausente!');
    }
    
    console.log('📥📥📥 FIM RESPONSE SUCCESS 📥📥📥');
    console.log('');
    
    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('❌❌❌ INTERCEPTOR RESPONSE ERROR ❌❌❌');
    console.log('⏰ Timestamp:', timestamp);
    console.log('❌ Error completo:', error);
    console.log('❌ Error name:', error?.name);
    console.log('❌ Error message:', error?.message);
    console.log('❌ Error code:', error?.code);
    console.log('❌ Error status:', error?.response?.status);
    console.log('❌ Error statusText:', error?.response?.statusText);
    console.log('❌ Error data:', error?.response?.data);
    console.log('❌ Error headers:', error?.response?.headers);
    console.log('❌ Error config:', error?.config);
    console.log('❌ Request que falhou:', {
      method: error?.config?.method,
      url: error?.config?.url,
      baseURL: error?.config?.baseURL,
      fullURL: `${error?.config?.baseURL}${error?.config?.url}`
    });
    
    // Análise específica de CORS
    if (error?.message?.includes('CORS') || error?.message?.includes('Access-Control')) {
      console.log('🚨🚨🚨 ERRO DE CORS DETECTADO! 🚨🚨🚨');
      console.log('🚨 Este é um erro de CORS policy');
      console.log('🚨 O browser bloqueou a requisição');
      console.log('🚨 Verificar se backend está enviando headers corretos');
    }
    
    if (error?.code === 'ERR_NETWORK') {
      console.log('🌐🌐🌐 ERRO DE REDE DETECTADO! 🌐🌐🌐');
      console.log('🌐 Possíveis causas:');
      console.log('🌐 1. Backend não está rodando');
      console.log('🌐 2. Problema de CORS (mais provável)');
      console.log('🌐 3. Problema de rede/DNS');
      console.log('🌐 4. Firewall/proxy bloqueando');
    }
    
    console.log('❌❌❌ FIM RESPONSE ERROR ❌❌❌');
    console.log('');
    
    return Promise.reject(error);
  }
);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      headers: error.response?.headers,
      data: error.response?.data,
      code: error.code,
      stack: error.stack
    });
    
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