const fs = require('fs');

console.log('🔧 CRIANDO SISTEMA DE DEBUG ULTRA-DETALHADO...');

// === BACKEND DEBUG ===
console.log('📂 Modificando backend/src/index.ts...');

const backendFile = './backend/src/index.ts';
let backendContent = fs.readFileSync(backendFile, 'utf8');

// Adicionar logs constantes no início
const debugHeader = `
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
`;

// Inserir após as importações
backendContent = backendContent.replace(
  'import dotenv from \'dotenv\';',
  `import dotenv from 'dotenv';\n${debugHeader}`
);

// Modificar o middleware CORS para logs constantes
const corsMiddleware = `
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
});`;

// Substituir o middleware CORS existente
backendContent = backendContent.replace(
  /\/\/ === CORS SIMPLES E FUNCIONAL ===[\s\S]*?next\(\);\s*\}\);/,
  corsMiddleware
);

// Adicionar middleware de debug para TODAS as requisições
const allRequestsDebug = `
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
});`;

// Inserir após o middleware CORS
backendContent = backendContent.replace(
  corsMiddleware,
  corsMiddleware + '\n' + allRequestsDebug
);

// Salvar arquivo backend
fs.writeFileSync(backendFile, backendContent, 'utf8');
console.log('✅ Backend debug configurado!');

// === FRONTEND DEBUG ===
console.log('📂 Modificando frontend/src/services/api.ts...');

const frontendApiFile = './frontend/src/services/api.ts';
let frontendContent = fs.readFileSync(frontendApiFile, 'utf8');

// Adicionar logs constantes no frontend
const frontendDebugHeader = `
// === SISTEMA DE DEBUG ULTRA-ATIVO NO FRONTEND ===
let requestCounter = 0;

// Heartbeat do frontend
setInterval(() => {
  console.log('💓 [FRONTEND HEARTBEAT]', new Date().toISOString(), '- Sistema ativo, aguardando requisições');
}, 15000); // A cada 15 segundos

console.log('🚨🚨🚨 FRONTEND DEBUG SYSTEM ATIVO 🚨🚨🚨');
console.log('⏰ Frontend carregado em:', new Date().toISOString());
console.log('🔄 Sistema de debug ativo - logs aparecerão constantemente');
console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
`;

// Inserir no início do arquivo
frontendContent = frontendDebugHeader + '\n' + frontendContent;

// Modificar o interceptor de request para logs ultra-detalhados
const newRequestInterceptor = `
// Request interceptor with ultra debug
api.interceptors.request.use(
  (config) => {
    requestCounter++;
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('🚀🚀🚀 INTERCEPTOR REQUEST ATIVADO 🚀🚀🚀');
    console.log('🔢 Request #:', requestCounter);
    console.log('⏰ Timestamp:', timestamp);
    console.log('🔄 Método:', config.method?.toUpperCase());
    console.log('🔄 URL:', config.url);
    console.log('🔄 Base URL:', config.baseURL);
    console.log('🔄 Full URL:', \`\${config.baseURL}\${config.url}\`);
    console.log('🔄 Headers enviados:', JSON.stringify(config.headers, null, 2));
    console.log('🔄 Data/Body:', config.data);
    console.log('🔄 Params:', config.params);
    console.log('🔄 Timeout:', config.timeout);
    console.log('🔄 WithCredentials:', config.withCredentials);
    
    // Log especial para login
    if (config.url?.includes('/auth/login')) {
      console.log('🔐🔐🔐 REQUISIÇÃO DE LOGIN SENDO ENVIADA! 🔐🔐🔐');
      console.log('🔐 Esta requisição DEVE chegar no backend!');
      console.log('🔐 Se não aparecer logs no backend, o problema é de rede/proxy');
    }
    
    console.log('🚀🚀🚀 FIM INTERCEPTOR REQUEST 🚀🚀🚀');
    console.log('');
    
    return config;
  },
  (error) => {
    console.log('');
    console.log('❌❌❌ ERRO NO REQUEST INTERCEPTOR ❌❌❌');
    console.log('❌ Erro:', error);
    console.log('❌ Message:', error.message);
    console.log('❌ Stack:', error.stack);
    console.log('❌❌❌ FIM ERRO REQUEST ❌❌❌');
    console.log('');
    return Promise.reject(error);
  }
);`;

// Substituir o interceptor existente
frontendContent = frontendContent.replace(
  /api\.interceptors\.request\.use\([\s\S]*?\}\);/,
  newRequestInterceptor
);

