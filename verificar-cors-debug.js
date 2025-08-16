const axios = require('axios');

const API_URL = 'https://amoras-sistema-gew1.gbl2yq.easypanel.host';
const FRONTEND_ORIGIN = 'https://amoras-sistema-gew.emebtn.easypanel.host';

async function verificarServidor() {
  console.log('🔍 Verificando status do servidor...\n');
  
  try {
    // 1. Health Check
    console.log('1️⃣ Testando Health Check...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health Check OK:', health.data);
    console.log('');
    
    // 2. Teste CORS com OPTIONS
    console.log('2️⃣ Testando requisição OPTIONS (preflight)...');
    try {
      const options = await axios.options(`${API_URL}/api/auth/login`, {
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      console.log('✅ OPTIONS OK:', options.headers);
    } catch (optionsError) {
      console.log('❌ OPTIONS Error:', optionsError.response?.status, optionsError.response?.data);
    }
    console.log('');
    
    // 3. Teste POST direto
    console.log('3️⃣ Testando POST direto...');
    try {
      const login = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@amorascapital.com',
        password: 'admin123'
      }, {
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ POST OK:', login.data.user);
    } catch (postError) {
      console.log('❌ POST Error:', postError.response?.status, postError.response?.data);
    }
    console.log('');
    
    // 4. Verificar CORS headers
    console.log('4️⃣ Verificando CORS headers...');
    try {
      const corsTest = await axios.get(`${API_URL}/health`, {
        headers: {
          'Origin': FRONTEND_ORIGIN
        }
      });
      console.log('📋 CORS Headers recebidos:');
      console.log('- Access-Control-Allow-Origin:', corsTest.headers['access-control-allow-origin']);
      console.log('- Access-Control-Allow-Methods:', corsTest.headers['access-control-allow-methods']);
      console.log('- Access-Control-Allow-Headers:', corsTest.headers['access-control-allow-headers']);
      console.log('- Access-Control-Allow-Credentials:', corsTest.headers['access-control-allow-credentials']);
    } catch (corsError) {
      console.log('❌ CORS Test Error:', corsError.message);
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

async function verificarVariaveisAmbiente() {
  console.log('\n🔧 Informações do ambiente:');
  console.log('- Frontend Origin:', FRONTEND_ORIGIN);
  console.log('- Backend URL:', API_URL);
  console.log('- Data/Hora:', new Date().toISOString());
}

async function main() {
  console.log('🚀 Iniciando verificação de CORS...\n');
  
  await verificarVariaveisAmbiente();
  await verificarServidor();
  
  console.log('\n✨ Verificação concluída!');
  console.log('\n📝 Se o erro persistir, verifique:');
  console.log('1. Se o servidor backend foi reiniciado após as mudanças');
  console.log('2. Se as variáveis de ambiente CORS_ORIGINS estão corretas');
  console.log('3. Se os logs do backend mostram as origens sendo processadas');
}

main().catch(console.error);
