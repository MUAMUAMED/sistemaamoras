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

// Função para listar produtos com códigos
async function listarProdutosComCodigos() {
  try {
    console.log('📦 Listando produtos com códigos...');
    const response = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const produtos = response.data.data;
    console.log(`✅ ${produtos.length} produtos encontrados`);
    
    produtos.forEach(produto => {
      console.log(`   - ${produto.name}: R$ ${produto.price} (Estoque: ${produto.stock})`);
      console.log(`     Código: ${produto.barcode || 'Sem código'}`);
    });
    
    return produtos;
  } catch (error) {
    console.error('❌ Erro ao listar produtos:', error.response?.data || error.message);
    return [];
  }
}

// Função para buscar produto por código
async function buscarProdutoPorCodigo(codigo) {
  try {
    console.log(`🔍 Buscando produto por código: ${codigo}`);
    const response = await axios.get(`${API_BASE}/products/search`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { code: codigo }
    });
    
    if (response.data) {
      console.log('✅ Produto encontrado:');
      console.log(`   - Nome: ${response.data.name}`);
      console.log(`   - Preço: R$ ${response.data.price}`);
      console.log(`   - Estoque: ${response.data.stock}`);
      console.log(`   - Código: ${response.data.barcode}`);
      return response.data;
    } else {
      console.log('❌ Produto não encontrado');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error.response?.data || error.message);
    return null;
  }
}

// Função para testar criação de venda com produto escaneado
async function testarVendaComProdutoEscaneado(produto) {
  if (!produto || !produto.barcode) {
    console.log('❌ Produto sem código de barras para teste');
    return null;
  }
  
  console.log(`🛒 Testando venda com produto escaneado: ${produto.name}`);
  
  const dadosVenda = {
    items: [
      {
        productId: produto.id,
        quantity: 1
      }
    ],
    paymentMethod: 'CASH',
    notes: `Teste scanner - Produto: ${produto.name} (${produto.barcode})`
  };
  
  try {
    const response = await axios.post(`${API_BASE}/sales`, dadosVenda, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Venda com produto escaneado criada com sucesso!');
    console.log(`📋 Venda #${response.data.saleNumber}: R$ ${response.data.total}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar venda:', error.response?.data || error.message);
    return null;
  }
}

// Função principal
async function testarScanner() {
  console.log('🚀 Iniciando teste do scanner de vendas...\n');
  
  // 1. Login
  const loginSucesso = await login();
  if (!loginSucesso) {
    console.log('❌ Falha no login, abortando teste');
    return;
  }
  
  console.log('');
  
  // 2. Listar produtos com códigos
  const produtos = await listarProdutosComCodigos();
  if (produtos.length === 0) {
    console.log('❌ Nenhum produto encontrado, abortando teste');
    return;
  }
  
  console.log('');
  
  // 3. Testar busca por código (usando o primeiro produto com código)
  const produtoComCodigo = produtos.find(p => p.barcode);
  if (produtoComCodigo) {
    console.log('🔍 Testando busca por código...');
    const produtoEncontrado = await buscarProdutoPorCodigo(produtoComCodigo.barcode);
    
    if (produtoEncontrado) {
      console.log('');
      
      // 4. Testar criação de venda com produto escaneado
      const venda = await testarVendaComProdutoEscaneado(produtoEncontrado);
      
      if (venda) {
        console.log('');
        console.log('🎉 Teste do scanner concluído com sucesso!');
        console.log('✅ Funcionalidades testadas:');
        console.log('   - Listagem de produtos com códigos');
        console.log('   - Busca por código de barras');
        console.log('   - Criação de venda com produto escaneado');
      }
    }
  } else {
    console.log('⚠️  Nenhum produto com código de barras encontrado');
    console.log('💡 Para testar o scanner, adicione códigos de barras aos produtos');
  }
}

// Executar teste
testarScanner().catch(console.error); 