// Modificar o interceptor de response
const newResponseInterceptor = `
// Response interceptor with ultra debug
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('📥📥📥 INTERCEPTOR RESPONSE SUCCESS 📥📥📥');
    console.log('⏰ Timestamp:', timestamp);
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    console.log('🔄 URL:', response.config?.url);
    console.log('🔄 Método:', response.config?.method?.toUpperCase());
    console.log('📋 Headers de resposta:', JSON.stringify(response.headers, null, 2));
    console.log('💾 Data recebida:', response.data);
    
    // Verificar CORS headers especificamente
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials']
    };
    
    console.log('🌐 CORS Headers recebidos:', corsHeaders);
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log('✅ CORS OK: Access-Control-Allow-Origin presente!');
    } else {
      console.log('❌ CORS PROBLEMA: Access-Control-Allow-Origin ausente!');
    }
    
    console.log('📥📥📥 FIM RESPONSE SUCCESS 📥📥📥');
    console.log('');
    
    return response;
  },
  (error) => {
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('❌❌❌ INTERCEPTOR RESPONSE ERROR ❌❌❌');
    console.log('⏰ Timestamp:', timestamp);
    console.log('❌ Error completo:', error);
    console.log('❌ Error name:', error?.name);
    console.log('❌ Error message:', error?.message);
    console.log('❌ Error code:', error?.code);
    console.log('❌ Error status:', error?.response?.status);
    console.log('❌ Error statusText:', error?.response?.statusText);
    console.log('❌ Error data:', error?.response?.data);
    console.log('❌ Error headers:', error?.response?.headers);
    console.log('❌ Error config:', error?.config);
    console.log('❌ Request que falhou:', {
      method: error?.config?.method,
      url: error?.config?.url,
      baseURL: error?.config?.baseURL,
      fullURL: \`\${error?.config?.baseURL}\${error?.config?.url}\`
    });
    
    // Análise específica de CORS
    if (error?.message?.includes('CORS') || error?.message?.includes('Access-Control')) {
      console.log('🚨🚨🚨 ERRO DE CORS DETECTADO! 🚨🚨🚨');
      console.log('🚨 Este é um erro de CORS policy');
      console.log('🚨 O browser bloqueou a requisição');
      console.log('🚨 Verificar se backend está enviando headers corretos');
    }
    
    if (error?.code === 'ERR_NETWORK') {
      console.log('🌐🌐🌐 ERRO DE REDE DETECTADO! 🌐🌐🌐');
      console.log('🌐 Possíveis causas:');
      console.log('🌐 1. Backend não está rodando');
      console.log('🌐 2. Problema de CORS (mais provável)');
      console.log('🌐 3. Problema de rede/DNS');
      console.log('🌐 4. Firewall/proxy bloqueando');
    }
    
    console.log('❌❌❌ FIM RESPONSE ERROR ❌❌❌');
    console.log('');
    
    return Promise.reject(error);
  }
);`;

// Substituir o interceptor de response
frontendContent = frontendContent.replace(
  /api\.interceptors\.response\.use\([\s\S]*?\}\);/,
  newResponseInterceptor
);

// Salvar arquivo frontend
fs.writeFileSync(frontendApiFile, frontendContent, 'utf8');
console.log('✅ Frontend debug configurado!');

// === LOGIN DEBUG ===
console.log('📂 Modificando frontend/src/pages/Login.tsx...');

const loginFile = './frontend/src/pages/Login.tsx';
let loginContent = fs.readFileSync(loginFile, 'utf8');

// Adicionar logs ultra-detalhados no login
const loginDebugHeader = `
// === DEBUG SYSTEM PARA LOGIN ===
let loginAttempts = 0;

// Log inicial da página de login
console.log('🔐🔐🔐 PÁGINA DE LOGIN CARREGADA 🔐🔐🔐');
console.log('⏰ Login page timestamp:', new Date().toISOString());
console.log('🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐');
`;

// Inserir no início após imports
loginContent = loginContent.replace(
  'export default function Login() {',
  loginDebugHeader + '\nexport default function Login() {'
);

