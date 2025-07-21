const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Token de autenticação (substitua por um token válido)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZDlkMTdldDAwMDB3NHc1ZG1wNGVlazQiLCJuYW1lIjoiQWRtaW5pc3RyYWRvciIsImVtYWlsIjoiYWRtaW5AYW1vcmFzY2FwaXRhbC5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NTI5NDE4NDcsImV4cCI6MTc1MzAzMDI0N30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function testarCriacaoVenda() {
  try {
    console.log('🧪 Iniciando teste de criação de venda com dados do cliente...');

    // Buscar produtos disponíveis
    console.log('📦 Buscando produtos...');
    const produtosResponse = await axios.get(`${API_BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });

    const produtos = produtosResponse.data.data;
    if (!produtos || produtos.length === 0) {
      console.log('❌ Nenhum produto encontrado');
      return;
    }

    const produto = produtos[0];
    console.log(`✅ Produto encontrado: ${produto.name} (ID: ${produto.id})`);

    // Teste 1: Venda com nome do cliente
    console.log('\n🧪 Teste 1: Venda com nome do cliente');
    const venda1 = {
      items: [
        {
          productId: produto.id,
          quantity: 1
        }
      ],
      paymentMethod: 'PIX',
      leadName: 'João Silva',
      leadPhone: '11999999999'
    };

    console.log('📤 Enviando dados:', JSON.stringify(venda1, null, 2));
    
    const response1 = await axios.post(`${API_BASE_URL}/sales`, venda1, {
      headers: { 
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Venda 1 criada com sucesso!');
    console.log('📋 Resposta:', JSON.stringify(response1.data, null, 2));

    // Teste 2: Venda sem dados do cliente
    console.log('\n🧪 Teste 2: Venda sem dados do cliente');
    const venda2 = {
      items: [
        {
          productId: produto.id,
          quantity: 1
        }
      ],
      paymentMethod: 'CASH'
    };

    console.log('📤 Enviando dados:', JSON.stringify(venda2, null, 2));
    
    const response2 = await axios.post(`${API_BASE_URL}/sales`, venda2, {
      headers: { 
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Venda 2 criada com sucesso!');
    console.log('📋 Resposta:', JSON.stringify(response2.data, null, 2));

    // Verificar vendas criadas
    console.log('\n📋 Verificando vendas criadas...');
    const vendasResponse = await axios.get(`${API_BASE_URL}/sales`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    });

    const vendas = vendasResponse.data.data;
    console.log(`📊 Total de vendas: ${vendas.length}`);

    // Mostrar as últimas vendas
    const ultimasVendas = vendas.slice(0, 3);
    ultimasVendas.forEach((venda, index) => {
      console.log(`\n📋 Venda ${index + 1}:`);
      console.log(`   - ID: ${venda.id}`);
      console.log(`   - Número: ${venda.saleNumber}`);
      console.log(`   - Cliente: ${venda.leadName || 'Não informado'}`);
      console.log(`   - Telefone: ${venda.leadPhone || 'Não informado'}`);
      console.log(`   - Total: R$ ${venda.total}`);
      console.log(`   - Status: ${venda.status}`);
    });

    console.log('\n🎉 Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('📋 Detalhes do erro:', error.response.data);
      console.error('📊 Status:', error.response.status);
    }
  }
}

// Executar teste
testarCriacaoVenda(); 