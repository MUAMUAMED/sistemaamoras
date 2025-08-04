// Tipos de usuário
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'ATTENDANT';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos de lead status
export type LeadStatus = 'NEW_LEAD' | 'IN_SERVICE' | 'INTERESTED' | 'NEGOTIATING' | 'SALE_COMPLETED' | 'COLD_LEAD' | 'NO_RESPONSE' | 'REACTIVATE';

// Tipos de autenticação
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// Tipos de categoria
export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos de subcategoria
export interface Subcategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

// Tipos de estampa/padrão
export interface Pattern {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos de tamanho
export interface Size {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos de produto
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number; // Estoque total (para compatibilidade)
  stockLoja: number; // Estoque na Loja
  stockArmazem: number; // Estoque no Armazém
  minStock: number;
  barcode: string;
  qrcodeUrl?: string;
  imageUrl?: string;
  categoryId: string;
  subcategoryId?: string; // Opcional
  sizeId: string; // ID do tamanho
  patternId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relações
  category?: Category;
  subcategory?: Subcategory;
  pattern?: Pattern;
  size?: Size; // Relação completa do tamanho
}

// Enums de localização de estoque
export type StockLocation = 'LOJA' | 'ARMAZEM';

// Tipos de movimentação de estoque
export interface StockMovement {
  id: string;
  productId: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'SALE' | 'RETURN' | 'LOSS' | 'TRANSFER';
  quantity: number;
  reason: string;
  reference?: string;
  userId?: string;
  location?: StockLocation; // Para ENTRY/EXIT/ADJUSTMENT
  fromLocation?: StockLocation; // Para TRANSFER
  toLocation?: StockLocation; // Para TRANSFER
  createdAt: string;
  
  // Relações
  product?: {
    name: string;
    barcode: string;
  };
}

// Tipos de lead
export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  channel: string;
  source?: string;
  status: LeadStatus;
  leadScore: number;
  tags: string[];
  notes?: string;
  totalPurchases: number;
  purchaseCount: number;
  assignedToId?: string;
  lastInteraction?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relações
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  interactions?: Interaction[];
  sales?: Sale[];
  _count?: {
    interactions: number;
    sales: number;
  };
}

// Tipos de interação
export interface Interaction {
  id: string;
  leadId: string;
  userId: string;
  type: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'NOTE' | 'STATUS_CHANGE' | 'SALE' | 'FOLLOW_UP';
  title: string;
  description: string;
  outcome?: string;
  nextAction?: string;
  scheduledAt?: string;
  createdAt: string;
  
  // Relações
  lead?: {
    name: string;
    phone: string;
  };
}

// Tipos de venda
export interface Sale {
  id: string;
  saleNumber: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  total: number;
  discount: number;
  subtotal: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  paymentMethod?: string;
  paymentStatus?: string;
  paymentReference?: string;
  qrcodeUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  
  // Relações
  items?: SaleItem[];
  lead?: {
    name: string;
    phone: string;
  };
}

// Tipos de item de venda
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  
  // Relações
  product?: Product;
}

// Tipos de configuração do sistema
export interface SystemConfig {
  id: string;
  chatwootUrl?: string;
  chatwootToken?: string;
  n8nWebhookUrl?: string;
  paymentGateway?: string;
  gatewayConfig?: any;
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  saleNumberPrefix: string;
  nextSaleNumber: number;
  createdAt: string;
  updatedAt: string;
}

// Tipos de dashboard
export interface DashboardMetrics {
  totalProducts: number;
  totalCategories: number;
  totalPatterns: number;
  totalLeads: number;
  totalSales: number;
  totalRevenue: number;
  revenueThisMonth: number;
  newLeadsToday: number;
  newLeadsThisWeek: number;
  hotLeads: number;
  conversions: number;
  conversionRate: number;
  lowStockProducts: number;
  recentSales: Sale[];
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
}

// Tipos de pipeline CRM
export interface PipelineMetrics {
  pipeline: Array<{
    status: string;
    count: number;
    totalValue: number;
    avgScore: number;
    percentage: number;
  }>;
  totalLeads: number;
  conversionRate: number;
  totalRevenue: number;
}

// Tipos de códigos de barras
export interface GeneratedCodes {
  sku: string;
  barcode: string;
  qrcodeUrl: string;
}

export interface ProductCodeData {
  sizeId: string;
  categoryId: string;
  subcategoryId?: string;
  patternId: string;
}

// Tipos de paginação
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Tipos de resposta da API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Tipos para formulários
export interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  minStock: number;
  categoryId: string;
  subcategoryId?: string; // Opcional
  patternId: string;
  sizeId: string; // ID do tamanho para buscar dados
  active?: boolean;
  imageFile?: File;
}

export interface SubcategoryFormData {
  name: string;
  code: string;
  description?: string;
  categoryId: string;
  active?: boolean;
}

export interface LeadFormData {
  name: string;
  phone: string;
  email?: string;
  channel: string;
  source?: string;
  assignedToId?: string;
  notes?: string;
  leadScore?: number;
  tags?: string[];
}

export interface InteractionFormData {
  type: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'NOTE' | 'STATUS_CHANGE' | 'SALE' | 'FOLLOW_UP';
  title: string;
  description: string;
  outcome?: string;
  nextAction?: string;
  scheduledAt?: string;
}

export interface SaleFormData {
  leadId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  discount?: number;
  paymentMethod?: string;
}

// Tipos de filtros
export interface LeadFilters {
  status?: string;
  assignedTo?: string;
  channel?: string;
  search?: string;
  tags?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  limit?: number;
}

export interface ProductFilters {
  category?: string;
  pattern?: string;
  size?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface SaleFilters {
  status?: string;
  leadId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Tipos de webhook
export interface WebhookLog {
  id: string;
  event: string;
  payload: any;
  source: string;
  processed: boolean;
  createdAt: string;
}

// Tipos de relatórios
export interface SalesReport {
  period: string;
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

export interface LeadsReport {
  period: string;
  totalLeads: number;
  conversionRate: number;
  leadsBySource: Array<{
    source: string;
    count: number;
    conversionRate: number;
  }>;
  leadsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface StockReport {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: Product[];
  topMovements: Array<{
    product: Product;
    totalMovements: number;
    lastMovement: string;
  }>;
  movementsByType: Array<{
    type: string;
    count: number;
    totalQuantity: number;
  }>;
} 