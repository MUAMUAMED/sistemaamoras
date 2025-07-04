const axios = require('axios');

// Token de teste (substitua por um token válido se necessário)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNzM1NzI5NjAwLCJleHAiOjE3MzU4MTYwMDB9.example';

async function testarValidacoes() {
  try {
    console.log('🔍 Testando validações de códigos...\n');

    // Teste 1: Validar códigos existentes
    console.log('1️⃣ Testando API de validação de códigos...');
    try {
      const response = await axios.get('http://localhost:3001/api/barcode/validate-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ API de validação funcionando!');
      console.log('📊 Resumo:', response.data.summary);
      if (response.data.invalid.length > 0) {
        console.log('⚠️  Códigos inválidos encontrados:', response.data.invalid.length);
      }
    } catch (error) {
      console.log('❌ Erro na API de validação:', error.response?.data || error.message);
    }

    // Teste 2: Tentar criar categoria com código inválido
    console.log('\n2️⃣ Testando validação de categoria com código inválido...');
    try {
      await axios.post('http://localhost:3001/api/categories', {
        name: 'Teste Categoria Inválida',
        code: 'ABC123', // Código inválido (letras)
        description: 'Teste de validação'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Deveria ter falhado!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validação funcionando! Erro:', error.response.data.message);
      } else {
        console.log('❌ Erro inesperado:', error.response?.data || error.message);
      }
    }

    // Teste 3: Tentar criar estampa com código muito longo
    console.log('\n3️⃣ Testando validação de estampa com código muito longo...');
    try {
      await axios.post('http://localhost:3001/api/patterns', {
        name: 'Teste Estampa Longa',
        code: '12345', // Código muito longo (5 dígitos)
        description: 'Teste de validação'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Deveria ter falhado!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validação funcionando! Erro:', error.response.data.message);
      } else {
        console.log('❌ Erro inesperado:', error.response?.data || error.message);
      }
    }

    // Teste 4: Tentar criar tamanho com código inválido
    console.log('\n4️⃣ Testando validação de tamanho com código inválido...');
    try {
      await axios.post('http://localhost:3001/api/sizes', {
        name: 'Teste Tamanho Inválido',
        code: '999', // Código muito longo (3 dígitos)
        active: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Deveria ter falhado!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validação funcionando! Erro:', error.response.data.message);
      } else {
        console.log('❌ Erro inesperado:', error.response?.data || error.message);
      }
    }

    console.log('\n🎉 Testes de validação concluídos!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar testes
testarValidacoes(); 