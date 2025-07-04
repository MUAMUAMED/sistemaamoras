import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
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

// Carregar variáveis de ambiente
dotenv.config();

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
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Muitas requisições. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Documentação da API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
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