import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { decryptFiscalSecret } from './fiscal-crypto.service';
import {
  PAYMENT_TYPES,
  SEFAZ_STATUS,
  attachProtocol,
  buildAuthorizationRequestXml,
  buildCancellationXml,
  buildInvoiceXml,
  buildStatusRequestXml,
  getNfceConsultationUri,
  getSefazUrl,
  loadCertificate,
  parseAuthorizationResponse,
  parseCancellationResponse,
  parseStatusResponse,
  putQRTag,
  sefazRequest,
  signEventXml,
  signXml,
  type FiscalSettings,
  type InvoiceBuildData,
  type InvoiceItemData,
  type PaymentData,
  type SefazEnvironment,
} from '../vendor/finopenpos-fiscal';

const DF_NFCE_QRCODE_URL = 'http://www.fazenda.df.gov.br/nfce/qrcode';

const onlyDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');
const moneyToCents = (value: number | Prisma.Decimal) => Math.round(Number(value) * 100);

const paymentType = (method: string) => ({
  CASH: PAYMENT_TYPES.cash,
  PIX: PAYMENT_TYPES.pix,
  CREDIT_CARD: PAYMENT_TYPES.credit_card,
  DEBIT_CARD: PAYMENT_TYPES.debit_card,
  BANK_SLIP: PAYMENT_TYPES.other,
  BANK_TRANSFER: PAYMENT_TYPES.other,
}[method] || PAYMENT_TYPES.other);

const publicConfig = (config: any) => config ? ({
  ...config,
  cscTokenEncrypted: undefined,
  certificatePfxEncrypted: undefined,
  certificatePasswordEncrypted: undefined,
  hasCscToken: Boolean(config.cscTokenEncrypted),
  hasCertificate: Boolean(config.certificatePfxEncrypted && config.certificatePasswordEncrypted),
}) : null;

export const getPublicFiscalConfig = async () => publicConfig(await prisma.fiscalConfig.findUnique({
  where: { id: 'default' },
}));

const loadFiscalSettings = async (): Promise<FiscalSettings> => {
  const config = await prisma.fiscalConfig.findUnique({ where: { id: 'default' } });
  if (!config || !config.active) throw new Error('Emissao fiscal ainda nao esta ativada');
  if (!config.certificatePfxEncrypted || !config.certificatePasswordEncrypted) {
    throw new Error('Certificado digital A1 nao configurado');
  }
  if (!config.cscId || !config.cscTokenEncrypted) throw new Error('CSC da NFC-e nao configurado');

  return {
    id: 1,
    userUid: 'amoras',
    companyName: config.companyName,
    tradeName: config.tradeName,
    taxId: onlyDigits(config.taxId),
    stateTaxId: onlyDigits(config.stateTaxId),
    taxRegime: config.taxRegime as 1 | 2 | 3,
    stateCode: config.stateCode,
    cityCode: onlyDigits(config.cityCode),
    cityName: config.cityName,
    street: config.street,
    streetNumber: config.streetNumber,
    district: config.district,
    zipCode: onlyDigits(config.zipCode),
    addressComplement: config.addressComplement,
    environment: (config.environment === 'PRODUCTION' ? 1 : 2) as SefazEnvironment,
    nfeSeries: config.nfeSeries,
    nfceSeries: config.nfceSeries,
    nextNfeNumber: config.nextNfeNumber,
    nextNfceNumber: config.nextNfceNumber,
    cscId: config.cscId,
    cscToken: decryptFiscalSecret(config.cscTokenEncrypted).toString('utf8'),
    certificatePfx: decryptFiscalSecret(config.certificatePfxEncrypted),
    certificatePassword: decryptFiscalSecret(config.certificatePasswordEncrypted).toString('utf8'),
    certificateValidUntil: config.certificateValidUntil,
    defaultNcm: config.defaultNcm || '',
    defaultCfop: config.defaultCfop || '',
    defaultIcmsCst: config.defaultIcmsCst || '',
    defaultPisCst: config.defaultPisCst || '',
    defaultCofinsCst: config.defaultCofinsCst || '',
  };
};

const validateFiscalProducts = (sale: any, settings: FiscalSettings) => {
  const invalid = sale.items.filter((item: any) => {
    const product = item.product;
    return !(product.ncm || settings.defaultNcm)
      || !(product.cfop || settings.defaultCfop)
      || !(product.icmsCst || settings.defaultIcmsCst)
      || !(product.pisCst || settings.defaultPisCst)
      || !(product.cofinsCst || settings.defaultCofinsCst);
  });
  if (invalid.length) {
    throw new Error(`Produtos sem configuracao fiscal: ${invalid.map((item: any) => item.product.name).join(', ')}`);
  }
};

