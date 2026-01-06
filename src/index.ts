import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// Configurações
import { logger } from "./config/logger";
import { prisma } from "./config/database";

// Rotas
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import leadRoutes from "./routes/lead.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import subcategoryRoutes from "./routes/subcategory.routes";
import patternRoutes from "./routes/pattern.routes";
import saleRoutes from "./routes/sale.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import webhookRoutes from "./routes/webhook.routes";

// Novas rotas ERP
import sizesRoutes from "./routes/sizes";
import systemConfigRoutes from "./routes/system-config";
import stockMovementsRoutes from "./routes/stock-movements";
import interactionsRoutes from "./routes/interactions";
import barcodeRoutes from "./routes/barcode";
import automationRoutes from "./routes/automation.routes";

// Pagamento
import paymentGatewayRoutes from "./routes/payment-gateway.service";

// Middlewares
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";

// Variáveis de ambiente
dotenv.config();

// Importar configurações validadas
import { env } from './config/env';

const app: Application = express();
const PORT = env.PORT;

// === ORIGENS PERMITIDAS ===
// Lê de variável de ambiente ou usa padrões
const allowedOrigins: string[] = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : env.NODE_ENV === 'development'
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []; // Em produção, DEVE ser configurado via CORS_ORIGINS

// === CONFIG CORS ===
// usamos Parameters<typeof cors>[0] em vez de CorsOptions
const corsOptions: Parameters<typeof cors>[0] = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// === Swagger ===
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Amoras Capital API",
      version: "1.0.0",
      description: "API do Sistema CRM e ERP da Amoras Capital",
    },
    servers: [
      {
        url: env.APP_URL,
        description: "Servidor de desenvolvimento",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const specs = swaggerJsdoc(swaggerOptions);

// === Segurança (Helmet) ===
app.use(
  helmet({
      contentSecurityPolicy:
      env.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'", "https:"],
            },
          }
        : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// === Rate Limiting ===
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: "Muitas requisições. Tente novamente em 1 minuto.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "development",
});

app.use("/api", limiter);

// === Parsers ===
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// === Estáticos ===
// Servir arquivos estáticos de uploads
// Usar path absoluto para garantir que funciona em qualquer ambiente
import path from 'path';
import fs from 'fs';

const uploadsPath = path.join(process.cwd(), 'uploads');

// Garantir que o diretório existe
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(`📁 [STATIC] Diretório de uploads criado: ${uploadsPath}`);
}

// Servir arquivos estáticos com headers CORS apropriados
app.use("/uploads", (req, res, next) => {
  // Adicionar headers CORS para imagens
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(uploadsPath, {
  // Configurações adicionais para servir arquivos
  setHeaders: (res, filePath) => {
    // Adicionar cache headers para imagens
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

console.log(`📁 [STATIC] Servindo arquivos estáticos de: ${uploadsPath}`);

// Rota de teste para verificar se os arquivos estão sendo servidos
app.get('/uploads/test', (req, res) => {
  const productsPath = path.join(uploadsPath, 'products');
  const productsFiles = fs.existsSync(productsPath) ? fs.readdirSync(productsPath).slice(0, 20) : [];
  
  res.json({
    uploadsPath,
    exists: fs.existsSync(uploadsPath),
    files: fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath).slice(0, 10) : [],
    productsPath,
    productsExists: fs.existsSync(productsPath),
    productsFiles,
    productsFilesCount: productsFiles.length
  });
});

// === Swagger ===
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// === Healthcheck ===
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "amoras-capital-api",
    version: process.env.npm_package_version || "1.0.0",
    environment: env.NODE_ENV,
  });
});

// === Rotas API ===
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/patterns", patternRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/webhooks", webhookRoutes);

// Novas rotas ERP
app.use("/api/sizes", sizesRoutes);
app.use("/api/system-config", systemConfigRoutes);
app.use("/api/stock-movements", stockMovementsRoutes);
app.use("/api/interactions", interactionsRoutes);
app.use("/api/barcode", barcodeRoutes);
app.use("/api/automation", automationRoutes);

// Pagamento
app.use("/api/payment-gateway", paymentGatewayRoutes);

// === Middlewares de erro ===
app.use(notFoundHandler);
app.use(errorHandler);

// === Inicialização ===
async function startServer() {
  try {
    await prisma.$connect();
    logger.info("Conexão com banco de dados estabelecida");

    logger.info("🤖 Automações programadas inicializadas");

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(
        `📚 Documentação disponível em ${env.APP_URL}/api-docs`
      );
      logger.info(
        `🏥 Health check disponível em ${env.APP_URL}/health`
      );
    });
  } catch (error) {
    logger.error("Erro ao inicializar servidor:", error);
    process.exit(1);
  }
}

// === Shutdown gracioso ===
process.on("SIGTERM", async () => {
  logger.info("Recebido SIGTERM, encerrando servidor...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Recebido SIGINT, encerrando servidor...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
