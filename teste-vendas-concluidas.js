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

// Função para criar venda
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
      notes: `Teste vendas concluídas - ${description}`
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
    console.log(`🗑️ Tentando excluir venda #${venda.saleNumber} (${venda.paymentMethod}) - Status: ${venda.status}...`);
    
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
async function testarVendasConcluidas() {
  console.log('🚀 Testando vendas criadas como concluídas e exclusão...\n');
  
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
  console.log('🛒 Criando vendas (devem ser criadas como PAID)...');
  for (const metodo of metodosPagamento) {
    const venda = await criarVenda(metodo.method, metodo.description);
    if (venda) {
      vendasCriadas.push(venda);
    }
    console.log('');
  }
  
  // 4. Verificar status das vendas criadas
  console.log('📋 Verificando status das vendas criadas:');
  vendasCriadas.forEach(venda => {
    const statusCorreto = venda.status === 'PAID';
    console.log(`   - #${venda.saleNumber}: ${venda.paymentMethod} (${venda.status}) ${statusCorreto ? '✅' : '❌'}`);
  });
  
  // 5. Verificar se todas foram criadas como PAID
  const vendasPAID = vendasCriadas.filter(v => v.status === 'PAID');
  const vendasPENDING = vendasCriadas.filter(v => v.status === 'PENDING');
  
  console.log('');
  console.log('📊 Status das vendas criadas:');
  console.log(`   - Vendas PAID (concluídas): ${vendasPAID.length}`);
  console.log(`   - Vendas PENDING (pendentes): ${vendasPENDING.length}`);
  
  if (vendasPAID.length === vendasCriadas.length) {
    console.log('✅ Todas as vendas foram criadas como PAID (concluídas)!');
  } else {
    console.log('❌ Algumas vendas não foram criadas como PAID');
  }
  
  console.log('');
  
  // 6. Testar exclusão de vendas PAID
  console.log('🧪 Testando exclusão de vendas concluídas (PAID)...');
  let sucessosExclusao = 0;
  let falhasExclusao = 0;
  
  for (const venda of vendasPAID) {
    const sucesso = await excluirVenda(venda);
    if (sucesso) {
      sucessosExclusao++;
      console.log(`✅ Exclusão bem-sucedida para ${venda.paymentMethod} (PAID)`);
    } else {
      falhasExclusao++;
      console.log(`❌ Falha na exclusão para ${venda.paymentMethod} (PAID)`);
    }
    console.log('');
  }
  
  // 7. Testar exclusão de vendas PENDING (se houver)
  if (vendasPENDING.length > 0) {
    console.log('🧪 Testando exclusão de vendas pendentes (PENDING)...');
    for (const venda of vendasPENDING) {
      const sucesso = await excluirVenda(venda);
      if (sucesso) {
        sucessosExclusao++;
        console.log(`✅ Exclusão bem-sucedida para ${venda.paymentMethod} (PENDING)`);
      } else {
        falhasExclusao++;
        console.log(`❌ Falha na exclusão para ${venda.paymentMethod} (PENDING)`);
      }
      console.log('');
    }
  }
  
  // 8. Verificar se todas foram excluídas
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
  console.log('🎉 Teste de vendas concluídas finalizado!');
  
  // 9. Resumo final
  console.log('📊 Resumo Final:');
  console.log(`   - Vendas criadas: ${vendasCriadas.length}`);
  console.log(`   - Vendas PAID: ${vendasPAID.length}`);
  console.log(`   - Vendas PENDING: ${vendasPENDING.length}`);
  console.log(`   - Exclusões bem-sucedidas: ${sucessosExclusao}`);
  console.log(`   - Falhas na exclusão: ${falhasExclusao}`);
  console.log(`   - Vendas restantes: ${vendasTesteRestantes.length}`);
  
  // 10. Conclusão
  if (vendasPAID.length === vendasCriadas.length && sucessosExclusao === vendasCriadas.length) {
    console.log('');
    console.log('🎯 CONCLUSÃO: ✅ SUCESSO TOTAL!');
    console.log('   - Todas as vendas foram criadas como PAID (concluídas)');
    console.log('   - Todas as vendas PAID podem ser excluídas');
    console.log('   - Sistema funcionando conforme solicitado');
  } else {
    console.log('');
    console.log('🎯 CONCLUSÃO: ⚠️ ALGUNS PROBLEMAS DETECTADOS');
    console.log('   - Verificar logs acima para detalhes');
  }
}

// Executar teste
testarVendasConcluidas().catch(console.error); 