const axios = require('axios');

// Configuração
const API_BASE = 'http://https://amoras-sistema-gew1.gbl2yq.easypanel.host/api';
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
    console.log('🔑 Token:', authToken.substring(0, 20) + '...');
    
    return true;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

// Função para listar produtos
async function listarProdutos() {
  try {
    console.log('📦 Listando produtos...');
    const response = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const produtos = response.data.data;
    console.log(`✅ ${produtos.length} produtos encontrados`);
    
    produtos.forEach(produto => {
      console.log(`   - ${produto.name}: R$ ${produto.price} (Estoque: ${produto.stock})`);
    });
    
    return produtos;
  } catch (error) {
    console.error('❌ Erro ao listar produtos:', error.response?.data || error.message);
    return [];
  }
}

// Função para criar venda (simulando o que o frontend envia)
async function criarVenda(produtos) {
  if (produtos.length === 0) {
    console.log('❌ Nenhum produto disponível para criar venda');
    return null;
  }
  
  const produto = produtos[0];
  console.log(`🛒 Criando venda com produto: ${produto.name}`);
  
  const dadosVenda = {
    items: [
      {
        productId: produto.id,
        quantity: 1
      }
    ],
    paymentMethod: 'CASH',
    notes: 'Teste via script de frontend'
  };
  
  console.log('📤 Dados que serão enviados:', JSON.stringify(dadosVenda, null, 2));
  
  try {
    const response = await axios.post(`${API_BASE}/sales`, dadosVenda, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Venda criada com sucesso!');
    console.log('📋 Detalhes da venda:');
    console.log(`   - ID: ${response.data.id}`);
    console.log(`   - Número: ${response.data.saleNumber}`);
    console.log(`   - Total: R$ ${response.data.total}`);
    console.log(`   - Status: ${response.data.status}`);
    console.log(`   - Pagamento: ${response.data.paymentMethod}`);
    console.log(`   - Itens: ${response.data.items.length}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar venda:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('📋 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
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
      console.log(`   - ${venda.saleNumber}: R$ ${venda.total} (${venda.status})`);
    });
    
    return vendas;
  } catch (error) {
    console.error('❌ Erro ao listar vendas:', error.response?.data || error.message);
    return [];
  }
}

// Função principal
async function testarFrontend() {
  console.log('🚀 Iniciando teste do frontend...\n');
  
  // 1. Login
  const loginSucesso = await login();
  if (!loginSucesso) {
    console.log('❌ Falha no login, abortando teste');
    return;
  }
  
  console.log('');
  
  // 2. Listar produtos
  const produtos = await listarProdutos();
  if (produtos.length === 0) {
    console.log('❌ Nenhum produto encontrado, abortando teste');
    return;
  }
  
  console.log('');
  
  // 3. Criar venda
  const venda = await criarVenda(produtos);
  if (!venda) {
    console.log('❌ Falha ao criar venda');
    return;
  }
  
  console.log('');
  
  // 4. Listar vendas para confirmar
  const vendas = await listarVendas();
  
  console.log('');
  console.log('🎉 Teste do frontend concluído!');
  
  // Verificar se a venda foi realmente criada
  const vendaCriada = vendas.find(v => v.id === venda.id);
  if (vendaCriada) {
    console.log('✅ Venda confirmada na listagem!');
  } else {
    console.log('❌ Venda não encontrada na listagem!');
  }
}

// Executar teste
testarFrontend().catch(console.error); 