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
  canonicalPatternId?: string | null;
  canonicalPattern?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products?: number;
    mergedPatterns?: number;
  };
}

export interface SampleProductItem {
  id: string;
  name: string;
  barcode?: string | null;
  imageUrl: string;
}

export interface PatternClusterItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  productsCount: number;
  sampleImages: string[];
  sampleProducts?: SampleProductItem[];
}

export interface PatternCluster {
  id: string;
  title: string;
  primaryReason: string;
  averageSimilarity: number;
  suggestedPrincipalId: string;
  patterns: PatternClusterItem[];
}

export interface SimilarPatternItem {
  id: string;
  name: string;
  code: string;
  similarity: number;
  sampleImageUrl?: string;
  isVectorMatch: boolean;
}

export interface SimilarPatternsResponse {
  product: {
    id: string;
    name: string;
    barcode: string | null;
    imageUrl: string;
    pattern: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
  similarPatterns: SimilarPatternItem[];
}

export interface ReassignProductPayload {
  productId: string;
  targetPatternId?: string;
  newPattern?: {
    name: string;
    code?: string;
  };
}

export interface ReassignProductResponse {
  success: boolean;
  message: string;
  data: {
    product: Product;
    oldBarcode?: string | null;
    oldPattern?: Pattern | null;
    targetPattern: Pattern;
  };
}

export interface PatternRedirect {
  id: string;
  sourcePatternId: string;
  sourcePatternCode: string;
  sourcePatternName: string;
  targetPatternId: string;
  targetPatternCode: string;
  targetPatternName: string;
  createdAt: string;
  sourcePattern?: { id: string; name: string; code: string; active: boolean };
  targetPattern?: { id: string; name: string; code: string; active: boolean };
}

export interface MergePatternsPayload {
  principalPatternId: string;
  mergedPatternIds: string[];
}

export interface MergePatternsResponse {
  success: boolean;
  message: string;
  result: {
    principalPattern: Pattern;
    secondaryPatternsCount: number;
    productsUpdatedCount: number;
    redirectedCodes: Array<{
      fromCode: string;
      fromName: string;
      toCode: string;
      toName: string;
    }>;
  };
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
  ncm?: string;
  cfop?: string;
  imageUrl?: string;
  images?: ProductImage[]; // Galeria de imagens
  categoryId: string;
  subcategoryId?: string; // Opcional
  sizeId: string; // ID do tamanho
  patternId: string;
  active: boolean;
  inProduction: boolean; // Status de produção (mantido para compatibilidade)
  status: ProductStatus; // Status do produto
  commercialProduct?: CommercialProductSummary | null;
  createdAt: string;
  updatedAt: string;
  
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
  imageFilesRoupa?: File[]; // novas imagens tipo roupa
  imageFilesIA?: File[];    // novas imagens tipo IA
  initialLocation?: 'LOJA' | 'ARMAZEM'; // Localização inicial do estoque
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
  isDraft?: boolean;
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

export interface FiscalDanfe {
  id: string;
  model: number;
  series: number;
  number: number;
  accessKey: string;
  protocolNumber?: string;
  status: FiscalDocumentStatus;
  environment: 'HOMOLOGATION' | 'PRODUCTION';
  operationNature: string;
  issuedAt: string;
  authorizedAt?: string;
  recipientName?: string;
  recipientTaxId?: string;
  totalAmount: number;
  qrCodeUrl?: string;
  consultationUrl?: string;
  issuer: {
    companyName: string;
    tradeName?: string;
    taxId: string;
    stateTaxId: string;
    stateCode: string;
    cityName: string;
    street: string;
    streetNumber: string;
    district: string;
    zipCode: string;
    addressComplement?: string;
  };
  sale: {
    saleNumber: string;
    leadName?: string;
    customerTaxId?: string;
    paymentMethod: string;
    subtotal: number;
    discount: number;
    total: number;
  };
  items: Array<{
    id: string;
    itemNumber: number;
    productCode: string;
    description: string;
    ncm: string;
    cfop: string;
    unitOfMeasure: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
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

// Relatório de Vendas
export interface SalesReportSummary {
  totalRevenue: number;
  totalSales: number;
  totalItemsSold: number;
  averageTicket: number;
  totalDiscount: number;
}

export interface PatternSalesRankingItem {
  id: string;
  name: string;
  code: string;
  totalQuantity: number;
  totalRevenue: number;
  sampleImage?: string | null;
  percentageOfTotal: number;
}

export interface CategorySalesRankingItem {
  id: string;
  name: string;
  code: string;
  totalQuantity: number;
  totalRevenue: number;
  percentageOfTotal: number;
}

export interface SubcategorySalesRankingItem {
  id: string;
  name: string;
  code: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  percentageOfTotal: number;
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  totalRevenue: number;
  percentage: number;
}

export interface DailySalesTimelinePoint {
  date: string;
  formattedDate: string;
  totalRevenue: number;
  salesCount: number;
  itemsCount: number;
}

export interface TopProductSalesItem {
  id: string;
  name: string;
  categoryName?: string;
  patternName?: string;
  sizeName?: string;
  totalQuantity: number;
  totalRevenue: number;
  imageUrl?: string | null;
}

export interface SalesReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: SalesReportSummary;
  patternsRanking: PatternSalesRankingItem[];
  categoriesRanking: CategorySalesRankingItem[];
  subcategoriesRanking: SubcategorySalesRankingItem[];
  paymentMethods: PaymentMethodStats[];
  timeline: DailySalesTimelinePoint[];
  topProducts: TopProductSalesItem[];
}
