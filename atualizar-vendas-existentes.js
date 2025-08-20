const axios = require('axios');

// Configuração
const API_BASE = 'http://https://amoras-sistema-gew1.emebtn.easypanel.host/api';
let authToken = '';

// Função para fazer login
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@amorascapital.com',
      password: 'admin123'
    });
    
    authToken = response.data.token;
    console.log('✅ Login realizado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

// Função para listar vendas
async function listarVendas() {
  try {
    console.log('📋 Listando vendas...');
    const response = await axios.get(`${API_BASE}/sales`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const vendas = response.data.data;
    console.log(`✅ ${vendas.length} vendas encontradas`);
    
    vendas.forEach(venda => {
      console.log(`   - #${venda.saleNumber}: ${venda.paymentMethod} (${venda.status}) - ID: ${venda.id}`);
    });
    
    return vendas;
  } catch (error) {
    console.error('❌ Erro ao listar vendas:', error.response?.data || error.message);
    return [];
  }
}

// Função para atualizar status de uma venda
async function atualizarStatusVenda(vendaId, novoStatus) {
  try {
    console.log(`🔄 Atualizando venda ${vendaId} para status: ${novoStatus}`);
    
    const response = await axios.patch(`${API_BASE}/sales/${vendaId}/status`, {
      status: novoStatus
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Venda atualizada: ${response.data.saleNumber} -> ${response.data.status}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar venda ${vendaId}:`, error.response?.data || error.message);
    return false;
  }
}

// Função principal
async function atualizarVendasExistentes() {
  console.log('🚀 Iniciando atualização de vendas existentes...\n');
  
  // 1. Login
  const loginSucesso = await login();
  if (!loginSucesso) {
    console.log('❌ Falha no login, abortando');
    return;
  }
  
  console.log('');
  
  // 2. Listar vendas existentes
  const vendas = await listarVendas();
  if (vendas.length === 0) {
    console.log('❌ Nenhuma venda encontrada');
    return;
  }
  
  console.log('');
  
  // 3. Filtrar vendas que precisam ser atualizadas
  const vendasParaAtualizar = vendas.filter(v => v.status === 'PAID');
  
  if (vendasParaAtualizar.length === 0) {
    console.log('✅ Todas as vendas já estão com status correto');
    return;
  }
  
  console.log(`📋 ${vendasParaAtualizar.length} vendas precisam ser atualizadas:`);
  vendasParaAtualizar.forEach(v => {
    console.log(`   - #${v.saleNumber}: ${v.paymentMethod} (${v.status})`);
  });
  
  console.log('');
  console.log('⚠️ ATENÇÃO: Esta operação irá alterar o status das vendas para PENDING');
  console.log('Isso permitirá que elas sejam excluídas. Deseja continuar? (s/n)');
  
  // 4. Processar vendas
  let sucessos = 0;
  let falhas = 0;
  
  for (const venda of vendasParaAtualizar) {
    const sucesso = await atualizarStatusVenda(venda.id, 'PENDING');
    if (sucesso) {
      sucessos++;
    } else {
      falhas++;
    }
    console.log('');
  }
  
  console.log('🎉 Atualização concluída!');
  console.log('📊 Resumo:');
  console.log(`   - Vendas processadas: ${vendasParaAtualizar.length}`);
  console.log(`   - Sucessos: ${sucessos}`);
  console.log(`   - Falhas: ${falhas}`);
  
  if (sucessos > 0) {
    console.log('');
    console.log('✅ Agora as vendas podem ser excluídas!');
    console.log('💡 Recarregue a página para ver os botões de exclusão.');
  }
}

// Executar atualização
atualizarVendasExistentes().catch(console.error); 