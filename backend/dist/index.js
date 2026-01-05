"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const lead_routes_1 = __importDefault(require("./routes/lead.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const subcategory_routes_1 = __importDefault(require("./routes/subcategory.routes"));
const pattern_routes_1 = __importDefault(require("./routes/pattern.routes"));
const sale_routes_1 = __importDefault(require("./routes/sale.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const webhook_routes_1 = __importDefault(require("./routes/webhook.routes"));
const sizes_1 = __importDefault(require("./routes/sizes"));
const system_config_1 = __importDefault(require("./routes/system-config"));
const stock_movements_1 = __importDefault(require("./routes/stock-movements"));
const interactions_1 = __importDefault(require("./routes/interactions"));
const barcode_1 = __importDefault(require("./routes/barcode"));
const automation_routes_1 = __importDefault(require("./routes/automation.routes"));
const payment_gateway_service_1 = __importDefault(require("./routes/payment-gateway.service"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
dotenv_1.default.config();
const env_1 = require("./config/env");
const uploadDirs = [
    'uploads',
    'uploads/products',
    'uploads/avatars'
];
uploadDirs.forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        try {
            fs_1.default.mkdirSync(dir, { recursive: true });
            console.log(`✅ Diretório criado: ${dir}`);
        }
        catch (error) {
            console.error(`❌ Erro ao criar diretório ${dir}:`, error);
        }
    }
});
const app = (0, express_1.default)();
const PORT = env_1.env.PORT;
const uploadsPath = path_1.default.resolve(__dirname, '../uploads');
console.log('📂 [SERVER] Servindo uploads de:', uploadsPath);
if (fs_1.default.existsSync(uploadsPath)) {
    console.log('✅ [SERVER] Pasta uploads encontrada');
    const files = fs_1.default.readdirSync(uploadsPath);
    console.log('📂 [SERVER] Conteúdo raiz de uploads:', files);
}
else {
    console.error('❌ [SERVER] Pasta uploads NÃO encontrada em:', uploadsPath);
}
app.use('/uploads', express_1.default.static(uploadsPath));
const allowedOrigins = env_1.env.CORS_ORIGINS
    ? env_1.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
    : env_1.env.NODE_ENV === 'development'
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : [];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
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
app.use((0, cors_1.default)(corsOptions));
app.options("*", (0, cors_1.default)(corsOptions));
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
                url: env_1.env.APP_URL,
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
const specs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: env_1.env.NODE_ENV === "production"
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
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_1.env.RATE_LIMIT_MAX_REQUESTS,
    message: "Muitas requisições. Tente novamente em 1 minuto.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env_1.env.NODE_ENV === "development",
});
app.use("/api", limiter);
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express_1.default.static("uploads"));
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "amoras-capital-api",
        version: process.env.npm_package_version || "1.0.0",
        environment: env_1.env.NODE_ENV,
    });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/leads", lead_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/categories", category_routes_1.default);
app.use("/api/subcategories", subcategory_routes_1.default);
app.use("/api/patterns", pattern_routes_1.default);
app.use("/api/sales", sale_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/webhooks", webhook_routes_1.default);
app.use("/api/sizes", sizes_1.default);
app.use("/api/system-config", system_config_1.default);
app.use("/api/stock-movements", stock_movements_1.default);
app.use("/api/interactions", interactions_1.default);
app.use("/api/barcode", barcode_1.default);
app.use("/api/automation", automation_routes_1.default);
app.use("/api/payment-gateway", payment_gateway_service_1.default);
app.use(notFoundHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
async function startServer() {
    try {
        await database_1.prisma.$connect();
        logger_1.logger.info("Conexão com banco de dados estabelecida");
        logger_1.logger.info("🤖 Automações programadas inicializadas");
        app.listen(PORT, '0.0.0.0', () => {
            logger_1.logger.info(`🚀 Servidor rodando na porta ${PORT}`);
            logger_1.logger.info(`📚 Documentação disponível em ${env_1.env.APP_URL}/api-docs`);
            logger_1.logger.info(`🏥 Health check disponível em ${env_1.env.APP_URL}/health`);
        });
    }
    catch (error) {
        logger_1.logger.error("Erro ao inicializar servidor:", error);
        process.exit(1);
    }
}
process.on("SIGTERM", async () => {
    logger_1.logger.info("Recebido SIGTERM, encerrando servidor...");
    await database_1.prisma.$disconnect();
    process.exit(0);
});
process.on("SIGINT", async () => {
    logger_1.logger.info("Recebido SIGINT, encerrando servidor...");
    await database_1.prisma.$disconnect();
    process.exit(0);
});
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map