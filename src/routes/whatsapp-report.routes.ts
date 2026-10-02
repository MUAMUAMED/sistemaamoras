import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { prisma } from '../config/database';
import {
  connectWhatsapp,
  getWhatsappReportStatus,
  listWhatsappGroups,
  requestWhatsappPairingCode,
  sendDailySalesReport,
} from '../services/whatsapp-report.service';

const router = Router();
const adminsOnly = [authenticateToken, authorizeRoles('ADMIN', 'MANAGER')];

router.get('/config', ...adminsOnly, async (_req, res, next) => {
  try {
    const config = await prisma.whatsappReportConfig.upsert({
      where: { id: 'default' }, update: {}, create: { id: 'default' },
    });
    res.json(config);
  } catch (error) { next(error); }
});

router.put('/config', ...adminsOnly, async (req, res, next) => {
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

router.get('/status', ...adminsOnly, (_req, res) => res.json(getWhatsappReportStatus()));

router.post('/connect', ...adminsOnly, async (_req, res, next) => {
  try {
    await connectWhatsapp();
    res.json(getWhatsappReportStatus());
  } catch (error) { next(error); }
});

router.post('/pairing-code', ...adminsOnly, async (req, res, next) => {
  try {
    const pairingCode = await requestWhatsappPairingCode(req.body?.phoneNumber);
    res.json({ pairingCode });
  } catch (error) { next(error); }
});

router.get('/groups', ...adminsOnly, async (_req, res, next) => {
  try { res.json(await listWhatsappGroups()); } catch (error) { next(error); }
});

router.post('/send-test', ...adminsOnly, async (_req, res, next) => {
  try { res.json(await sendDailySalesReport({ manual: true })); } catch (error) { next(error); }
});

router.get('/logs', ...adminsOnly, async (_req, res, next) => {
  try {
    const logs = await prisma.whatsappReportLog.findMany({ orderBy: { attemptedAt: 'desc' }, take: 30 });
    res.json(logs);
  } catch (error) { next(error); }
});

export default router;
