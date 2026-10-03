import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log das queries em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Params: ${e.params}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

// Log dos erros
prisma.$on('error', (e) => {
  logger.error('Erro no banco de dados:', e);
});

// Log das informações
prisma.$on('info', (e) => {
  logger.info(`Banco de dados: ${e.message}`);
});

// Log dos warnings
prisma.$on('warn', (e) => {
  logger.warn(`Banco de dados: ${e.message}`);
});

export { prisma }; 