const buildData = (document: any, settings: FiscalSettings): InvoiceBuildData => {
  const sale = document.sale;
  const items: InvoiceItemData[] = document.items.map((item: any) => {
    const totalPrice = moneyToCents(item.totalPrice);
    const icmsPercent = item.icmsRate == null ? 0 : Number(item.icmsRate);
    return {
      itemNumber: item.itemNumber,
      productCode: item.productCode,
      description: item.description,
      ncm: item.ncm,
      cest: item.cest || undefined,
      cfop: item.cfop,
      unitOfMeasure: item.unitOfMeasure,
      quantity: Number(item.quantity),
      unitPrice: moneyToCents(item.unitPrice),
      totalPrice,
      orig: item.fiscalOrigin,
      icmsCst: item.icmsCst,
      icmsRate: Math.round(icmsPercent * 100),
      icmsAmount: Math.round(totalPrice * icmsPercent / 100),
      pisCst: item.pisCst,
      cofinsCst: item.cofinsCst,
    };
  });
  const payments: PaymentData[] = [{
    method: paymentType(sale.paymentMethod),
    amount: moneyToCents(document.totalAmount),
  }];

  return {
    model: 65,
    series: document.series,
    number: document.number,
    emissionType: 1,
    environment: settings.environment,
    issuedAt: document.issuedAt,
    operationNature: document.operationNature,
    operationType: 1,
    purposeCode: 1,
    intermediaryIndicator: '0',
    emissionProcess: '0',
    consumerType: '1',
    buyerPresence: '1',
    printFormat: '4',
    issuer: {
      taxId: settings.taxId,
      stateTaxId: settings.stateTaxId,
      companyName: settings.companyName,
      tradeName: settings.tradeName,
      taxRegime: settings.taxRegime,
      stateCode: settings.stateCode,
      cityCode: settings.cityCode,
      cityName: settings.cityName,
      street: settings.street,
      streetNumber: settings.streetNumber,
      district: settings.district,
      zipCode: settings.zipCode,
      addressComplement: settings.addressComplement,
    },
    recipient: document.recipientTaxId ? {
      taxId: onlyDigits(document.recipientTaxId),
      name: document.recipientName || 'CONSUMIDOR',
    } : undefined,
    items,
    payments,
  };
};

const fullDocument = (id: string) => prisma.fiscalDocument.findUnique({
  where: { id },
  include: { sale: true, items: { orderBy: { itemNumber: 'asc' } }, events: true },
});

export const transmitFiscalDocument = async (documentId: string) => {
  const settings = await loadFiscalSettings();
  const document = await fullDocument(documentId);
  if (!document) throw new Error('Documento fiscal nao encontrado');
  if (document.status === 'AUTHORIZED') return document;

  await prisma.fiscalDocument.update({ where: { id: documentId }, data: { status: 'PROCESSING' } });
  try {
    const data = buildData(document, settings);
    const built = buildInvoiceXml(data);
    const certificate = loadCertificate(settings.certificatePfx!, settings.certificatePassword!);
    let signedXml = signXml(built.xml, certificate.privateKey, certificate.certificate);
    const rawConsultationUrl = getNfceConsultationUri(settings.stateCode, settings.environment);
    const consultationUrl = /^https?:\/\//i.test(rawConsultationUrl)
      ? rawConsultationUrl
      : `https://${rawConsultationUrl}`;
    if (settings.stateCode !== 'DF') {
      throw new Error('A URL de QR Code deve ser homologada para a UF antes da primeira emissao');
    }
    signedXml = await putQRTag({
      xml: signedXml,
      cscToken: settings.cscToken!,
      cscId: settings.cscId!,
      version: '200',
      qrCodeBaseUrl: DF_NFCE_QRCODE_URL,
      urlChave: consultationUrl,
    });
    const url = getSefazUrl(settings.stateCode, 'NfeAutorizacao', settings.environment, false, 65);
    const response = await sefazRequest({
      url,
      service: 'NfeAutorizacao',
      xmlContent: buildAuthorizationRequestXml(signedXml, settings.environment, settings.stateCode),
      pfx: settings.certificatePfx!,
      passphrase: settings.certificatePassword!,
    });
    const parsed = parseAuthorizationResponse(response.content);
    const status = parsed.statusCode === SEFAZ_STATUS.AUTHORIZED
      ? 'AUTHORIZED'
      : parsed.statusCode === SEFAZ_STATUS.DENIED ? 'DENIED' : 'REJECTED';
    const protocolXml = status === 'AUTHORIZED' ? attachProtocol(signedXml, response.content) : null;
    return prisma.fiscalDocument.update({
      where: { id: documentId },
      data: {
        accessKey: built.accessKey,
        status,
        requestXml: signedXml,
        responseXml: response.body,
        protocolXml,
        protocolNumber: parsed.protocolNumber,
        statusCode: parsed.statusCode,
        statusMessage: parsed.statusMessage,
        authorizedAt: status === 'AUTHORIZED' && parsed.authorizedAt
          ? new Date(parsed.authorizedAt)
          : null,
      },
      include: { items: true, events: true },
    });
  } catch (error: any) {
    await prisma.fiscalDocument.update({
      where: { id: documentId },
      data: { status: 'ERROR', statusMessage: error.message || 'Falha na emissao fiscal' },
    });
    throw error;
  }
};

