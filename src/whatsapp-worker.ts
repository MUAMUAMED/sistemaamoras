import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './config/database';
import { logger } from './config/logger';
import { closeWhatsappConnection, startWhatsappReportAutomation } from './services/whatsapp-report.service';
import whatsappWorkerRoutes from './routes/whatsapp-worker.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'amoras-whatsapp-worker' }));
app.use('/internal/whatsapp-report', whatsappWorkerRoutes);

async function start() {
  try {
    if (!process.env.WHATSAPP_WORKER_TOKEN) {
      throw new Error('WHATSAPP_WORKER_TOKEN deve ser configurado no serviço WhatsApp.');
    }
    await prisma.$connect();
    startWhatsappReportAutomation();
    app.listen(port, '0.0.0.0', () => logger.info(`Worker WhatsApp ativo na porta ${port}`));
  } catch (error) {
    logger.error('Falha ao iniciar worker WhatsApp:', error);
    process.exit(1);
  }
}

async function shutdown() {
  await closeWhatsappConnection();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
void start();
