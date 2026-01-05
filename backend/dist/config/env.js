"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
function validateEnv() {
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
    ];
    const missingVars = [];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    if (missingVars.length > 0) {
        throw new Error(`Variáveis de ambiente obrigatórias não definidas: ${missingVars.join(', ')}`);
    }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET deve ter no mínimo 32 caracteres para segurança');
    }
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
        throw new Error('DATABASE_URL deve começar com postgresql://');
    }
}
if (process.env.NODE_ENV === 'production') {
    validateEnv();
}
exports.env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    APP_URL: process.env.APP_URL || (process.env.NODE_ENV === 'production'
        ? ''
        : `http://localhost:${process.env.PORT || '3001'}`),
    DATABASE_URL: process.env.DATABASE_URL || '',
    JWT_SECRET: process.env.JWT_SECRET || 'development_secret_change_in_production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    CORS_ORIGINS: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    CHATWOOT_URL: process.env.CHATWOOT_URL || '',
    CHATWOOT_TOKEN: process.env.CHATWOOT_TOKEN || '',
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',
    MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
    MP_PUBLIC_KEY: process.env.MP_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || '',
    COMPANY_NAME: process.env.COMPANY_NAME || 'Amoras Capital',
    SALE_NUMBER_PREFIX: process.env.SALE_NUMBER_PREFIX || 'AC',
};
//# sourceMappingURL=env.js.map