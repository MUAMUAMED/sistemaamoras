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
  images?: ProductImage[]; // Galeria de imagens
  categoryId: string;
  subcategoryId?: string; // Opcional
  sizeId: string; // ID do tamanho
  patternId: string;
  active: boolean;
  inProduction: boolean; // Status de produção (mantido para compatibilidade)
  status: ProductStatus; // Status do produto
  isDraft?: boolean; // Indica se o produto é um rascunho
  commercialProduct?: CommercialProductSummary | null;
  createdAt: string;
  updatedAt: string;
  ncm?: string;
  cest?: string;
  cfop?: string;
  fiscalOrigin?: string;
  unitOfMeasure?: string;
  icmsCst?: string;
  icmsRate?: number;
  pisCst?: string;
  cofinsCst?: string;
  
  // Relações
  category?: Category;
  subcategory?: Subcategory;
  pattern?: Pattern;
  size?: Size; // Relação completa do tamanho
}

export interface CommercialProductSummary {
  id: string;
  erpProductId: string;
  title: string;
  slug: string;
  published: boolean;
  featured: boolean;
  categoryId?: string;
}

export type ProductImageType = 'ROUPA' | 'IA';

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  type: ProductImageType;
  position: number;
  createdAt: string;
}

// Enums de localização de estoque
export type StockLocation = 'LOJA' | 'ARMAZEM';

// Enums de status de produto
export type ProductStatus = 'PROCESSANDO' | 'ATIVO' | 'INATIVO';

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
  customerTaxId?: string;
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
  fiscalDocuments?: FiscalDocument[];
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
  name?: string; // Opcional para rascunhos
  description?: string;
  price?: number; // Opcional para rascunhos
  cost?: number;
  stock?: number; // Opcional para rascunhos
  minStock?: number; // Opcional para rascunhos
  categoryId?: string; // Opcional para rascunhos
  subcategoryId?: string; // Opcional
  patternId?: string; // Opcional para rascunhos
  sizeId?: string; // Opcional para rascunhos - ID do tamanho para buscar dados
  active?: boolean;
  imageFile?: File;
  imageFilesRoupa?: File[]; // novas imagens tipo roupa
  imageFilesIA?: File[];    // novas imagens tipo IA
  initialLocation?: 'LOJA' | 'ARMAZEM'; // Localização inicial do estoque
  saveAsDraft?: boolean; // Flag para salvar como rascunho
  ncm?: string;
  cest?: string;
  cfop?: string;
  fiscalOrigin?: string;
  unitOfMeasure?: string;
  icmsCst?: string;
  icmsRate?: number;
  pisCst?: string;
  cofinsCst?: string;
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
  leadName?: string;
  leadPhone?: string;
  customerTaxId?: string;
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

export type FiscalDocumentStatus = 'PENDING' | 'PROCESSING' | 'AUTHORIZED' | 'REJECTED' | 'DENIED' | 'CONTINGENCY' | 'CANCELLED' | 'VOIDED' | 'ERROR';

export interface FiscalDocument {
  id: string;
  saleId: string;
  model: number;
  series: number;
  number: number;
  accessKey?: string;
  status: FiscalDocumentStatus;
  statusCode?: number;
  statusMessage?: string;
  totalAmount: number;
  environment: 'HOMOLOGATION' | 'PRODUCTION';
  issuedAt: string;
  authorizedAt?: string;
  cancelledAt?: string;
  sale?: Pick<Sale, 'saleNumber' | 'leadName' | 'paymentMethod'>;
}

export interface FiscalConfig {
  id?: string;
  active: boolean;
  companyName: string;
  tradeName?: string;
  taxId: string;
  stateTaxId: string;
  taxRegime: number;
  stateCode: string;
  cityCode: string;
  cityName: string;
  street: string;
  streetNumber: string;
  district: string;
  zipCode: string;
  addressComplement?: string;
  environment: 'HOMOLOGATION' | 'PRODUCTION';
  nfeSeries: number;
  nfceSeries: number;
  nextNfeNumber: number;
  nextNfceNumber: number;
  cscId?: string;
  certificateValidUntil?: string;
  defaultNcm?: string;
  defaultCfop?: string;
  defaultIcmsCst?: string;
  defaultPisCst?: string;
  defaultCofinsCst?: string;
  hasCscToken?: boolean;
  hasCertificate?: boolean;
}
