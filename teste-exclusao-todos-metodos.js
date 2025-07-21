const axios = require('axios');

// Configuração
const API_BASE = 'http://localhost:3001/api';
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

// Função para listar produtos
async function listarProdutos() {
  try {
    const response = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao listar produtos:', error.response?.data || error.message);
    return [];
  }
}

// Função para criar venda com método específico
async function criarVenda(method, description) {
  try {
    console.log(`🛒 Criando venda com método: ${method} (${description})`);
    
    const produtos = await listarProdutos();
    if (produtos.length === 0) {
      console.log('❌ Nenhum produto disponível');
      return null;
    }
    
    const produto = produtos[0];
    const dadosVenda = {
      items: [
        {
          productId: produto.id,
          quantity: 1
        }
      ],
      paymentMethod: method,
      notes: `Teste exclusão - ${description}`
    };
    
    const response = await axios.post(`${API_BASE}/sales`, dadosVenda, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Venda criada: #${response.data.saleNumber} - Status: ${response.data.status}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao criar venda ${method}:`, error.response?.data || error.message);
    return null;
  }
}

// Função para excluir venda
async function excluirVenda(venda) {
  try {
    console.log(`🗑️ Tentando excluir venda #${venda.saleNumber} (${venda.paymentMethod})...`);
    
    const response = await axios.delete(`${API_BASE}/sales/${venda.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Venda excluída com sucesso: ${response.data.message}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao excluir venda:`, error.response?.data || error.message);
    return false;
  }
}

// Função para listar vendas
async function listarVendas() {
  try {
    const response = await axios.get(`${API_BASE}/sales`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao listar vendas:', error.response?.data || error.message);
    return [];
  }
}

// Função principal
async function testarExclusaoTodosMetodos() {
  console.log('🚀 Iniciando teste de exclusão para todos os métodos de pagamento...\n');
  
  // 1. Login
  const loginSucesso = await login();
  if (!loginSucesso) {
    console.log('❌ Falha no login, abortando teste');
    return;
  }
  
  console.log('');
  
  // 2. Definir métodos de pagamento para testar
  const metodosPagamento = [
    { method: 'CASH', description: 'Dinheiro' },
    { method: 'PIX', description: 'PIX' },
    { method: 'CREDIT_CARD', description: 'Cartão de Crédito' },
    { method: 'DEBIT_CARD', description: 'Cartão de Débito' },
    { method: 'BANK_SLIP', description: 'Boleto' }
  ];
  
  const vendasCriadas = [];
  
  // 3. Criar vendas com diferentes métodos
  for (const metodo of metodosPagamento) {
    const venda = await criarVenda(metodo.method, metodo.description);
    if (venda) {
      vendasCriadas.push(venda);
    }
    console.log('');
  }
  
  // 4. Listar vendas criadas
  console.log('📋 Vendas criadas para teste:');
  vendasCriadas.forEach(venda => {
    console.log(`   - #${venda.saleNumber}: ${venda.paymentMethod} (${venda.status})`);
  });
  
  console.log('');
  
  // 5. Testar exclusão de cada venda
  console.log('🧪 Testando exclusão de cada venda...');
  for (const venda of vendasCriadas) {
    const sucesso = await excluirVenda(venda);
    if (sucesso) {
      console.log(`✅ Exclusão bem-sucedida para ${venda.paymentMethod}`);
    } else {
      console.log(`❌ Falha na exclusão para ${venda.paymentMethod}`);
    }
    console.log('');
  }
  
  // 6. Verificar se todas foram excluídas
  console.log('🔍 Verificando se todas as vendas foram excluídas...');
  const vendasRestantes = await listarVendas();
  const vendasTesteRestantes = vendasRestantes.filter(v => 
    vendasCriadas.some(vc => vc.id === v.id)
  );
  
  if (vendasTesteRestantes.length === 0) {
    console.log('✅ Todas as vendas de teste foram excluídas com sucesso!');
  } else {
    console.log(`❌ ${vendasTesteRestantes.length} vendas ainda não foram excluídas:`);
    vendasTesteRestantes.forEach(v => {
      console.log(`   - #${v.saleNumber}: ${v.paymentMethod} (${v.status})`);
    });
  }
  
  console.log('');
  console.log('🎉 Teste de exclusão para todos os métodos concluído!');
  
  // 7. Resumo final
  console.log('📊 Resumo:');
  console.log(`   - Vendas criadas: ${vendasCriadas.length}`);
  console.log(`   - Vendas excluídas: ${vendasCriadas.length - vendasTesteRestantes.length}`);
  console.log(`   - Vendas restantes: ${vendasTesteRestantes.length}`);
}

// Executar teste
testarExclusaoTodosMetodos().catch(console.error); 