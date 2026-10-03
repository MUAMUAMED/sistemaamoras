import { Router } from 'express';
import { prisma } from '../config/database';
import {
  beginWhatsappQrLink,
  getWhatsappReportStatus,
  listWhatsappGroups,
  requestWhatsappPairingCode,
  sendDailySalesReport,
} from '../services/whatsapp-report.service';

const router = Router();

// Este endpoint não é público: somente o backend principal conhece o token.
router.use((req, res, next) => {
  const expected = process.env.WHATSAPP_WORKER_TOKEN;
  if (!expected || req.header('x-amoras-worker-token') !== expected) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  next();
});

router.get('/config', async (_req, res, next) => {
  try {
    const config = await prisma.whatsappReportConfig.upsert({
      where: { id: 'default' }, update: {}, create: { id: 'default' },
    });
    res.json(config);
  } catch (error) { next(error); }
});

router.put('/config', async (req, res, next) => {
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

router.get('/status', (_req, res) => res.json(getWhatsappReportStatus()));

router.post('/connect', async (_req, res, next) => {
  try {
    await beginWhatsappQrLink();
    res.json(getWhatsappReportStatus());
  } catch (error) { next(error); }
});

router.post('/pairing-code', async (req, res, next) => {
  try {
    const pairingCode = await requestWhatsappPairingCode(req.body?.phoneNumber);
    res.json({ pairingCode });
  } catch (error) { next(error); }
});

router.get('/groups', async (_req, res, next) => {
  try { res.json(await listWhatsappGroups()); } catch (error) { next(error); }
});

router.post('/send-test', async (req, res, next) => {
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

router.get('/logs', async (_req, res, next) => {
  try {
    const logs = await prisma.whatsappReportLog.findMany({ orderBy: { attemptedAt: 'desc' }, take: 30 });
    res.json(logs);
  } catch (error) { next(error); }
});

export default router;
