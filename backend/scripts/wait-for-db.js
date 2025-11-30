#!/usr/bin/env node
/**
 * Script para aguardar banco de dados estar pronto
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 segundos

async function waitForDatabase() {
  console.log('🔄 Aguardando banco de dados PostgreSQL...');
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Banco de dados pronto!');
      await prisma.$disconnect();
      return true;
    } catch (error) {
      const remaining = MAX_RETRIES - i - 1;
      if (remaining > 0) {
        console.log(`⏳ Banco ainda não está pronto, aguardando 2 segundos... (tentativas restantes: ${remaining})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error('❌ Erro: Não foi possível conectar ao banco de dados após 60 segundos');
        await prisma.$disconnect();
        process.exit(1);
      }
    }
  }
  
  await prisma.$disconnect();
  return false;
}

waitForDatabase()
  .then(success => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Erro ao aguardar banco:', error);
    process.exit(1);
  });

