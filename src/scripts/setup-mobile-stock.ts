import { prisma } from '../config/database';
import { ensureMobileStockSetup } from '../services/mobile-stock-setup';

ensureMobileStockSetup().then(() => console.log('Conferência e reposição: tabelas preparadas.'))
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
