import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { encryptFiscalSecret } from '../services/fiscal-crypto.service';
import {
  cancelFiscalDocument,
  checkSefaz,
  getPublicFiscalConfig,
  issueNfceForSale,
  transmitFiscalDocument,
} from '../services/fiscal.service';
import { getCertificateInfo } from '../vendor/finopenpos-fiscal';

const router = Router();
const fiscalManagers = [authenticateToken, authorizeRoles('ADMIN', 'MANAGER')];
const digits = (value: unknown) => String(value || '').replace(/\D/g, '');

const errorResponse = (res: Response, next: NextFunction, error: any) => {
  if (error?.message) {
    return res.status(400).json({ error: 'Operacao fiscal recusada', message: error.message });
  }
  return next(error);
};

router.get('/config', ...fiscalManagers, async (_req, res, next) => {
  try {
    return res.json(await getPublicFiscalConfig());
  } catch (error) {
    return next(error);
  }
});

router.put('/config', ...fiscalManagers, async (req: AuthenticatedRequest, res, next) => {
  try {
    const current = await prisma.fiscalConfig.findUnique({ where: { id: 'default' } });
    const {
      active = false,
      companyName,
      tradeName,
      taxId,
      stateTaxId,
      taxRegime,
      stateCode,
      cityCode,
      cityName,
      street,
      streetNumber,
      district,
      zipCode,
      addressComplement,
      environment = 'HOMOLOGATION',
      nfeSeries = 1,
      nfceSeries = 1,
      nextNfeNumber = 1,
      nextNfceNumber = 1,
      cscId,
      cscToken,
      certificatePfxBase64,
      certificatePassword,
      defaultNcm,
      defaultCfop,
      defaultIcmsCst,
      defaultPisCst,
      defaultCofinsCst,
    } = req.body;

    const required = { companyName, taxId, stateTaxId, stateCode, cityCode, cityName, street, streetNumber, district, zipCode };
    const missing = Object.entries(required).filter(([, value]) => !String(value || '').trim()).map(([key]) => key);
    if (missing.length) return res.status(400).json({ error: 'Dados obrigatorios', message: `Preencha: ${missing.join(', ')}` });
    if (digits(taxId).length !== 14) return res.status(400).json({ error: 'CNPJ invalido', message: 'O CNPJ deve ter 14 digitos' });
    if (![1, 2, 3].includes(Number(taxRegime))) return res.status(400).json({ error: 'Regime tributario invalido' });
    if (!['HOMOLOGATION', 'PRODUCTION'].includes(environment)) return res.status(400).json({ error: 'Ambiente fiscal invalido' });
    if (String(stateCode).toUpperCase() !== 'DF') {
      return res.status(400).json({ error: 'UF ainda nao homologada', message: 'Esta primeira versao fiscal esta restrita ao Distrito Federal' });
    }

    let certificatePfxEncrypted = current?.certificatePfxEncrypted;
    let certificatePasswordEncrypted = current?.certificatePasswordEncrypted;
    let certificateValidUntil = current?.certificateValidUntil;
    if (certificatePfxBase64 || certificatePassword) {
      if (!certificatePfxBase64 || !certificatePassword) {
        return res.status(400).json({ error: 'Certificado incompleto', message: 'Envie o arquivo A1 e a senha juntos' });
      }
      const pfx = Buffer.from(certificatePfxBase64, 'base64');
      if (!pfx.length || pfx.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'Certificado invalido' });
      const info = getCertificateInfo(pfx, certificatePassword);
      if (info.validUntil <= new Date()) return res.status(400).json({ error: 'Certificado expirado' });
      certificatePfxEncrypted = encryptFiscalSecret(pfx);
      certificatePasswordEncrypted = encryptFiscalSecret(certificatePassword);
      certificateValidUntil = info.validUntil;
    }

    const config = await prisma.fiscalConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default', active: Boolean(active), companyName: String(companyName).trim(), tradeName: tradeName || null,
        taxId: digits(taxId), stateTaxId: digits(stateTaxId), taxRegime: Number(taxRegime), stateCode: 'DF',
        cityCode: digits(cityCode), cityName: String(cityName).trim(), street: String(street).trim(),
        streetNumber: String(streetNumber).trim(), district: String(district).trim(), zipCode: digits(zipCode),
        addressComplement: addressComplement || null, environment, nfeSeries: Number(nfeSeries), nfceSeries: Number(nfceSeries),
        nextNfeNumber: Number(nextNfeNumber), nextNfceNumber: Number(nextNfceNumber), cscId: cscId || null,
        cscTokenEncrypted: cscToken ? encryptFiscalSecret(cscToken) : null, certificatePfxEncrypted,
        certificatePasswordEncrypted, certificateValidUntil, defaultNcm: digits(defaultNcm) || null,
        defaultCfop: digits(defaultCfop) || null, defaultIcmsCst: defaultIcmsCst || null,
        defaultPisCst: defaultPisCst || null, defaultCofinsCst: defaultCofinsCst || null,
      },
      update: {
        active: Boolean(active), companyName: String(companyName).trim(), tradeName: tradeName || null,
        taxId: digits(taxId), stateTaxId: digits(stateTaxId), taxRegime: Number(taxRegime), stateCode: 'DF',
        cityCode: digits(cityCode), cityName: String(cityName).trim(), street: String(street).trim(),
        streetNumber: String(streetNumber).trim(), district: String(district).trim(), zipCode: digits(zipCode),
        addressComplement: addressComplement || null, environment, nfeSeries: Number(nfeSeries), nfceSeries: Number(nfceSeries),
        nextNfeNumber: Number(nextNfeNumber), nextNfceNumber: Number(nextNfceNumber), cscId: cscId || null,
        cscTokenEncrypted: cscToken ? encryptFiscalSecret(cscToken) : current?.cscTokenEncrypted,
        certificatePfxEncrypted, certificatePasswordEncrypted, certificateValidUntil,
        defaultNcm: digits(defaultNcm) || null, defaultCfop: digits(defaultCfop) || null,
        defaultIcmsCst: defaultIcmsCst || null, defaultPisCst: defaultPisCst || null,
        defaultCofinsCst: defaultCofinsCst || null,
      },
    });
    return res.json({ ...(await getPublicFiscalConfig()), updatedBy: req.user?.id, updatedAt: config.updatedAt });
  } catch (error) {
    return errorResponse(res, next, error);
  }
});

