// ====================================================
// 🚨 SISTEMA DE DEBUG ULTRA COMPLETO - AMORAS CAPITAL
// ====================================================
// Este código deve ser adicionado NO INÍCIO do backend/src/index.ts
// APÓS as importações e ANTES de qualquer configuração

// === LOGS DE INICIALIZAÇÃO ===
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
console.log('- Executable Path:', process.execPath);
console.log('');

// === VARIÁVEIS DE AMBIENTE CRÍTICAS ===
console.log('🔧 VARIÁVEIS DE AMBIENTE CRÍTICAS:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('- PORT:', process.env.PORT || 'undefined');
console.log('- CORS_ORIGINS:', process.env.CORS_ORIGINS || 'undefined');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '[DEFINIDA]' : 'undefined');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '[DEFINIDA]' : 'undefined');
console.log('');

// === INFORMAÇÕES DE DEPLOYMENT ===
console.log('🚀 INFORMAÇÕES DE DEPLOYMENT:');
console.log('- Git Commit Hash:', process.env.GIT_COMMIT || 'undefined');
console.log('- Build Timestamp:', process.env.BUILD_TIME || 'undefined');
console.log('- Container ID:', process.env.HOSTNAME || 'undefined');
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

// === MIDDLEWARE DE DEBUG GLOBAL ===
console.log('🔍 ATIVANDO MIDDLEWARE DE DEBUG GLOBAL...');

// Este middleware deve ser adicionado ANTES de qualquer outro middleware
const debugMiddleware = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'];
  const method = req.method;
  const url = req.url;
  
  console.log('');
  console.log('📨 === NOVA REQUISIÇÃO ===');
  console.log(`📨 Timestamp: ${timestamp}`);
  console.log(`📨 Method: ${method}`);
  console.log(`📨 URL: ${url}`);
  console.log(`📨 Origin: ${origin || 'N/A'}`);
  console.log(`📨 User-Agent: ${userAgent || 'N/A'}`);
  console.log(`📨 Headers completos:`, JSON.stringify(req.headers, null, 2));
  
  // Log especial para requisições do frontend
  if (origin === EXPECTED_FRONTEND) {
    console.log('🎯 REQUISIÇÃO DO FRONTEND DETECTADA!');
  }
  
  // Log especial para OPTIONS (preflight)
  if (method === 'OPTIONS') {
    console.log('✈️ REQUISIÇÃO PREFLIGHT (OPTIONS) DETECTADA!');
    console.log('✈️ Access-Control-Request-Method:', req.headers['access-control-request-method']);
    console.log('✈️ Access-Control-Request-Headers:', req.headers['access-control-request-headers']);
  }
  
  // Log especial para /auth/login
  if (url.includes('/auth/login')) {
    console.log('🔐 REQUISIÇÃO DE LOGIN DETECTADA!');
  }
  
  console.log('📨 === FIM NOVA REQUISIÇÃO ===');
  console.log('');
  
  next();
};

console.log('✅ Debug middleware criado');
console.log('');

// === FINALIZAÇÃO DO STARTUP ===
console.log('🔥 SISTEMA DE DEBUG ATIVADO COM SUCESSO!');
console.log('🔥 AGUARDANDO REQUISIÇÕES...');
console.log('');
console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
console.log('');

// EXPORTAR O MIDDLEWARE PARA SER USADO
module.exports = { debugMiddleware };
