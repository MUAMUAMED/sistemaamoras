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

// Função para listar movimentações de estoque
async function listarMovimentacoes() {
  try {
    const response = await axios.get(`${API_BASE}/stock-movements`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erro ao listar movimentações:', error.response?.data || error.message);
    return [];
  }
}

// Função para criar venda
async function criarVenda(produto, quantidade) {
  try {
    console.log(`🛒 Criando venda para ${produto.name} (Qtd: ${quantidade})`);
    console.log(`📦 Estoque antes: ${produto.stock}`);
    
    const dadosVenda = {
      items: [
        {
          productId: produto.id,
          quantity: quantidade
        }
      ],
      paymentMethod: 'CASH',
      notes: `Teste estoque - ${produto.name}`
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
    console.error(`❌ Erro ao criar venda:`, error.response?.data || error.message);
    return null;
  }
}

// Função para verificar estoque após venda
async function verificarEstoque(produtoId, nomeProduto) {
  try {
    const response = await axios.get(`${API_BASE}/products/${produtoId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const produto = response.data;
    console.log(`📦 Estoque após venda: ${produto.stock}`);
    return produto.stock;
  } catch (error) {
    console.error(`❌ Erro ao verificar estoque:`, error.response?.data || error.message);
    return null;
  }
}

// Função para verificar movimentações de estoque
async function verificarMovimentacoes(produtoId, vendaId) {
  try {
    const movimentacoes = await listarMovimentacoes();
    const movimentacoesVenda = movimentacoes.filter(m => 
      m.productId === produtoId && m.reason.includes(`Venda ${vendaId}`)
    );
    
    console.log(`📊 Movimentações encontradas para a venda: ${movimentacoesVenda.length}`);
    movimentacoesVenda.forEach(mov => {
      console.log(`   - Tipo: ${mov.type}, Quantidade: ${mov.quantity}, Motivo: ${mov.reason}`);
    });
    
    return movimentacoesVenda;
  } catch (error) {
    console.error(`❌ Erro ao verificar movimentações:`, error.response?.data || error.message);
    return [];
  }
}

// Função principal
async function testarEstoqueVendas() {
  console.log('🚀 Testando redução de estoque nas vendas...\n');
  
  // 1. Login
  const loginSucesso = await login();
  if (!loginSucesso) {
    console.log('❌ Falha no login, abortando teste');
    return;
  }
  
  console.log('');
  
  // 2. Listar produtos disponíveis
  console.log('📋 Listando produtos disponíveis...');
  const produtos = await listarProdutos();
  if (produtos.length === 0) {
    console.log('❌ Nenhum produto disponível');
    return;
  }
  
  // Filtrar produtos com estoque
  const produtosComEstoque = produtos.filter(p => p.stock > 0);
  if (produtosComEstoque.length === 0) {
    console.log('❌ Nenhum produto com estoque disponível');
    return;
  }
  
  console.log(`✅ ${produtosComEstoque.length} produtos com estoque encontrados:`);
  produtosComEstoque.forEach(produto => {
    console.log(`   - ${produto.name}: ${produto.stock} unidades`);
  });
  
  console.log('');
  
  // 3. Testar vendas para diferentes produtos
  const resultados = [];
  
  for (let i = 0; i < Math.min(3, produtosComEstoque.length); i++) {
    const produto = produtosComEstoque[i];
    const quantidade = Math.min(2, produto.stock); // Vender no máximo 2 unidades
    
    console.log(`🧪 Teste ${i + 1}: ${produto.name}`);
    console.log(`📦 Estoque inicial: ${produto.stock}`);
    
    // Criar venda
    const venda = await criarVenda(produto, quantidade);
    if (!venda) {
      console.log('❌ Falha ao criar venda, pulando...');
      console.log('');
      continue;
    }
    
    // Aguardar um pouco para processamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar estoque após venda
    const estoqueFinal = await verificarEstoque(produto.id, produto.name);
    if (estoqueFinal === null) {
      console.log('❌ Falha ao verificar estoque final');
      console.log('');
      continue;
    }
    
    // Verificar movimentações
    const movimentacoes = await verificarMovimentacoes(produto.id, venda.id);
    
    // Calcular diferença
    const estoqueEsperado = produto.stock - quantidade;
    const estoqueReduzido = estoqueFinal === estoqueEsperado;
    const movimentacaoCriada = movimentacoes.length > 0;
    
    console.log(`📊 Resultado:`);
    console.log(`   - Estoque esperado: ${estoqueEsperado}`);
    console.log(`   - Estoque real: ${estoqueFinal}`);
    console.log(`   - Estoque reduzido corretamente: ${estoqueReduzido ? '✅' : '❌'}`);
    console.log(`   - Movimentação criada: ${movimentacaoCriada ? '✅' : '❌'}`);
    
    resultados.push({
      produto: produto.name,
      estoqueInicial: produto.stock,
      quantidade: quantidade,
      estoqueFinal: estoqueFinal,
      estoqueEsperado: estoqueEsperado,
      estoqueReduzido: estoqueReduzido,
      movimentacaoCriada: movimentacaoCriada,
      venda: venda
    });
    
    console.log('');
  }
  
  // 4. Resumo dos resultados
  console.log('📊 Resumo dos Testes:');
  console.log('='.repeat(50));
  
  let sucessos = 0;
  let falhas = 0;
  
  resultados.forEach((resultado, index) => {
    console.log(`Teste ${index + 1}: ${resultado.produto}`);
    console.log(`   - Estoque inicial: ${resultado.estoqueInicial}`);
    console.log(`   - Quantidade vendida: ${resultado.quantidade}`);
    console.log(`   - Estoque final: ${resultado.estoqueFinal}`);
    console.log(`   - Estoque esperado: ${resultado.estoqueEsperado}`);
    console.log(`   - Estoque reduzido: ${resultado.estoqueReduzido ? '✅' : '❌'}`);
    console.log(`   - Movimentação criada: ${resultado.movimentacaoCriada ? '✅' : '❌'}`);
    
    if (resultado.estoqueReduzido && resultado.movimentacaoCriada) {
      sucessos++;
    } else {
      falhas++;
    }
    console.log('');
  });
  
  // 5. Conclusão
  console.log('🎯 CONCLUSÃO:');
  console.log(`   - Testes realizados: ${resultados.length}`);
  console.log(`   - Sucessos: ${sucessos}`);
  console.log(`   - Falhas: ${falhas}`);
  
  if (sucessos === resultados.length && resultados.length > 0) {
    console.log('✅ SUCESSO TOTAL! Estoque sendo reduzido corretamente.');
  } else if (sucessos > 0) {
    console.log('⚠️ PARCIALMENTE FUNCIONANDO. Alguns problemas detectados.');
  } else {
    console.log('❌ PROBLEMA DETECTADO. Estoque não está sendo reduzido.');
  }
  
  console.log('');
  console.log('🎉 Teste de estoque concluído!');
}

// Executar teste
testarEstoqueVendas().catch(console.error); 