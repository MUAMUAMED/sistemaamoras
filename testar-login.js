const axios = require('axios');

const API_URL = 'http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api';

const contas = [
  { email: 'admin@amorascapital.com', senha: 'admin123', nome: 'Administrador' },
  { email: 'atendente@amorascapital.com', senha: 'atendente123', nome: 'Atendente' },
  { email: 'gerente@amorascapital.com', senha: 'gerente123', nome: 'Gerente' }
];

async function testarLogin() {
  console.log('🔐 Testando login das contas criadas...\n');
  
  for (const conta of contas) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: conta.email,
        password: conta.senha
      });
      
      if (response.data.token) {
        console.log(`✅ ${conta.nome} - Login bem-sucedido!`);
        console.log(`   Email: ${conta.email}`);
        console.log(`   Função: ${response.data.user.role}`);
        console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
        console.log('');
      }
    } catch (error) {
      console.log(`❌ ${conta.nome} - Erro no login:`);
      console.log(`   Email: ${conta.email}`);
      console.log(`   Erro: ${error.response?.data?.error || error.message}`);
      console.log('');
    }
  }
}

async function verificarServidor() {
  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Servidor backend está funcionando!');
    return true;
  } catch (error) {
    console.log('❌ Servidor backend não está respondendo!');
    console.log('   Certifique-se que o backend está rodando na porta 3001');
    return false;
  }
}

async function main() {
  console.log('🚀 Sistema Amoras Capital - Teste de Login\n');
  
  const servidorOk = await verificarServidor();
  if (!servidorOk) {
    console.log('\n💡 Para iniciar o servidor:');
    console.log('   cd backend && npm run dev');
    return;
  }
  
  console.log('');
  await testarLogin();
  
  console.log('📋 Contas disponíveis:');
  contas.forEach(conta => {
    console.log(`   ${conta.nome}: ${conta.email} / ${conta.senha}`);
  });
  
  console.log('\n🌐 Acesse o sistema em: http://localhost:3000');
}

main().catch(console.error); 