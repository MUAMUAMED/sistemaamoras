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



const app = express();
const PORT = process.env.PORT || 3001;

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


// ---- CORS EMERGENCY FIX ----
const FRONTEND_ORIGIN = 'https://amoras-sistema-gew.emebtn.easypanel.host';
const BACKEND_ORIGIN = 'https://amoras-sistema-gew1.gbl2yq.easypanel.host';

const ALLOWLIST = [
  FRONTEND_ORIGIN,
  BACKEND_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

logger.info(`🚨 EMERGENCY CORS - ALLOWLIST: ${JSON.stringify(ALLOWLIST)}`);

// Middleware CORS de emergência - força headers para TODAS as requisições
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  logger.info(`🚨 EMERGENCY CORS - ${req.method} ${req.url}`);
  logger.info(`🚨 Origin: ${origin || 'N/A'}`);
  
  // FORÇA headers CORS para frontend conhecido
  if (origin === FRONTEND_ORIGIN || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || FRONTEND_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
    
    logger.info(`🚨 EMERGENCY CORS headers FORCED for: ${origin || 'N/A'}`);
  }
  
  // Tratamento especial para OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    logger.info(`🚨 EMERGENCY OPTIONS detected from: ${origin}`);
    
    // FORÇA headers para qualquer OPTIONS do frontend
    if (origin === FRONTEND_ORIGIN || !origin) {
      res.setHeader('Access-Control-Allow-Origin', origin || FRONTEND_ORIGIN);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers');
      res.setHeader('Access-Control-Max-Age', '86400');
      
      logger.info(`🚨 EMERGENCY OPTIONS approved - headers set`);
      return res.status(200).end();
    }
  }
  
  next();
});

// Configuração CORS padrão mais permissiva
const corsOpts: cors.CorsOptions = {
  origin: ALLOWLIST,
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
};

app.use(cors(corsOpts));

// Middleware adicional para garantir headers em TODAS as respostas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Força headers na resposta final
  const originalSend = res.send;
  res.send = function(data) {
    if (origin === FRONTEND_ORIGIN || !origin) {
      this.setHeader('Access-Control-Allow-Origin', origin || FRONTEND_ORIGIN);
      this.setHeader('Access-Control-Allow-Credentials', 'true');
      logger.info(`🔄 Final headers forced on response for: ${origin || 'N/A'}`);
    }
    return originalSend.call(this, data);
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