export const issueNfceForSale = async (saleId: string) => {
  const settings = await loadFiscalSettings();
  const existing = await prisma.fiscalDocument.findFirst({
    where: { saleId, model: 65 },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    if (['ERROR', 'REJECTED'].includes(existing.status)) return transmitFiscalDocument(existing.id);
    return fullDocument(existing.id);
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: { include: { product: true } } },
  });
  if (!sale) throw new Error('Venda nao encontrada');
  if (sale.status !== 'PAID') throw new Error('A NFC-e so pode ser emitida para venda paga');
  validateFiscalProducts(sale, settings);

  const document = await prisma.$transaction(async (tx) => {
    const config = await tx.fiscalConfig.findUnique({ where: { id: 'default' } });
    if (!config) throw new Error('Configuracao fiscal nao encontrada');
    const number = config.nextNfceNumber;
    await tx.fiscalConfig.update({
      where: { id: 'default' },
      data: { nextNfceNumber: { increment: 1 } },
    });
    return tx.fiscalDocument.create({
      data: {
        saleId: sale.id,
        model: 65,
        series: config.nfceSeries,
        number,
        environment: config.environment,
        recipientTaxId: sale.customerTaxId,
        recipientName: sale.leadName,
        totalAmount: new Prisma.Decimal(sale.total),
        paymentSnapshot: { method: sale.paymentMethod, total: sale.total },
        items: {
          create: sale.items.map((item, index) => ({
            productId: item.productId,
            itemNumber: index + 1,
            productCode: item.product.barcode || item.product.id,
            description: item.product.name || 'PRODUTO',
            ncm: item.product.ncm || settings.defaultNcm,
            cest: item.product.cest,
            cfop: item.product.cfop || settings.defaultCfop,
            unitOfMeasure: item.product.unitOfMeasure || 'UN',
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.total),
            fiscalOrigin: item.product.fiscalOrigin || '0',
            icmsCst: item.product.icmsCst || settings.defaultIcmsCst,
            icmsRate: item.product.icmsRate,
            pisCst: item.product.pisCst || settings.defaultPisCst,
            cofinsCst: item.product.cofinsCst || settings.defaultCofinsCst,
          })),
        },
      },
    });
  });
  return transmitFiscalDocument(document.id);
};

export const checkSefaz = async () => {
  const settings = await loadFiscalSettings();
  const response = await sefazRequest({
    url: getSefazUrl(settings.stateCode, 'NfeStatusServico', settings.environment, false, 65),
    service: 'NfeStatusServico',
    xmlContent: buildStatusRequestXml(settings.stateCode, settings.environment),
    pfx: settings.certificatePfx!,
    passphrase: settings.certificatePassword!,
  });
  const parsed = parseStatusResponse(response.content);
  return { online: parsed.statusCode === SEFAZ_STATUS.SERVICE_RUNNING, ...parsed };
};

export const cancelFiscalDocument = async (documentId: string, reason: string) => {
  if (!reason || reason.trim().length < 15) throw new Error('A justificativa deve ter pelo menos 15 caracteres');
  const settings = await loadFiscalSettings();
  const document = await fullDocument(documentId);
  if (!document || document.status !== 'AUTHORIZED' || !document.accessKey || !document.protocolNumber) {
    throw new Error('Somente uma NFC-e autorizada pode ser cancelada');
  }
  const certificate = loadCertificate(settings.certificatePfx!, settings.certificatePassword!);
  const eventXml = buildCancellationXml(
    document.accessKey,
    document.protocolNumber,
    reason.trim(),
    settings.taxId,
    settings.environment
  );
  const signedEvent = signEventXml(eventXml, certificate.privateKey, certificate.certificate);
  const response = await sefazRequest({
    url: getSefazUrl(settings.stateCode, 'RecepcaoEvento', settings.environment, false, 65),
    service: 'RecepcaoEvento',
    xmlContent: signedEvent,
    pfx: settings.certificatePfx!,
    passphrase: settings.certificatePassword!,
  });
  const parsed = parseCancellationResponse(response.content);
  const success = [SEFAZ_STATUS.EVENT_REGISTERED, SEFAZ_STATUS.ALREADY_CANCELLED].includes(parsed.statusCode as any);
  await prisma.$transaction([
    prisma.fiscalEvent.create({
      data: {
        documentId,
        type: 'CANCELLATION',
        protocolNumber: parsed.protocolNumber,
        statusCode: parsed.statusCode,
        reason: reason.trim(),
        requestXml: signedEvent,
        responseXml: response.body,
      },
    }),
    prisma.fiscalDocument.update({
      where: { id: documentId },
      data: success ? { status: 'CANCELLED', cancelledAt: new Date() } : {
        statusMessage: parsed.statusMessage,
        statusCode: parsed.statusCode,
      },
    }),
  ]);
  return { success, ...parsed };
};