// Modificar o onSubmit para logs ultra-detalhados
const newOnSubmit = `
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginAttempts++;
    
    const timestamp = new Date().toISOString();
    
    console.log('');
    console.log('🔐🔐🔐 INÍCIO TENTATIVA DE LOGIN 🔐🔐🔐');
    console.log('🔢 Tentativa #:', loginAttempts);
    console.log('⏰ Timestamp:', timestamp);
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password.length);
    console.log('🌍 Current Origin:', window.location.origin);
    console.log('🌍 Current URL:', window.location.href);
    console.log('🎯 Target API:', \`\${process.env.REACT_APP_API_URL || 'https://amoras-sistema-gew1.gbl2yq.easypanel.host/api'}/auth/login\`);
    console.log('');
    
    console.log('🚀 ENVIANDO REQUISIÇÃO DE LOGIN...');
    console.log('🚀 A partir de agora, deve aparecer logs do interceptor');
    console.log('🚀 E depois logs do backend (se chegou lá)');
    
    try {
      const response = await authService.login({ email, password });
      
      console.log('');
      console.log('✅✅✅ LOGIN BEM-SUCEDIDO! ✅✅✅');
      console.log('✅ Response:', response);
      console.log('✅ Token recebido:', response.token ? 'SIM' : 'NÃO');
      console.log('✅ User data:', response.user);
      console.log('✅✅✅ REDIRECIONANDO... ✅✅✅');
      console.log('');
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      window.location.href = '/dashboard';
      
    } catch (error: any) {
      console.log('');
      console.log('❌❌❌ ERRO NO LOGIN ❌❌❌');
      console.log('❌ Error object completo:', error);
      console.log('❌ Error name:', error?.name);
      console.log('❌ Error message:', error?.message);
      console.log('❌ Error code:', error?.code);
      console.log('❌ Error response:', error?.response);
      console.log('❌ Error config:', error?.config);
      console.log('❌ Error stack:', error?.stack);
      
      // Análise detalhada do erro
      if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        console.log('🚨🚨🚨 ERRO DE REDE/CORS DETECTADO! 🚨🚨🚨');
        console.log('🚨 Este erro geralmente indica:');
        console.log('🚨 1. CORS policy blocking (mais comum)');
        console.log('🚨 2. Backend não está rodando');
        console.log('🚨 3. URL incorreta');
        console.log('🚨 4. Problema de rede');
        console.log('');
        console.log('🔍 VERIFICAÇÕES:');
        console.log('🔍 1. Apareceram logs do interceptor? (deve aparecer acima)');
        console.log('🔍 2. Apareceram logs do backend? (verificar EasyPanel)');
        console.log('🔍 3. Se só interceptor: problema de CORS/rede');
        console.log('🔍 4. Se nem interceptor: problema no frontend');
        
        toast.error('Erro de conectividade. Verificar logs do console e EasyPanel.');
      } else {
        console.log('🔍 Erro diferente de CORS - verificar detalhes acima');
        toast.error(\`Erro no login: \${error?.message || 'Erro desconhecido'}\`);
      }
      
      console.log('❌❌❌ FIM ERRO LOGIN ❌❌❌');
      console.log('');
    }
    
    console.log('🔐🔐🔐 FIM TENTATIVA DE LOGIN 🔐🔐🔐');
    console.log('');
  };`;

// Substituir a função onSubmit existente
loginContent = loginContent.replace(
  /const onSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?\};/,
  newOnSubmit
);

// Salvar arquivo login
fs.writeFileSync(loginFile, loginContent, 'utf8');
console.log('✅ Login debug configurado!');

console.log('');
console.log('🎉🎉🎉 SISTEMA DE DEBUG ULTRA-DETALHADO CRIADO! 🎉🎉🎉');
console.log('');
console.log('📋 O QUE FOI CONFIGURADO:');
console.log('✅ Backend: Logs a cada 10s + debug de todas as requisições');
console.log('✅ Frontend: Logs a cada 15s + debug de todas as requisições/responses');
console.log('✅ Login: Debug ultra-detalhado do processo de login');
console.log('✅ CORS: Logs específicos de headers CORS');
console.log('✅ Interceptors: Debug completo de requests/responses');
console.log('');
console.log('📋 COMO USAR:');
console.log('1. Commit e push as mudanças');
console.log('2. Aguardar deploy no EasyPanel');
console.log('3. Abrir console do browser (F12)');
console.log('4. Tentar fazer login');
console.log('5. Verificar logs do EasyPanel');
console.log('6. Comparar logs frontend vs backend');
console.log('');
console.log('🔍 LOGS A PROCURAR:');
console.log('- Frontend: "💓 FRONTEND HEARTBEAT" (a cada 15s)');
console.log('- Backend: "🔄 BACKEND HEARTBEAT" (a cada 10s)');
console.log('- Requisição: "🚀🚀🚀 INTERCEPTOR REQUEST" no frontend');
console.log('- Backend: "🌐🌐🌐 MIDDLEWARE CORS ATIVADO" no EasyPanel');
console.log('- Se só frontend logs: problema CORS/rede');
console.log('- Se ambos: problema na lógica CORS');
console.log('');
console.log('🚀 Sistema pronto! Execute git add, commit e push!');
