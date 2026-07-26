import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { encryptFiscalSecret } from '../services/fiscal-crypto.service';
import {
  FiscalAiProvider,
  getFiscalAiProviders,
  parseManualFiscalDraft,
} from '../services/fiscal-ai.service';
import {
  cancelFiscalDocument,
  checkSefaz,
  getPublicFiscalConfig,
  issueManualNfce,
  issueNfceForSale,
  transmitFiscalDocument,
} from '../services/fiscal.service';
import { getCertificateInfo } from '../vendor/finopenpos-fiscal';

const router = Router();
const fiscalManagers = [authenticateToken, authorizeRoles('ADMIN', 'MANAGER')];
const fiscalAiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite temporario de IA atingido',
    message: 'Aguarde alguns minutos antes de interpretar outro rascunho.',
  },
});
const digits = (value: unknown) => String(value || '').replace(/\D/g, '');
const decodeXmlText = (value: string) => value
  .replace(/^<!\[CDATA\[|\]\]>$/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

const extractXmlTag = (xml: string | null, tag: string) => {
  if (!xml) return null;
  const match = xml.match(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i'));
  return match ? decodeXmlText(match[1].trim()) : null;
};

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
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const environment = String(req.query.environment || '').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const numericSearch = /^\d+$/.test(search) ? Number(search) : null;
    const issuedAt = dateFrom || dateTo ? {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000`) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    } : undefined;
    const where: any = {
      ...(status ? { status } : {}),
      ...(environment ? { environment } : {}),
      ...(issuedAt ? { issuedAt } : {}),
      ...(search ? {
        OR: [
          ...(numericSearch !== null ? [{ number: numericSearch }] : []),
          { accessKey: { contains: search } },
          { recipientName: { contains: search, mode: 'insensitive' } },
          { recipientTaxId: { contains: search } },
          {
            sale: {
              is: {
                OR: [
                  { saleNumber: { contains: search, mode: 'insensitive' } },
                  { leadName: { contains: search, mode: 'insensitive' } },
                  { customerTaxId: { contains: search } },
                ],
              },
            },
          },
        ],
      } : {}),
    };
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

router.get('/documents/:id/danfe', authenticateToken, async (req, res, next) => {
  try {
    const [document, config] = await Promise.all([
      prisma.fiscalDocument.findUnique({
        where: { id: req.params.id },
        include: {
          sale: {
            select: {
              saleNumber: true,
              leadName: true,
              customerTaxId: true,
              paymentMethod: true,
              subtotal: true,
              discount: true,
              total: true,
            },
          },
          items: { orderBy: { itemNumber: 'asc' } },
        },
      }),
      prisma.fiscalConfig.findUnique({
        where: { id: 'default' },
        select: {
          companyName: true,
          tradeName: true,
          taxId: true,
          stateTaxId: true,
          stateCode: true,
          cityName: true,
          street: true,
          streetNumber: true,
          district: true,
          zipCode: true,
          addressComplement: true,
        },
      }),
    ]);

    if (!document || !config) return res.status(404).json({ error: 'Documento fiscal nao encontrado' });
    if (document.status !== 'AUTHORIZED' || !document.protocolXml) {
      return res.status(409).json({
        error: 'Documento ainda nao autorizado',
        message: document.statusMessage || `Status atual: ${document.status}`,
      });
    }

    return res.json({
      id: document.id,
      model: document.model,
      series: document.series,
      number: document.number,
      accessKey: document.accessKey,
      protocolNumber: document.protocolNumber,
      status: document.status,
      environment: document.environment,
      operationNature: document.operationNature,
      issuedAt: document.issuedAt,
      authorizedAt: document.authorizedAt,
      recipientName: document.recipientName,
      recipientTaxId: document.recipientTaxId,
      totalAmount: document.totalAmount,
      qrCodeUrl: extractXmlTag(document.protocolXml, 'qrCode') || extractXmlTag(document.requestXml, 'qrCode'),
      consultationUrl: extractXmlTag(document.protocolXml, 'urlChave') || extractXmlTag(document.requestXml, 'urlChave'),
      issuer: config,
      sale: document.sale,
      items: document.items,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/documents/:id/xml', authenticateToken, async (req, res, next) => {
  try {
    const document = await prisma.fiscalDocument.findUnique({
      where: { id: req.params.id },
      select: { status: true, protocolXml: true, series: true, number: true, statusMessage: true },
    });
    if (!document) return res.status(404).json({ error: 'Documento fiscal nao encontrado' });
    if (document.status !== 'AUTHORIZED' || !document.protocolXml) {
      return res.status(409).json({
        error: 'XML autorizado indisponivel',
        message: document.statusMessage || `Status atual: ${document.status}`,
      });
    }

    const filename = `nfce-${document.series}-${document.number}.xml`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(document.protocolXml);
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

router.post('/manual/issue-nfce', authenticateToken, authorizeRoles('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Usuario nao autenticado' });
    return res.status(201).json(await issueManualNfce(req.body, req.user.id));
  } catch (error) {
    return errorResponse(res, next, error);
  }
});

router.get('/ai/providers', authenticateToken, authorizeRoles('ADMIN'), (_req, res) => {
  return res.json(getFiscalAiProviders());
});

router.post('/ai/parse-draft', authenticateToken, authorizeRoles('ADMIN'), fiscalAiLimiter, async (req, res, next) => {
  try {
    return res.json(await parseManualFiscalDraft(
      String(req.body?.provider || '').toLowerCase() as FiscalAiProvider,
      req.body?.prompt
    ));
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
