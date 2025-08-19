import axios from 'axios';
import { LoginData, LoginResponse } from '../types';

// === SISTEMA DE DEBUG ULTRA-ATIVO NO FRONTEND ===
let requestCounter = 0;

// Heartbeat do frontend
setInterval(() => {
  console.log('💓 [FRONTEND HEARTBEAT]', new Date().toISOString(), '- Sistema ativo, aguardando requisições');
}, 15000);

console.log('🚨🚨🚨 FRONTEND DEBUG SYSTEM ATIVO 🚨🚨🚨');
console.log('⏰ Frontend carregado em:', new Date().toISOString());
console.log('🔄 Sistema de debug ativo - logs aparecerão constantemente');
console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');

// Configuração base do Axios
const baseURL = process.env.REACT_APP_API_URL || 'https://amoras-sistema-gew1.gbl2yq.easypanel.host/api';

console.log('🔧 API Configuration:');
console.log('- Base URL:', baseURL);
console.log('- Current Origin:', window.location.origin);
console.log('- Environment:', process.env.NODE_ENV);

const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor
api.interceptors.request.use(
  function(config) {
    requestCounter++;
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('🚀🚀🚀 INTERCEPTOR REQUEST ATIVADO 🚀🚀🚀');
    console.log('🔢 Request #:', requestCounter);
    console.log('⏰ Timestamp:', timestamp);
    console.log('🔄 Método:', config.method?.toUpperCase());
    console.log('🔄 URL:', config.url);
    console.log('🔄 Base URL:', config.baseURL);
    console.log('🔄 Headers enviados:', JSON.stringify(config.headers, null, 2));
    
    if (config.url?.includes('/auth/login')) {
      console.log('🔐🔐🔐 REQUISIÇÃO DE LOGIN SENDO ENVIADA! 🔐🔐🔐');
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🚀🚀🚀 FIM INTERCEPTOR REQUEST 🚀🚀🚀');
    console.log('');
    
    return config;
  },
  function(error) {
    console.log('❌❌❌ ERRO NO REQUEST INTERCEPTOR ❌❌❌');
    console.log('❌ Erro:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  function(response) {
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('📥📥📥 INTERCEPTOR RESPONSE SUCCESS 📥📥📥');
    console.log('⏰ Timestamp:', timestamp);
    console.log('📊 Status:', response.status);
    console.log('🔄 URL:', response.config?.url);
    console.log('📋 Headers de resposta:', JSON.stringify(response.headers, null, 2));
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
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
  function(error) {
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('❌❌❌ INTERCEPTOR RESPONSE ERROR ❌❌❌');
    console.log('⏰ Timestamp:', timestamp);
    console.log('❌ Error:', error);
    console.log('❌ Message:', error?.message);
    console.log('❌ Code:', error?.code);
    console.log('❌ Status:', error?.response?.status);
    
    if (error?.message?.includes('CORS') || error?.message?.includes('Access-Control')) {
      console.log('🚨🚨🚨 ERRO DE CORS DETECTADO! 🚨🚨🚨');
    }
    
    if (error?.code === 'ERR_NETWORK') {
      console.log('🌐🌐🌐 ERRO DE REDE DETECTADO! 🌐🌐🌐');
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    console.log('❌❌❌ FIM RESPONSE ERROR ❌❌❌');
    console.log('');
    
    return Promise.reject(error);
  }
);

// Serviços de autenticação (FUNCIONAIS)
export const authApi = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// Serviços stub - apenas para build funcionar
const stubService = {
  list: async () => ({ data: [], total: 0, page: 1, totalPages: 1 }),
  getAll: async () => ({ data: [], total: 0, page: 1, totalPages: 1 }),
  getById: async (id: string) => ({ id }),
  create: async (data: any) => data,
  update: async (id: string, data: any) => data,
  delete: async (id: string) => {},
};

export const productService = {
  ...stubService,
  searchByCode: async (code: string) => ({ id: code }),
  generateCodes: async (data: any) => data,
};

export const saleService = {
  ...stubService,
  cancel: async (id: string, reason: string) => ({ id }),
  generatePayment: async (id: string) => ({ paymentUrl: '', qrcodeUrl: '' }),
  processPayment: async (id: string, data: any) => data,
};

export const leadService = {
  ...stubService,
  updateStatus: async (id: string, data: any) => data,
  updateScore: async (id: string, data: any) => data,
  updateTags: async (id: string, data: any) => data,
  getPipeline: async () => ({}),
  getDashboard: async () => ({}),
  addInteraction: async (leadId: string, data: any) => data,
};

export const dashboardService = {
  getMetrics: async () => ({}),
  getStats: async () => ({}),
  getSalesMetrics: async () => ({}),
  getStockMetrics: async () => ({}),
};

export const categoriesApi = stubService;
export const subcategoriesApi = stubService;
export const sizesApi = stubService;
export const patternsApi = stubService;
export const leadsApi = stubService;
export const productsApi = stubService;

export const barcodeApi = {
  generate: async (data: any) => data,
  scan: async (code: string) => ({ product: { id: code }, isValid: true }),
  validate: async (barcode: string) => ({ isValid: true, checkDigit: '' }),
  parseSku: async (sku: string) => ({}),
  generateSaleQR: async (saleId: string) => ({ qrcodeUrl: '' }),
};

export const paymentGatewayApi = {
  payPix: async (valor: number, descricao: string, email: string) => ({}),
};

// Exportações para compatibilidade
export const authService = authApi;
export default api;