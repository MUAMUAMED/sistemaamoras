// ====================================================
// 🚨 PATCH PARA ADICIONAR DEBUG ULTRA COMPLETO
// ====================================================
// Adicione este código APÓS a linha 43 (dotenv.config) e ANTES da linha 47 (const app)

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

// === LOGS DE COMMIT/DEPLOY ===
console.log('🚀 INFORMAÇÕES DE DEPLOY:');
console.log('- Último commit esperado: e469eed (ULTRA AGGRESSIVE FIX)');
console.log('- Branch: deploy-inicial');
console.log('- Arquivo modificado:', __filename);
console.log('- Timestamp do arquivo:', new Date(__dirname).toISOString());
console.log('');

console.log('🔥 SISTEMA DE DEBUG ATIVADO!');
console.log('🔥 AGUARDANDO REQUISIÇÕES...');
console.log('');

// ====================================================

// E DEPOIS da criação do app (após linha 47), adicione o middleware de debug:

// === MIDDLEWARE DE DEBUG GLOBAL (adicionar APÓS app = express()) ===
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
console.log('');
