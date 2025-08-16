const axios = require('axios');

const API_URL = 'https://amoras-sistema-gew1.gbl2yq.easypanel.host';
const FRONTEND_ORIGIN = 'https://amoras-sistema-gew.emebtn.easypanel.host';

async function testarCORSCompleto() {
  console.log('🧪 Teste completo de CORS...\n');
  
  try {
    // 1. Health Check sem CORS
    console.log('1️⃣ Testando Health Check (sem CORS)...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health Check OK:', health.status);
    console.log('');
    
    // 2. Health Check com Origin
    console.log('2️⃣ Testando Health Check (com Origin)...');
    try {
      const healthWithOrigin = await axios.get(`${API_URL}/health`, {
        headers: {
          'Origin': FRONTEND_ORIGIN
        }
      });
      console.log('✅ Health Check com Origin OK:', healthWithOrigin.status);
      console.log('📋 CORS Headers recebidos:');
      console.log('- Access-Control-Allow-Origin:', healthWithOrigin.headers['access-control-allow-origin']);
      console.log('- Access-Control-Allow-Credentials:', healthWithOrigin.headers['access-control-allow-credentials']);
    } catch (healthError) {
      console.log('❌ Health Check com Origin Error:', healthError.response?.status, healthError.message);
    }
    console.log('');
    
    // 3. Teste OPTIONS (preflight)
    console.log('3️⃣ Testando requisição OPTIONS (preflight)...');
    try {
      const optionsResponse = await axios.options(`${API_URL}/api/auth/login`, {
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      console.log('✅ OPTIONS OK:', optionsResponse.status);
      console.log('📋 Headers OPTIONS:');
      console.log('- Access-Control-Allow-Origin:', optionsResponse.headers['access-control-allow-origin']);
      console.log('- Access-Control-Allow-Methods:', optionsResponse.headers['access-control-allow-methods']);
      console.log('- Access-Control-Allow-Headers:', optionsResponse.headers['access-control-allow-headers']);
    } catch (optionsError) {
      console.log('❌ OPTIONS Error:', optionsError.response?.status, optionsError.message);
      console.log('❌ Response Headers:', optionsError.response?.headers);
    }
    console.log('');
    
    // 4. Teste POST direto (simulando browser)
    console.log('4️⃣ Testando POST direto (simulando browser)...');
    try {
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@amorascapital.com',
        password: 'admin123'
      }, {
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ POST Login OK:', loginResponse.status);
      console.log('👤 Usuário:', loginResponse.data.user?.name);
    } catch (postError) {
      console.log('❌ POST Error:', postError.response?.status, postError.response?.data);
      console.log('❌ Headers recebidos:', postError.response?.headers);
    }
    console.log('');
    
    // 5. Teste de conectividade básica
    console.log('5️⃣ Testando conectividade básica...');
    try {
      const { exec } = require('child_process');
      exec(`curl -I ${API_URL}/health`, (error, stdout, stderr) => {
        if (error) {
          console.log('❌ Curl Error:', error.message);
        } else {
          console.log('✅ Curl Headers:');
          console.log(stdout);
        }
      });
    } catch (curlError) {
      console.log('❌ Curl não disponível');
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

async function main() {
  console.log('🚀 Teste de CORS - Sistema Amoras\n');
  console.log('📊 Configuração:');
  console.log('- Frontend:', FRONTEND_ORIGIN);
  console.log('- Backend:', API_URL);
  console.log('- Data/Hora:', new Date().toISOString());
  console.log('');
  
  await testarCORSCompleto();
  
  console.log('\n✨ Teste concluído!');
  console.log('\n📝 Se ainda houver problemas:');
  console.log('1. Verificar se o servidor backend foi reiniciado');
  console.log('2. Verificar logs do backend no EasyPanel');
  console.log('3. Verificar se as variáveis CORS_ORIGINS estão corretas');
}

main().catch(console.error);
