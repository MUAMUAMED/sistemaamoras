/**
 * Validação e configuração de variáveis de ambiente
 */

// Validar variáveis de ambiente obrigatórias
function validateEnv(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não definidas: ${missingVars.join(', ')}`
    );
  }

  // Validar JWT_SECRET mínimo
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET deve ter no mínimo 32 caracteres para segurança'
    );
  }

  // Validar DATABASE_URL formato
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL deve começar com postgresql://'
    );
  }
}

// Validar apenas em produção
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

// Exportar configurações com defaults seguros
export const env = {
  // Servidor
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  APP_URL: process.env.APP_URL || (
    process.env.NODE_ENV === 'production' 
      ? '' // Em produção, APP_URL DEVE ser definido
      : `http://localhost:${process.env.PORT || '3001'}` // Apenas em desenvolvimento
  ),

  // Banco de dados
  DATABASE_URL: process.env.DATABASE_URL || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'development_secret_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),

  // Logs
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB

  // Integrações opcionais
  CHATWOOT_URL: process.env.CHATWOOT_URL || '',
  CHATWOOT_TOKEN: process.env.CHATWOOT_TOKEN || '',
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  MP_PUBLIC_KEY: process.env.MP_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || '',
  YAMPI_ALIAS: process.env.YAMPI_ALIAS || '',
  YAMPI_USER_TOKEN: process.env.YAMPI_USER_TOKEN || '',
  YAMPI_USER_SECRET_KEY: process.env.YAMPI_USER_SECRET_KEY || '',
  YAMPI_WEBHOOK_SECRET: process.env.YAMPI_WEBHOOK_SECRET || '',
  YAMPI_BRAND_ID: parseInt(process.env.YAMPI_BRAND_ID || '26073154', 10),
  YAMPI_PRODUCT_WEIGHT: parseFloat(process.env.YAMPI_PRODUCT_WEIGHT || '0.4'),
  YAMPI_PRODUCT_HEIGHT: parseFloat(process.env.YAMPI_PRODUCT_HEIGHT || '12'),
  YAMPI_PRODUCT_WIDTH: parseFloat(process.env.YAMPI_PRODUCT_WIDTH || '25'),
  YAMPI_PRODUCT_LENGTH: parseFloat(process.env.YAMPI_PRODUCT_LENGTH || '30'),
  YAMPI_CHECKOUT_DOMAIN: process.env.YAMPI_CHECKOUT_DOMAIN || '',
  COMMERCIAL_SITE_URL: process.env.COMMERCIAL_SITE_URL || 'https://amorascapital.zeabur.app',

  // Sistema
  COMPANY_NAME: process.env.COMPANY_NAME || 'Amoras Capital',
  SALE_NUMBER_PREFIX: process.env.SALE_NUMBER_PREFIX || 'AC',
};

