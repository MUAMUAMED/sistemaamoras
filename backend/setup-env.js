const fs = require('fs');
const path = require('path');

// Configuração do .env para o PostgreSQL no EasyPanel
const envContent = `# Database - PostgreSQL no EasyPanel
DATABASE_URL="postgresql://amoras_user:Amoras2024%21%40%23%40@amoras-sistema_amoras-postgres:5432/amoras_capital?sslmode=disable"

# JWT
JWT_SECRET="amoras_jwt_secret_2024_super_segura_chave_unica"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"

# CORS
CORS_ORIGIN="*"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH="uploads"

# Payment Gateway (Mercado Pago)
MERCADO_PAGO_ACCESS_TOKEN="seu_token_aqui"
MERCADO_PAGO_PUBLIC_KEY="sua_chave_publica_aqui"

# Webhooks
WEBHOOK_SECRET="amoras_webhook_secret_2024"

# Email (opcional)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="seu_email@gmail.com"
EMAIL_PASSWORD="sua_senha_de_app"

# WhatsApp API (opcional)
WHATSAPP_API_TOKEN="seu_token_whatsapp"
WHATSAPP_API_URL="https://api.whatsapp.com"

# Logs
LOG_LEVEL="info"
LOG_FILE="logs/app.log"
`;

// Caminho do arquivo .env
const envPath = path.join(__dirname, '.env');

// Escrever o arquivo .env
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Arquivo .env criado com sucesso!');
console.log('📁 Localização:', envPath);
console.log('🔗 DATABASE_URL configurada para PostgreSQL no EasyPanel');
console.log('🔐 Senha URL-encoded: Amoras2024%21%40%23%40');
console.log('');
console.log('Próximos passos:');
console.log('1. npx prisma db push');
console.log('2. npm run dev'); 