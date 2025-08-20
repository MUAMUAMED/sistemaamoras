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
      console.log(`   - ${venda.saleNumber}: R$ ${venda.total} (${venda.status}) - ID: ${venda.id}`);
    });
    
    return vendas;
  } catch (error) {
    console.error('❌ Erro ao listar vendas:', error.response?.data || error.message);
    return [];
  }
}

// Função para criar uma venda de teste
async function criarVendaTeste() {
  try {
    console.log('🛒 Criando venda de teste...');
    
    // Primeiro, buscar produtos disponíveis
    const produtosResponse = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const produtos = produtosResponse.data.data;
    if (produtos.length === 0) {
      console.log('❌ Nenhum produto disponível para criar venda de teste');
      return null;
    }
    
    const produto = produtos[0];
    console.log(`📦 Usando produto: ${produto.name}`);
    
    const dadosVenda = {
      items: [
        {
          productId: produto.id,
          quantity: 1
        }
      ],
      paymentMethod: 'PENDING',
      notes: 'Venda de teste para exclusão'
    };
    
    const response = await axios.post(`${API_BASE}/sales`, dadosVenda, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Venda de teste criada com sucesso!');
    console.log(`📋 Venda #${response.data.saleNumber}: R$ ${response.data.total} (${response.data.status})`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar venda de teste:', error.response?.data || error.message);
    return null;
  }
}

// Função para excluir venda
async function excluirVenda(venda) {
  try {
    console.log(`🗑️ Excluindo venda #${venda.saleNumber}...`);
    console.log(`🗑️ ID da venda: ${venda.id}`);
    console.log(`🗑️ Status: ${venda.status}`);
    
    const response = await axios.delete(`${API_BASE}/sales/${venda.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Venda excluída com sucesso!');
    console.log(`📋 Resposta: ${response.data.message}`);
    console.log(`📋 Número da venda excluída: ${response.data.saleNumber}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao excluir venda:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('📋 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Função para testar exclusão de venda paga (deve falhar)
async function testarExclusaoVendaPaga(vendas) {
  const vendaPaga = vendas.find(v => v.status === 'PAID');
  
  if (!vendaPaga) {
    console.log('⚠️ Nenhuma venda paga encontrada para teste');
    return;
  }
  
  console.log(`🧪 Testando exclusão de venda paga #${vendaPaga.saleNumber}...`);
  const sucesso = await excluirVenda(vendaPaga);
  
  if (!sucesso) {
    console.log('✅ Teste passou: Venda paga não pode ser excluída (comportamento esperado)');
  } else {
    console.log('❌ Teste falhou: Venda paga foi excluída (não deveria)');
  }
}

// Função principal
async function testarExclusaoVendas() {
  console.log('🚀 Iniciando teste de exclusão de vendas...\n');
  
  // 1. Login
  const loginSucesso = await login();
  if (!loginSucesso) {
    console.log('❌ Falha no login, abortando teste');
    return;
  }
  
  console.log('');
  
  // 2. Listar vendas existentes
  const vendasExistentes = await listarVendas();
  
  console.log('');
  
  // 3. Testar exclusão de venda paga (deve falhar)
  if (vendasExistentes.length > 0) {
    await testarExclusaoVendaPaga(vendasExistentes);
    console.log('');
  }
  
  // 4. Criar venda de teste para exclusão
  const vendaTeste = await criarVendaTeste();
  if (!vendaTeste) {
    console.log('❌ Não foi possível criar venda de teste');
    return;
  }
  
  console.log('');
  
  // 5. Listar vendas novamente para confirmar criação
  const vendasAposCriacao = await listarVendas();
  const vendaCriada = vendasAposCriacao.find(v => v.id === vendaTeste.id);
  
  if (!vendaCriada) {
    console.log('❌ Venda criada não encontrada na listagem');
    return;
  }
  
  console.log('');
  
  // 6. Excluir a venda de teste
  const exclusaoSucesso = await excluirVenda(vendaCriada);
  
  if (exclusaoSucesso) {
    console.log('');
    
    // 7. Listar vendas novamente para confirmar exclusão
    const vendasAposExclusao = await listarVendas();
    const vendaAindaExiste = vendasAposExclusao.find(v => v.id === vendaTeste.id);
    
    if (!vendaAindaExiste) {
      console.log('✅ Venda excluída com sucesso da listagem!');
    } else {
      console.log('❌ Venda ainda aparece na listagem após exclusão');
    }
  }
  
  console.log('');
  console.log('🎉 Teste de exclusão de vendas concluído!');
}

// Executar teste
testarExclusaoVendas().catch(console.error); 