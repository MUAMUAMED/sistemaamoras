/**
 * Script para criar um usuário de teste no banco de dados
 * Gera email e senha aleatórios
 * 
 * Uso:
 *   node scripts/create-test-user.js
 *   ou
 *   docker exec -it amoras-backend node scripts/create-test-user.js
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Gerar email aleatório
function generateRandomEmail() {
  const random = Math.random().toString(36).substring(2, 10);
  const domains = ['test.com', 'example.com', 'demo.com', 'teste.com.br'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `teste_${random}@${domain}`;
}

// Gerar senha aleatória
function generateRandomPassword() {
  const length = 8;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function createTestUser() {
  try {
    // Gerar credenciais aleatórias
    const email = generateRandomEmail();
    const plainPassword = generateRandomPassword();
    const name = `Usuário Teste ${Math.random().toString(36).substring(2, 6)}`;
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN', // Pode mudar para 'MANAGER' ou 'ATTENDANT'
        active: true,
      },
    });
    
    console.log('\n✅ Usuário criado com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Senha:', plainPassword);
    console.log('👤 Nome:', name);
    console.log('🎭 Role:', user.role);
    console.log('🆔 ID:', user.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Guarde essas credenciais! Elas não serão mostradas novamente.\n');
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ Erro: Email já existe. Tente novamente.');
    } else {
      console.error('❌ Erro ao criar usuário:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