router.get('/documents', authenticateToken, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where = req.query.status ? { status: String(req.query.status) as any } : {};
    const [data, total] = await Promise.all([
      prisma.fiscalDocument.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { sale: { select: { saleNumber: true, leadName: true, paymentMethod: true } }, items: true },
      }),
      prisma.fiscalDocument.count({ where }),
    ]);
    return res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
});

router.get('/documents/:id', authenticateToken, async (req, res, next) => {
  try {
    const document = await prisma.fiscalDocument.findUnique({
      where: { id: req.params.id }, include: { sale: true, items: true, events: { orderBy: { createdAt: 'desc' } } },
    });
    if (!document) return res.status(404).json({ error: 'Documento fiscal nao encontrado' });
    return res.json(document);
  } catch (error) {
    return next(error);
  }
});

router.post('/sales/:saleId/issue-nfce', authenticateToken, async (req, res, next) => {
  try {
    return res.status(201).json(await issueNfceForSale(req.params.saleId));
  } catch (error) {
    return errorResponse(res, next, error);
  }
});

router.post('/documents/:id/retry', ...fiscalManagers, async (req, res, next) => {
  try {
    return res.json(await transmitFiscalDocument(req.params.id));
  } catch (error) {
    return errorResponse(res, next, error);
  }
});

router.post('/documents/:id/cancel', ...fiscalManagers, async (req, res, next) => {
  try {
    return res.json(await cancelFiscalDocument(req.params.id, req.body.reason));
  } catch (error) {
    return errorResponse(res, next, error);
  }
});

router.get('/status', ...fiscalManagers, async (_req, res, next) => {
  try {
    return res.json(await checkSefaz());
  } catch (error) {
    return errorResponse(res, next, error);
  }
});

export default router;
