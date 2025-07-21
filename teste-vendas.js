const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Função para fazer login e obter token
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@amorascapital.com',
      password: 'admin123'
    });
    
    const token = response.data.token;
    console.log('✅ Login realizado com sucesso');
    return token;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    throw error;
  }
}

// Função para listar produtos
async function listProducts(token) {
  try {
    console.log('📦 Listando produtos...');
    const response = await axios.get(`${API_BASE}/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ ${response.data.data.length} produtos encontrados`);
    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao listar produtos:', error.response?.data || error.message);
    throw error;
  }
}

// Função para criar uma venda
async function createSale(token, products) {
  try {
    if (products.length === 0) {
      console.log('❌ Nenhum produto disponível para criar venda');
      return;
    }

    const product = products[0]; // Usar o primeiro produto
    console.log(`🛒 Criando venda com produto: ${product.name}`);
    
    const saleData = {
      items: [
        {
          productId: product.id,
          quantity: 1
        }
      ],
      paymentMethod: 'CASH',
      notes: 'Venda de teste via script'
    };

    const response = await axios.post(`${API_BASE}/sales`, saleData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Venda criada com sucesso!');
    console.log(`📋 Detalhes da venda:`);
    console.log(`   - ID: ${response.data.id}`);
    console.log(`   - Número: ${response.data.saleNumber}`);
    console.log(`   - Total: R$ ${response.data.total}`);
    console.log(`   - Status: ${response.data.status}`);
    console.log(`   - Itens: ${response.data.items.length}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar venda:', error.response?.data || error.message);
    throw error;
  }
}

// Função para listar vendas
async function listSales(token) {
  try {
    console.log('📋 Listando vendas...');
    const response = await axios.get(`${API_BASE}/sales`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ ${response.data.sales.length} vendas encontradas`);
    response.data.sales.forEach(sale => {
      console.log(`   - ${sale.saleNumber}: R$ ${sale.total} (${sale.status})`);
    });
    
    return response.data.sales;
  } catch (error) {
    console.error('❌ Erro ao listar vendas:', error.response?.data || error.message);
    throw error;
  }
}

// Função principal
async function testSales() {
  try {
    console.log('🚀 Iniciando teste de vendas...\n');
    
    // 1. Login
    const token = await login();
    console.log('');
    
    // 2. Listar produtos
    const products = await listProducts(token);
    console.log('');
    
    // 3. Criar venda
    const sale = await createSale(token, products);
    console.log('');
    
    // 4. Listar vendas
    const sales = await listSales(token);
    console.log('');
    
    console.log('🎉 Teste de vendas concluído com sucesso!');
    
  } catch (error) {
    console.error('💥 Teste falhou:', error.message);
    process.exit(1);
  }
}

// Executar teste
testSales(); 