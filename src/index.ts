import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import sharp from "sharp";

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
import commercialRoutes from "./routes/commercial.routes";
import yampiRoutes from "./routes/yampi.routes";
import fiscalRoutes from "./routes/fiscal.routes";

// Novas rotas ERP
import sizesRoutes from "./routes/sizes";
import systemConfigRoutes from "./routes/system-config";
import stockMovementsRoutes from "./routes/stock-movements";
import interactionsRoutes from "./routes/interactions";
import barcodeRoutes from "./routes/barcode";
import automationRoutes from "./routes/automation.routes";
import productionRoutes from "./routes/production.routes";

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

// Zeabur terminates HTTPS and forwards the original client IP through one proxy.
app.set("trust proxy", 1);

// === ORIGENS PERMITIDAS ===
// Lê de variável de ambiente ou usa padrões
const allowedOrigins: string[] = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : env.NODE_ENV === 'development'
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []; // Em produção, DEVE ser configurado via CORS_ORIGINS

if (env.NODE_ENV === 'production' && !env.CORS_ORIGINS) {
  allowedOrigins.push(
    "https://amorascapital.zeabur.app",
    "https://amorasbackend.zeabur.app",
  );
}

// === CONFIG CORS ===
// usamos Parameters<typeof cors>[0] em vez de CorsOptions
const corsOptions: Parameters<typeof cors>[0] = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ): void => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const error = new Error("Not allowed by CORS") as Error & { statusCode?: number };
      error.statusCode = 403;
      callback(error);
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
app.use(express.json({
  limit: "10mb",
  verify: (req: any, _res, buffer) => {
    req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// === Estáticos ===
// Servir arquivos estáticos de uploads
// Usar path absoluto para garantir que funciona em qualquer ambiente
import path from 'path';
import fs from 'fs';

// Usar caminho consistente - no Docker WORKDIR é /src
// Mas também suportar variável de ambiente para customização
const baseDir = process.env.UPLOADS_BASE_DIR || process.cwd();
const uploadsPath = path.join(baseDir, 'uploads');
const uploadCandidatePaths = Array.from(new Set([
  uploadsPath,
  process.env.UPLOAD_DIR,
  path.join(process.cwd(), 'uploads'),
  path.join(path.dirname(process.cwd()), 'uploads'),
  '/src/uploads',
  '/app/uploads',
  '/data/uploads',
  '/mnt/data/uploads',
  '/var/lib/data/uploads',
].filter(Boolean) as string[]));

const findUploadedProductFile = (filename: string) => {
  for (const candidateUploadsPath of uploadCandidatePaths) {
    const candidateFilePath = path.join(candidateUploadsPath, 'products', filename);
    if (fs.existsSync(candidateFilePath)) {
      return {
        filePath: candidateFilePath,
        uploadsPath: candidateUploadsPath,
      };
    }
  }

  return null;
};

const findUploadedProductImageInDatabase = async (filename: string) => {
  const urlSuffix = `/uploads/products/${filename}`;

  try {
    const productImage = await (prisma as any).productImage.findFirst({
      where: {
        OR: [
          { filename },
          { url: urlSuffix },
          { url: { endsWith: urlSuffix } },
        ],
        data: { not: null },
      },
      select: {
        data: true,
        mimeType: true,
        size: true,
      },
    });

    if (productImage?.data) {
      return productImage;
    }
  } catch (error: any) {
    console.warn('[IMAGE CHECK] ProductImage database lookup skipped:', error.message);
  }

  try {
    const commercialImage = await (prisma as any).commercialProductImage.findFirst({
      where: {
        OR: [
          { filename },
          { url: urlSuffix },
          { url: { endsWith: urlSuffix } },
        ],
        data: { not: null },
      },
      select: {
        data: true,
        mimeType: true,
        size: true,
      },
    });

    if (commercialImage?.data) {
      return commercialImage;
    }
  } catch (error: any) {
    console.warn('[IMAGE CHECK] CommercialProductImage database lookup skipped:', error.message);
  }

  return null;
};

console.log('📁 [STATIC] Configuração de uploads:', {
  baseDir,
  uploadsPath,
  cwd: process.cwd(),
  UPLOADS_BASE_DIR: process.env.UPLOADS_BASE_DIR
});

// Garantir que o diretório existe
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log(`📁 [STATIC] Diretório de uploads criado: ${uploadsPath}`);
}

// Servir arquivos estáticos com headers CORS apropriados
app.use("/uploads", (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Adicionar headers CORS para imagens
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(uploadsPath, {
  // Configurações adicionais para servir arquivos
  setHeaders: (res: express.Response, filePath: string) => {
    // Adicionar cache headers para imagens
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
      // Os uploads recebem nomes únicos. Uma nova foto gera uma nova URL,
      // então a versão anterior pode permanecer no cache por longo prazo.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

console.log(`📁 [STATIC] Servindo arquivos estáticos de: ${uploadsPath}`);

// Rota de teste para verificar se os arquivos estão sendo servidos
app.get('/uploads/test', (req: express.Request, res: express.Response) => {
  const productsPath = path.join(uploadsPath, 'products');
  const productsFiles = fs.existsSync(productsPath) ? fs.readdirSync(productsPath).slice(0, 20) : [];
  const candidates = uploadCandidatePaths.map((candidateUploadsPath) => {
    const candidateProductsPath = path.join(candidateUploadsPath, 'products');
    const candidateProductsExists = fs.existsSync(candidateProductsPath);

    return {
      uploadsPath: candidateUploadsPath,
      exists: fs.existsSync(candidateUploadsPath),
      productsPath: candidateProductsPath,
      productsExists: candidateProductsExists,
      productsFiles: candidateProductsExists ? fs.readdirSync(candidateProductsPath).slice(0, 20) : [],
      productsFilesCount: candidateProductsExists ? fs.readdirSync(candidateProductsPath).length : 0,
    };
  });
  
  res.json({
    uploadsPath,
    exists: fs.existsSync(uploadsPath),
    files: fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath).slice(0, 10) : [],
    productsPath,
    productsExists: fs.existsSync(productsPath),
    productsFiles,
    productsFilesCount: productsFiles.length,
    candidates,
  });
});

// Rota específica para verificar se um arquivo de imagem existe
app.get('/uploads/products/:filename', async (req: express.Request, res: express.Response) => {
  const filename = req.params.filename;
  const resolvedFile = findUploadedProductFile(filename);
  const filePath = resolvedFile?.filePath || path.join(uploadsPath, 'products', filename);
  
  console.log(`🔍 [IMAGE CHECK] Verificando arquivo: ${filePath}`);
  console.log(`🔍 [IMAGE CHECK] Arquivo existe: ${fs.existsSync(filePath)}`);
  
  if (resolvedFile) {
    const stats = fs.statSync(filePath);
    console.log(`✅ [IMAGE CHECK] Arquivo encontrado: ${filename}, tamanho: ${stats.size} bytes`);
    res.sendFile(filePath);
  } else {
    const databaseImage = await findUploadedProductImageInDatabase(filename);

    if (databaseImage?.data) {
      const imageBuffer = Buffer.from(databaseImage.data);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Type', databaseImage.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', String(databaseImage.size || imageBuffer.length));
      res.send(imageBuffer);
      return;
    }

    console.error(`❌ [IMAGE CHECK] Arquivo não encontrado: ${filePath}`);
    res.status(404).json({
      error: 'Arquivo não encontrado',
      filename,
      filePath,
      uploadsPath,
      productsPath: path.join(uploadsPath, 'products'),
      exists: fs.existsSync(path.join(uploadsPath, 'products')),
      uploadCandidatePaths,
    });
  }
});

// Variantes menores para listas e PDV. A imagem original continua guardada no
// banco; esta resposta e apenas uma representacao leve que o navegador pode
// manter no cache por causa do nome unico do arquivo.
app.get('/api/images/products/:filename', async (req: express.Request, res: express.Response) => {
  try {
    const filename = req.params.filename;
    const resolvedFile = findUploadedProductFile(filename);
    let source: Buffer | null = resolvedFile ? fs.readFileSync(resolvedFile.filePath) : null;

    if (!source) {
      const databaseImage = await findUploadedProductImageInDatabase(filename);
      source = databaseImage?.data ? Buffer.from(databaseImage.data) : null;
    }

    if (!source) {
      return res.status(404).json({ error: 'Imagem nao encontrada', filename });
    }

    const thumbnail = await sharp(source, { failOn: 'none' })
      .rotate()
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.type('image/webp').send(thumbnail);
  } catch (error: any) {
    console.error('[IMAGE THUMBNAIL] Falha ao gerar miniatura:', error.message);
    return res.status(500).json({ error: 'Nao foi possivel preparar a imagem' });
  }
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
app.use("/api/commercial", commercialRoutes);
app.use("/api/yampi", yampiRoutes);
app.use("/api/fiscal", fiscalRoutes);

// Novas rotas ERP
app.use("/api/sizes", sizesRoutes);
app.use("/api/system-config", systemConfigRoutes);
app.use("/api/stock-movements", stockMovementsRoutes);
app.use("/api/interactions", interactionsRoutes);
app.use("/api/barcode", barcodeRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/production", productionRoutes);

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
