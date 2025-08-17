const axios = require('axios');

const API_URL = 'https://amoras-sistema-gew1.gbl2yq.easypanel.host';
const FRONTEND_ORIGIN = 'https://amoras-sistema-gew.emebtn.easypanel.host';

async function testarAtualizacao() {
  console.log('🔍 Verificando se o servidor foi atualizado...\n');
  
  try {
    // 1. Health Check para verificar se está online
    console.log('1️⃣ Testando Health Check...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Servidor online:', health.data);
    console.log('');
    
    // 2. Teste específico de CORS
    console.log('2️⃣ Testando CORS Headers...');
    try {
      const corsTest = await axios.options(`${API_URL}/api/auth/login`, {
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      console.log('✅ CORS Test Response Status:', corsTest.status);
      console.log('📋 CORS Headers recebidos:');
      console.log('- Access-Control-Allow-Origin:', corsTest.headers['access-control-allow-origin']);
      console.log('- Access-Control-Allow-Methods:', corsTest.headers['access-control-allow-methods']);
      console.log('- Access-Control-Allow-Headers:', corsTest.headers['access-control-allow-headers']);
      console.log('- Access-Control-Allow-Credentials:', corsTest.headers['access-control-allow-credentials']);
      
      if (corsTest.headers['access-control-allow-origin'] === FRONTEND_ORIGIN) {
        console.log('🎉 CORS Headers corretos! Servidor atualizado!');
      } else {
        console.log('⚠️ Headers CORS ainda não estão corretos');
      }
      
    } catch (corsError) {
      console.log('❌ CORS Test Error:', corsError.response?.status, corsError.message);
      console.log('❌ Isso indica que o servidor pode não ter sido atualizado ainda');
    }
    console.log('');
    
    // 3. Teste de login direto
    console.log('3️⃣ Testando login direto...');
    try {
      const loginTest = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@amorascapital.com',
        password: 'admin123'
      }, {
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Login funcionando:', loginTest.data.user?.name);
      console.log('📋 Headers de resposta:');
      console.log('- Access-Control-Allow-Origin:', loginTest.headers['access-control-allow-origin']);
      
    } catch (loginError) {
      console.log('❌ Login Error:', loginError.response?.status, loginError.response?.data?.message);
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
    console.log('❌ Isso pode indicar que o servidor está offline ou não foi atualizado');
  }
}

async function main() {
  console.log('🚀 Verificador de Atualização do Servidor\n');
  console.log('📊 Configuração:');
  console.log('- Frontend:', FRONTEND_ORIGIN);
  console.log('- Backend:', API_URL);
  console.log('- Timestamp:', new Date().toISOString());
  console.log('');
  
  await testarAtualizacao();
  
  console.log('\n📝 Resultado:');
  console.log('Se os headers CORS estão corretos = Servidor atualizado ✅');
  console.log('Se ainda há erro de CORS = Aguardar deploy do EasyPanel ⏳');
}

main().catch(console.error);
