import axios from 'axios';
import { NextFunction, Request, Response, Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { prisma } from '../config/database';
import {
  beginWhatsappQrLink,
  getWhatsappReportStatus,
  listWhatsappGroups,
  requestWhatsappPairingCode,
  sendDailySalesReport,
} from '../services/whatsapp-report.service';

const router = Router();
const adminsOnly = [authenticateToken, authorizeRoles('ADMIN', 'MANAGER')];

// Quando configurado, o Baileys roda em um serviço independente. O ERP mantém
// estas mesmas rotas públicas e apenas encaminha a chamada pela rede interna.
// Isso evita derrubar a sessão do WhatsApp a cada deploy do backend principal.
function whatsappWorkerUrl() {
  return process.env.WHATSAPP_WORKER_URL?.replace(/\/$/, '') || null;
}

async function proxyToWhatsappWorker(req: Request, res: Response, next: NextFunction) {
  const baseUrl = whatsappWorkerUrl();
  const token = process.env.WHATSAPP_WORKER_TOKEN;
  if (!baseUrl) return false;
  if (!token) {
    res.status(503).json({ error: 'Serviço de relatórios WhatsApp ainda não foi configurado.' });
    return true;
  }

  try {
    const response = await axios.request({
      baseURL: baseUrl,
      url: `/internal/whatsapp-report${req.path}`,
      method: req.method,
      params: req.query,
      data: req.body,
      headers: { 'x-amoras-worker-token': token },
      validateStatus: () => true,
      timeout: 25_000,
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    next(new Error(`Serviço de relatórios WhatsApp indisponível: ${error?.message || error}`));
  }
  return true;
}

router.get('/config', ...adminsOnly, async (_req, res, next) => {
  if (await proxyToWhatsappWorker(_req, res, next)) return;
  try {
    const config = await prisma.whatsappReportConfig.upsert({
      where: { id: 'default' }, update: {}, create: { id: 'default' },
    });
    res.json(config);
  } catch (error) { next(error); }
});

router.put('/config', ...adminsOnly, async (req, res, next) => {
  if (await proxyToWhatsappWorker(req, res, next)) return;
  try {
    const { enabled, groupJid, groupName, scheduledHour } = req.body;
    if (scheduledHour !== undefined && (!Number.isInteger(scheduledHour) || scheduledHour < 0 || scheduledHour > 23)) {
      return res.status(400).json({ error: 'scheduledHour deve ser um horário inteiro entre 0 e 23.' });
    }
    const config = await prisma.whatsappReportConfig.upsert({
      where: { id: 'default' },
      update: {
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(groupJid !== undefined && { groupJid: groupJid || null }),
        ...(groupName !== undefined && { groupName: groupName || null }),
        ...(scheduledHour !== undefined && { scheduledHour }),
      },
      create: { id: 'default', enabled: Boolean(enabled), groupJid: groupJid || null, groupName: groupName || null, scheduledHour: scheduledHour ?? 18 },
    });
    res.json(config);
  } catch (error) { next(error); }
});

router.get('/status', ...adminsOnly, async (req, res, next) => {
  if (await proxyToWhatsappWorker(req, res, next)) return;
  res.json(getWhatsappReportStatus());
});

router.post('/connect', ...adminsOnly, async (_req, res, next) => {
  if (await proxyToWhatsappWorker(_req, res, next)) return;
  try {
    await beginWhatsappQrLink();
    res.json(getWhatsappReportStatus());
  } catch (error) { next(error); }
});

router.post('/pairing-code', ...adminsOnly, async (req, res, next) => {
  if (await proxyToWhatsappWorker(req, res, next)) return;
  try {
    const pairingCode = await requestWhatsappPairingCode(req.body?.phoneNumber);
    res.json({ pairingCode });
  } catch (error) { next(error); }
});

router.get('/groups', ...adminsOnly, async (_req, res, next) => {
  if (await proxyToWhatsappWorker(_req, res, next)) return;
  try { res.json(await listWhatsappGroups()); } catch (error) { next(error); }
});

router.post('/send-test', ...adminsOnly, async (req, res, next) => {
  if (await proxyToWhatsappWorker(req, res, next)) return;
  try {
    let reportFor: Date | undefined;
    if (req.body?.date) {
      const raw = String(req.body.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return res.status(400).json({ error: 'Data inválida. Use AAAA-MM-DD.' });
      reportFor = new Date(`${raw}T12:00:00-03:00`);
    }
    res.json(await sendDailySalesReport({ manual: true, reportFor }));
  } catch (error) { next(error); }
});

router.get('/logs', ...adminsOnly, async (_req, res, next) => {
  if (await proxyToWhatsappWorker(_req, res, next)) return;
  try {
    const logs = await prisma.whatsappReportLog.findMany({ orderBy: { attemptedAt: 'desc' }, take: 30 });
    res.json(logs);
  } catch (error) { next(error); }
});

export default router;
