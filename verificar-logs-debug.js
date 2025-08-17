const https = require('https');

const API_HOST = 'amoras-sistema-gew1.gbl2yq.easypanel.host';
const FRONTEND_ORIGIN = 'https://amoras-sistema-gew.emebtn.easypanel.host';

function makeRequest(path, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: 443,
      path: path,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verificarSeDebugEstaAtivo() {
  console.log('🔍 VERIFICANDO SE O SISTEMA DE DEBUG ESTÁ ATIVO...\n');
  
  try {
    // 1. Health Check básico
    console.log('1️⃣ Testando Health Check...');
    const health = await makeRequest('/health');
    console.log(`✅ Status: ${health.status}`);
    
    if (health.data) {
      try {
        const healthData = JSON.parse(health.data);
        console.log(`✅ Timestamp: ${healthData.timestamp}`);
        console.log(`✅ Environment: ${healthData.environment}`);
      } catch (e) {
        console.log(`✅ Data: ${health.data.substring(0, 100)}...`);
      }
    }
    console.log('');
    
    // 2. Teste com Origin para ativar logs
    console.log('2️⃣ Fazendo requisição com Origin para ativar logs debug...');
    try {
      const originTest = await makeRequest('/health', 'GET', {
        'Origin': FRONTEND_ORIGIN,
        'User-Agent': 'Debug-Verification-Script'
      });
      console.log(`✅ Status com Origin: ${originTest.status}`);
      console.log('📋 Headers CORS recebidos:');
      Object.keys(originTest.headers).forEach(key => {
        if (key.toLowerCase().includes('access-control')) {
          console.log(`   ${key}: ${originTest.headers[key]}`);
        }
      });
    } catch (originError) {
      console.log(`❌ Erro com Origin: ${originError.message}`);
    }
    console.log('');
    
    // 3. Teste OPTIONS (preflight)
    console.log('3️⃣ Testando OPTIONS (preflight) - deve ativar logs especiais...');
    try {
      const optionsTest = await makeRequest('/api/auth/login', 'OPTIONS', {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      });
      
      console.log(`✅ OPTIONS Status: ${optionsTest.status}`);
      console.log('📋 CORS Headers no OPTIONS:');
      
      const corsHeaders = ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-credentials'];
      corsHeaders.forEach(header => {
        const value = optionsTest.headers[header];
        console.log(`   ${header}: ${value || 'undefined'}`);
      });
      
      // Verificar se tem o header correto
      const allowOrigin = optionsTest.headers['access-control-allow-origin'];
      if (allowOrigin === '*' || allowOrigin === FRONTEND_ORIGIN) {
        console.log('🎉 CORS FUNCIONANDO! O servidor foi atualizado!');
        return true;
      } else {
        console.log('❌ CORS ainda não funcionando');
      }
      
    } catch (optionsError) {
      console.log(`❌ Erro no OPTIONS: ${optionsError.message}`);
    }
    console.log('');
    
    // 4. Verificar se logs debug aparecem
    console.log('4️⃣ Status do sistema de debug:');
    
    const hasDebugLogs = (
      health.status === 200 && 
      health.data && 
      health.data.includes('amoras-capital-api')
    );
    
    if (hasDebugLogs) {
      console.log('✅ Servidor está respondendo');
      console.log('❓ Para verificar se logs debug estão ativos:');
      console.log('   1. Acesse o EasyPanel');
      console.log('   2. Vá para o serviço backend');
      console.log('   3. Abra os "Logs" do container');
      console.log('   4. Procure por mensagens com 🚨 emoji');
      console.log('   5. Se não vê 🚨, o deploy não foi feito ainda');
    } else {
      console.log('❌ Servidor pode estar offline ou com problemas');
    }
    
  } catch (error) {
    console.log(`❌ Erro geral: ${error.message}`);
  }
  
  return false;
}

async function main() {
  console.log('🚨 VERIFICADOR DE LOGS DEBUG - Sistema Amoras\n');
  console.log('📊 Informações:');
  console.log(`- Backend: https://${API_HOST}`);
  console.log(`- Frontend: ${FRONTEND_ORIGIN}`);
  console.log(`- Último commit: a5deddd (DEBUG ULTRA COMPLETO)`);
  console.log(`- Timestamp: ${new Date().toISOString()}\n`);
  
  const funcionando = await verificarSeDebugEstaAtivo();
  
  console.log('\n📋 RESUMO:');
  if (funcionando) {
    console.log('🎊 CORS FUNCIONANDO! Problema resolvido!');
    console.log('✅ Teste o login no frontend agora');
  } else {
    console.log('⏳ Servidor ainda não foi atualizado com debug/CORS');
    console.log('📞 PRÓXIMOS PASSOS:');
    console.log('1. Verificar logs do EasyPanel (procurar 🚨 emojis)');
    console.log('2. Se não vê 🚨, o deploy ainda não foi feito');
    console.log('3. Aguardar mais alguns minutos');
    console.log('4. Considerar restart manual do serviço');
  }
  
  console.log('\n💡 IMPORTANTE:');
  console.log('Os logs 🚨 devem aparecer nos logs do EasyPanel quando servidor iniciar');
  console.log('Se não aparecem = deploy não foi feito ainda');
}

main().catch(console.error);
