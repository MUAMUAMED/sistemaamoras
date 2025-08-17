import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Importar configurações
import { logger } from './config/logger';
import { prisma } from './config/database';

// Importar rotas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import leadRoutes from './routes/lead.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import subcategoryRoutes from './routes/subcategory.routes';
import patternRoutes from './routes/pattern.routes';
import saleRoutes from './routes/sale.routes';
import dashboardRoutes from './routes/dashboard.routes';
import webhookRoutes from './routes/webhook.routes';

// Importar novas rotas ERP
import sizesRoutes from './routes/sizes';
import systemConfigRoutes from './routes/system-config';
import stockMovementsRoutes from './routes/stock-movements';
import interactionsRoutes from './routes/interactions';
import barcodeRoutes from './routes/barcode';
import automationRoutes from './routes/automation.routes';

// Importar middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Importar rota de pagamento Mercado Pago
import paymentGatewayRoutes from './routes/payment-gateway.service';

import path from 'path';
import dotenv from 'dotenv';

// Carrega o .env a partir da raiz do backend, mesmo quando o CWD muda (supervisor/Docker)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// === LOGS DE INICIALIZAÇÃO ULTRA DETALHADOS ===
console.log('');
console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
console.log('🚨                                                🚨');
console.log('🚨         SISTEMA AMORAS CAPITAL                🚨');
console.log('🚨         DEBUG MODE ULTRA ATIVO                🚨');
console.log('🚨                                                🚨');
console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
console.log('');

// === TIMESTAMP DETALHADO ===
const startTime = new Date();
console.log('⏰ STARTUP TIMESTAMP:', startTime.toISOString());
console.log('⏰ STARTUP LOCAL:', startTime.toLocaleString('pt-BR'));
console.log('⏰ UNIX TIMESTAMP:', Date.now());
console.log('');

// === INFORMAÇÕES DO SISTEMA ===
console.log('💻 INFORMAÇÕES DO SISTEMA:');
console.log('- Node.js Version:', process.version);
console.log('- Platform:', process.platform);
console.log('- Architecture:', process.arch);
console.log('- Process PID:', process.pid);
console.log('- Working Directory:', process.cwd());
console.log('');

// === VARIÁVEIS DE AMBIENTE CRÍTICAS ===
console.log('🔧 VARIÁVEIS DE AMBIENTE CRÍTICAS:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('- PORT:', process.env.PORT || 'undefined');
console.log('- CORS_ORIGINS:', process.env.CORS_ORIGINS || 'undefined');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '[DEFINIDA]' : 'undefined');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '[DEFINIDA]' : 'undefined');
console.log('');

// === CONFIGURAÇÕES CORS ESPERADAS ===
const EXPECTED_FRONTEND = 'https://amoras-sistema-gew.emebtn.easypanel.host';
const EXPECTED_BACKEND = 'https://amoras-sistema-gew1.gbl2yq.easypanel.host';

console.log('🎯 CONFIGURAÇÕES CORS ESPERADAS:');
console.log('- Frontend esperado:', EXPECTED_FRONTEND);
console.log('- Backend esperado:', EXPECTED_BACKEND);
console.log('- CORS_ORIGINS configurado:', process.env.CORS_ORIGINS);

if (process.env.CORS_ORIGINS) {
  const originsArray = process.env.CORS_ORIGINS.split(',').map(s => s.trim());
  console.log('- Origins parsed:', originsArray);
  console.log('- Frontend incluído?', originsArray.includes(EXPECTED_FRONTEND) ? '✅ SIM' : '❌ NÃO');
  console.log('- Backend incluído?', originsArray.includes(EXPECTED_BACKEND) ? '✅ SIM' : '❌ NÃO');
} else {
  console.log('❌ CORS_ORIGINS não definido - usando fallback hardcoded');
}
console.log('');

console.log('🔥 SISTEMA DE DEBUG ATIVADO!');
console.log('🔥 AGUARDANDO REQUISIÇÕES...');
console.log('');

const app = express();
const PORT = process.env.PORT || 3001;

