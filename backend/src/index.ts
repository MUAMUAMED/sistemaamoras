import express, { Request, Response, NextFunction } from 'express';
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

// === SISTEMA DE DEBUG ULTRA-ATIVO ===
setInterval(() => {
  console.log('🔄 [BACKEND HEARTBEAT]', new Date().toISOString(), '- Sistema ativo e rodando');
}, 10000); // A cada 10 segundos

// Log inicial do sistema
console.log('🚨🚨🚨 SISTEMA DE DEBUG ULTRA-ATIVO INICIADO 🚨🚨🚨');
console.log('⏰ Timestamp inicial:', new Date().toISOString());
console.log('🔄 Este log aparecerá nos logs do EasyPanel');
console.log('🔄 Heartbeat será exibido a cada 10 segundos');
console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');


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
const STARTUP_ID = Math.random().toString(36).substring(2, 8).toUpperCase();
const BUILD_VERSION = "COMMIT_FORCE_IGNORE_CORS_ENV_VARS";

console.log('🔥🔥🔥 NOVA INICIALIZAÇÃO DETECTADA 🔥🔥🔥');
console.log('⏰ STARTUP TIMESTAMP:', startTime.toISOString());
console.log('⏰ STARTUP LOCAL:', startTime.toLocaleString('pt-BR'));
console.log('⏰ UNIX TIMESTAMP:', Date.now());
console.log(`🆔 STARTUP ID: ${STARTUP_ID}`);
console.log(`🔄 BUILD VERSION: ${BUILD_VERSION}`);
console.log('📋 ESTE LOG CONFIRMA: NOVO CÓDIGO ESTÁ RODANDO!');
console.log('📋 SE VOCÊ VÊ ESTA MENSAGEM, O DEPLOY FOI APLICADO!');
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

// === ANULAR QUALQUER CONFIGURAÇÃO CORS DE AMBIENTE ===
console.log('🚨 ANULANDO VARIÁVEIS DE AMBIENTE CORS (se existirem)');
console.log('🚨 CORS_ORIGINS antes:', process.env.CORS_ORIGINS);
console.log('🚨 CORS_ORIGIN antes:', process.env.CORS_ORIGIN);

// FORÇA a remoção de qualquer configuração CORS de ambiente
delete process.env.CORS_ORIGINS;
delete process.env.CORS_ORIGIN;

console.log('🚨 CORS_ORIGINS depois:', process.env.CORS_ORIGINS);
console.log('🚨 CORS_ORIGIN depois:', process.env.CORS_ORIGIN);
console.log('🎯 CORS: Configuração hardcoded ativada (permitir todas as origens)');
console.log('');

console.log('🔥 SISTEMA DE DEBUG ATIVADO!');
console.log('🔥 AGUARDANDO REQUISIÇÕES...');
console.log('');

const app: express.Application = express();
const PORT = process.env.PORT || 3001;


// === CORS SIMPLES E FUNCIONAL ===
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  
  // LOGS ULTRA-DETALHADOS SEMPRE
  console.log('');
  console.log('🌐🌐🌐 MIDDLEWARE CORS ATIVADO 🌐🌐🌐');
  console.log('⏰ Timestamp:', timestamp);
  console.log('🔄 Método:', req.method);
  console.log('🔄 URL:', req.url);
  console.log('🔄 Origin:', req.headers.origin || 'N/A');
  console.log('🔄 User-Agent:', req.headers['user-agent'] || 'N/A');
  console.log('🔄 Headers completos:', JSON.stringify(req.headers, null, 2));
  
  // Headers CORS básicos e funcionais
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  console.log('✅ Headers CORS definidos:');
  console.log('  - Access-Control-Allow-Origin: *');
  console.log('  - Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS');
  console.log('  - Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With,Accept,Origin');
  console.log('  - Access-Control-Allow-Credentials: true');
  
  // Se for OPTIONS, responder imediatamente
  if (req.method === 'OPTIONS') {
    console.log('🚨 OPTIONS REQUEST DETECTADO!');
    console.log('🚨 Enviando resposta 200 OK para preflight');
    console.log('🚨 Headers que serão enviados:', {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
      'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials')
    });
    res.status(200).end();
    console.log('✅ OPTIONS response enviada com sucesso!');
    console.log('🌐🌐🌐 FIM MIDDLEWARE CORS (OPTIONS) 🌐🌐🌐');
    console.log('');
    return;
  }
  
  console.log('➡️ Continuando para próximo middleware...');
  console.log('🌐🌐🌐 FIM MIDDLEWARE CORS (NORMAL) 🌐🌐🌐');
  console.log('');
  
  next();
});

// === DEBUG TODAS AS REQUISIÇÕES ===
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log('');
  console.log('📨📨📨 NOVA REQUISIÇÃO INTERCEPTADA 📨📨📨');
  console.log('⏰ Timestamp:', timestamp);
  console.log('🔄 Método:', req.method);
  console.log('🔄 URL completa:', req.originalUrl);
  console.log('🔄 Path:', req.path);
  console.log('🔄 Query:', JSON.stringify(req.query));
  console.log('🔄 Body:', JSON.stringify(req.body));
  console.log('🔄 Origin:', req.headers.origin);
  console.log('🔄 Referer:', req.headers.referer);
  console.log('🔄 X-Forwarded-For:', req.headers['x-forwarded-for']);
  console.log('🔄 Remote Address:', req.connection.remoteAddress);
  
  // Log especial para login
  if (req.originalUrl.includes('/auth/login')) {
    console.log('🔐🔐🔐 REQUISIÇÃO DE LOGIN DETECTADA! 🔐🔐🔐');
    console.log('🔐 Esta é a requisição que deve funcionar!');
  }
  
  // Override res.end para log de resposta
  const originalEnd = res.end;
  res.end = function(...args) {
    console.log('📤📤📤 RESPOSTA SENDO ENVIADA 📤📤📤');
    console.log('📤 Status:', res.statusCode);
    console.log('📤 Headers de resposta:', JSON.stringify(res.getHeaders(), null, 2));
    console.log('📤📤📤 FIM RESPOSTA 📤📤📤');
    console.log('');
    return originalEnd.apply(this, args);
  };
  
  console.log('📨📨📨 FIM INTERCEPTAÇÃO 📨📨📨');
  console.log('');
  next();
});

// === MIDDLEWARE DE DEBUG GLOBAL ===
app.use((req: Request, res: Response, next: NextFunction) => {
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


// === CORS ANTIGOS REMOVIDOS ===
// Todos os middlewares CORS complexos foram removidos
// Agora usamos apenas a configuração simples acima


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

// === Headers adicionais removidos ===
// Configurações de CORS centralizadas no middleware principal

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
      const serverReadyTime = new Date();
      console.log('');
      console.log('🚀🚀🚀 SERVIDOR TOTALMENTE INICIALIZADO 🚀🚀🚀');
      console.log(`🎯 Servidor rodando na porta ${PORT}`);
      console.log(`🕐 Server Ready Time: ${serverReadyTime.toISOString()}`);
      console.log(`🕐 Server Ready Local: ${serverReadyTime.toLocaleString('pt-BR')}`);
      console.log(`🆔 Startup ID: ${STARTUP_ID}`);
      console.log(`🔄 Build Version: ${BUILD_VERSION}`);
      console.log(`📋 PRONTO PARA RECEBER REQUISIÇÕES!`);
      console.log(`📋 Documentação da API: http://localhost:${PORT}/api-docs`);
      console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
      console.log('');
      
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