// === MIDDLEWARE DE DEBUG GLOBAL ===
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.headers.origin;
  const method = req.method;
  const url = req.url;
  
  console.log('');
  console.log('📨 === NOVA REQUISIÇÃO ===');
  console.log(`📨 ${timestamp} - ${method} ${url}`);
  console.log(`📨 Origin: ${origin || 'N/A'}`);
  console.log(`📨 User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
  
  // Log especial para requisições do frontend
  if (origin === 'https://amoras-sistema-gew.emebtn.easypanel.host') {
    console.log('🎯 *** REQUISIÇÃO DO FRONTEND DETECTADA! ***');
  }
  
  // Log especial para OPTIONS (preflight)
  if (method === 'OPTIONS') {
    console.log('✈️ *** REQUISIÇÃO PREFLIGHT (OPTIONS) DETECTADA! ***');
    console.log('✈️ Access-Control-Request-Method:', req.headers['access-control-request-method']);
    console.log('✈️ Access-Control-Request-Headers:', req.headers['access-control-request-headers']);
  }
  
  // Log especial para /auth/login
  if (url.includes('/auth/login')) {
    console.log('🔐 *** REQUISIÇÃO DE LOGIN DETECTADA! ***');
  }
  
  console.log('📨 === FIM REQUISIÇÃO ===');
  console.log('');
  
  next();
});

console.log('✅ Middleware de debug global ativado');

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Amoras Capital API',
      version: '1.0.0',
      description: 'API do Sistema CRM e ERP da Amoras Capital',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  } : false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));


// ---- CORS ULTRA AGGRESSIVE FIX ----
const FRONTEND_ORIGIN = 'https://amoras-sistema-gew.emebtn.easypanel.host';

logger.info(`🔥 ULTRA AGGRESSIVE CORS FIX ACTIVATED`);
logger.info(`🔥 Frontend Origin: ${FRONTEND_ORIGIN}`);

// MIDDLEWARE 1: Headers em TODAS as requisições (PRIMEIRA PRIORIDADE)
app.use((req, res, next) => {
  // FORÇA headers imediatamente, sem condições
  res.setHeader('Access-Control-Allow-Origin', '*'); // TEMPORÁRIO - permitir tudo
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
  
  logger.info(`🔥 ULTRA AGGRESSIVE - Headers forced for ${req.method} ${req.url} from ${req.headers.origin || 'N/A'}`);
  
  // Para OPTIONS, responder imediatamente
  if (req.method === 'OPTIONS') {
    logger.info(`🔥 ULTRA AGGRESSIVE - OPTIONS terminated for ${req.headers.origin || 'N/A'}`);
    return res.status(200).end();
  }
  
  next();
});

// MIDDLEWARE 2: Configuração CORS padrão (BACKUP)
app.use(cors({
  origin: '*', // TEMPORÁRIO - permitir todas as origens
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200,
  maxAge: 86400,
}));

// MIDDLEWARE 3: Força headers na resposta (ÚLTIMA GARANTIA)
app.use((req, res, next) => {
  // Override res.send para garantir headers
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  const forceHeaders = function() {
    this.setHeader('Access-Control-Allow-Origin', '*');
    this.setHeader('Access-Control-Allow-Credentials', 'true');
    logger.info(`🔥 ULTRA AGGRESSIVE - Final headers forced in response`);
  };
  
  res.send = function(data) {
    forceHeaders.call(this);
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    forceHeaders.call(this);
    return originalJson.call(this, data);
  };
  
  res.end = function(data) {
    forceHeaders.call(this);
    return originalEnd.call(this, data);
  };
  
  next();
});

// ---- fim CORS ----


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto em vez de 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requisições em vez de 100
  message: 'Muitas requisições. Tente novamente em 1 minuto.',
  standardHeaders: true,
  legacyHeaders: false,
  // Excluir rate limiting em desenvolvimento
  skip: (req) => process.env.NODE_ENV === 'development',
});

app.use('/api', limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar limites de cabeçalhos
app.use((req, res, next) => {
  res.setHeader('Access-Control-Max-Age', '86400');
  next();
});

// Servir arquivos estáticos (imagens)
app.use('/uploads', express.static('uploads'));

// Documentação da API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'amoras-capital-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);

// Novas rotas ERP
app.use('/api/sizes', sizesRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/stock-movements', stockMovementsRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/automation', automationRoutes);

// Rota de pagamento Mercado Pago
app.use('/api/payment-gateway', paymentGatewayRoutes);

// Middleware de tratamento de erros
app.use(notFoundHandler);
app.use(errorHandler);

// Inicializar servidor
async function startServer() {
  try {
    // Testar conexão com banco de dados
    await prisma.$connect();
    logger.info('Conexão com banco de dados estabelecida');

    // Automações desabilitadas temporariamente
    logger.info('🤖 Automações programadas inicializadas');

    app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📚 Documentação disponível em http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health check disponível em http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Recebido SIGTERM, encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Recebido SIGINT, encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app; 