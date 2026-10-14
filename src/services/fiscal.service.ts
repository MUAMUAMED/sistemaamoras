import { contributionBase, resolveContributionRate, resolveDefaultCfop, validateNfeSeries, validateCfop, validateOperation, validateNfeTax, type FiscalOperationInput } from './fiscal-operation';
import { PaymentMethod, Prisma } from '@prisma/client';
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
const HOMOLOGATION_RECIPIENT_NAME = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

const onlyDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');
const fiscalText = (value?: string | null, maxLength = 60) => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .slice(0, maxLength);
const moneyToCents = (value: number | Prisma.Decimal) => Math.round(Number(value) * 100);
const roundMoney = (value: number) => Math.round(value * 100) / 100;

const MANUAL_PAYMENT_METHODS = new Set<PaymentMethod>([
  'CASH',
  'PIX',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_SLIP',
  'BANK_TRANSFER',
]);

export interface ManualNfceItemInput {
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ncm?: string;
  cest?: string;
  cfop?: string;
  pisRate?: number;
  cofinsRate?: number;
  difal?: { base: number; internalRate: number; interstateRate: number; fcpRate: number };
  unitOfMeasure?: string;
  fiscalOrigin?: string;
  icmsCst?: string;
  icmsRate?: number | null;
  pisCst?: string;
  cofinsCst?: string;
}

export interface ManualNfceInput extends FiscalOperationInput {
  recipientName?: string;
  recipientTaxId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: ManualNfceItemInput[];
}

const paymentType = (method: string) => ({
  CASH: PAYMENT_TYPES.cash,
  // O PDV não é integrado ao provedor de PIX e não possui o E2E da transação.
  // Portanto a NFC-e informa PIX estático (20), que não requer o grupo card.
  PIX: PAYMENT_TYPES.pix_static,
  CREDIT_CARD: PAYMENT_TYPES.credit_card,
  DEBIT_CARD: PAYMENT_TYPES.debit_card,
  BANK_SLIP: '15',
  BANK_TRANSFER: '18',
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

const loadFiscalSettings = async (model: number = 65): Promise<FiscalSettings> => {
  const config = await prisma.fiscalConfig.findUnique({ where: { id: 'default' } });
  if (!config || !config.active) throw new Error('Emissao fiscal ainda nao esta ativada');
  if (model === 55) validateNfeSeries(config.nfeSeries);
  if (!config.certificatePfxEncrypted || !config.certificatePasswordEncrypted) {
    throw new Error('Certificado digital A1 nao configurado');
  }
  if (model === 65 && (!config.cscId || !config.cscTokenEncrypted)) throw new Error('CSC da NFC-e nao configurado');

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
    cscToken: config.cscTokenEncrypted ? decryptFiscalSecret(config.cscTokenEncrypted).toString('utf8') : null,
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
    return !(product?.ncm || settings.defaultNcm)
      || !(product?.cfop || settings.defaultCfop)
      || !(product?.icmsCst || settings.defaultIcmsCst)
      || !(product?.pisCst || settings.defaultPisCst)
      || !(product?.cofinsCst || settings.defaultCofinsCst);
  });
  if (invalid.length) {
    throw new Error(`Produtos sem configuracao fiscal: ${invalid.map((item: any) => item.product?.name || item.manualDescription || 'item avulso').join(', ')}`);
  }
};

const buildData = (document: any, settings: FiscalSettings): InvoiceBuildData => {
  const sale = document.sale;
  const snapshot = document.paymentSnapshot || {};
  const operation = snapshot.operation;
  if (snapshot.issuer) settings = { ...settings, ...snapshot.issuer };
  if (document.model === 55 && !operation) throw new Error('Dados de destino da NF-e ausentes');
  const grossTotal = document.items.reduce((sum: number, item: any) => sum + moneyToCents(item.totalPrice), 0);
  const documentTotal = moneyToCents(document.totalAmount);
  let remainingDiscount = Math.max(0, grossTotal - documentTotal);
  const items: InvoiceItemData[] = document.items.map((item: any, index: number) => {
    const totalPrice = moneyToCents(item.totalPrice);
    const icmsPercent = item.icmsRate == null ? 0 : Number(item.icmsRate);
    // O desconto da venda é repartido entre os itens em centavos. O último
    // item absorve qualquer arredondamento para que vNF e vPag coincidam.
    const itemDiscount = remainingDiscount > 0
      ? Math.min(totalPrice, index === document.items.length - 1
        ? remainingDiscount
        : Math.round((grossTotal ? totalPrice / grossTotal : 0) * Math.max(0, grossTotal - documentTotal)))
      : 0;
    remainingDiscount -= itemDiscount;
    validateCfop(item.cfop, document.model, operation?.destination ?? 1);
    const tax = snapshot.itemTaxes?.[index] || {};
    if (document.model === 55) validateNfeTax({ ...item, ...tax }, settings.taxRegime, operation.difal.applies, operation.destination);
    const base = totalPrice - itemDiscount;
    const uf = tax.difal;
    const pisRate = document.model === 55 ? resolveContributionRate(item.pisCst, tax.pisRate, settings.taxRegime, 'PIS') : Number(tax.pisRate || 0);
    const cofinsRate = document.model === 55 ? resolveContributionRate(item.cofinsCst, tax.cofinsRate, settings.taxRegime, 'COFINS') : Number(tax.cofinsRate || 0);
    const pisBase = document.model === 55 ? contributionBase(base, item.pisCst, pisRate, settings.taxRegime) : base;
    const cofinsBase = document.model === 55 ? contributionBase(base, item.cofinsCst, cofinsRate, settings.taxRegime) : base;
    return {
      icmsBase: base,
      icmsModBC: document.model === 55 ? 3 : undefined,
      pisVBC: pisBase, pisPPIS: Math.round(pisRate * 10000), pisVPIS: Math.round(pisBase * pisRate / 100),
      cofinsVBC: cofinsBase, cofinsPCOFINS: Math.round(cofinsRate * 10000), cofinsVCOFINS: Math.round(cofinsBase * cofinsRate / 100),
      icmsUfDest: operation?.difal.applies && uf ? {
        taxRegime: settings.taxRegime, orig: item.fiscalOrigin,
        vBCUFDest: moneyToCents(uf.base), vBCFCPUFDest: moneyToCents(uf.base),
        pICMSUFDest: Math.round(uf.internalRate * 100), pICMSInter: Math.round(uf.interstateRate * 100),
        pFCPUFDest: Math.round(uf.fcpRate * 100),
        vICMSUFDest: Math.round(moneyToCents(uf.base) * (uf.internalRate - uf.interstateRate) / 100),
        vFCPUFDest: Math.round(moneyToCents(uf.base) * uf.fcpRate / 100), vICMSUFRemet: 0,
      } : undefined,
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
      vDesc: itemDiscount || undefined,
      orig: item.fiscalOrigin,
      icmsCst: item.icmsCst,
      icmsRate: Math.round(icmsPercent * 100),
      icmsAmount: Math.round(base * icmsPercent / 100),
      pisCst: item.pisCst,
      cofinsCst: item.cofinsCst,
    };
  });
  const payments: PaymentData[] = [{
    method: paymentType(sale.paymentMethod),
    amount: moneyToCents(document.totalAmount),
  }];
  const isCardPayment = ['CREDIT_CARD', 'DEBIT_CARD'].includes(sale.paymentMethod);

  return {
    model: document.model,
    destination: operation?.destination ?? 1,
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
    consumerType: operation ? (operation.finalConsumer ? '1' : '0') : '1',
    buyerPresence: operation?.buyerPresence || (document.model === 55 ? '9' : '1'),
    printFormat: document.model === 55 ? '1' : '4',
    delivery: operation?.deliveryAddress ? { ...operation.deliveryAddress, number: operation.deliveryAddress.streetNumber, taxId: document.recipientTaxId, name: document.recipientName } : undefined,
    transport: operation ? { freightMode: operation.freightMode } : undefined,
    additionalInfo: snapshot.notes || operation?.difal.reason ? { taxpayerNote: [snapshot.notes, operation?.difal.reason].filter(Boolean).join(' - ') } : undefined,
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
      ...(operation?.address || {}),
      taxId: onlyDigits(document.recipientTaxId),
      name: settings.environment === 2
        ? HOMOLOGATION_RECIPIENT_NAME
        : fiscalText(document.recipientName || 'CONSUMIDOR'),
    } : undefined,
    items,
    payments,
    // O PDV registra a venda após confirmação manual na maquininha.
    // Para tPag 03/04, a SEFAZ exige o grupo card com tpIntegra.
    paymentCardDetails: isCardPayment ? [{ integType: '2' }] : undefined,
  };
};

const fullDocument = (id: string) => prisma.fiscalDocument.findUnique({
  where: { id },
  include: { sale: true, items: { orderBy: { itemNumber: 'asc' } }, events: true },
});

export const transmitFiscalDocument = async (documentId: string) => {
  const document = await fullDocument(documentId);
  if (!document) throw new Error('Documento fiscal nao encontrado');
  const settings = await loadFiscalSettings(document.model);
  if ((document.environment === 'PRODUCTION' ? 1 : 2) !== settings.environment) throw new Error('Ambiente atual diferente do documento; restaure o ambiente antes do reenvio');
  if (document.status === 'AUTHORIZED') return document;
  if (!['PENDING', 'ERROR', 'REJECTED'].includes(document.status)) throw new Error('Documento não pode ser retransmitido neste status');
  const snapshot = document.paymentSnapshot as any;
  if (snapshot?.issuer?.taxId && snapshot.issuer.taxId !== settings.taxId) throw new Error('CNPJ atual diferente do emitente original');

  const issuedAt = new Date();
  await prisma.fiscalDocument.update({
    where: { id: documentId },
    data: { status: 'PROCESSING', issuedAt },
  });
  try {
    const data = buildData({ ...document, issuedAt }, settings);
    const built = buildInvoiceXml(data);
    const certificate = loadCertificate(settings.certificatePfx!, settings.certificatePassword!);
    let signedXml = signXml(built.xml, certificate.privateKey, certificate.certificate);
    if (document.model === 65) {
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
        version: '300',
        qrCodeBaseUrl: DF_NFCE_QRCODE_URL,
        urlChave: consultationUrl,
      });
    }
    const url = getSefazUrl(settings.stateCode, 'NfeAutorizacao', settings.environment, false, document.model as 55 | 65);
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
  for (const item of sale.items) validateCfop(item.product?.cfop || settings.defaultCfop, 65, 1);

  const document = await prisma.$transaction(async (tx) => {
    const config = await tx.fiscalConfig.update({
      where: { id: 'default' },
      data: { nextNfceNumber: { increment: 1 } },
      select: { nfceSeries: true, nextNfceNumber: true, environment: true },
    });
    const number = config.nextNfceNumber - 1;
    return tx.fiscalDocument.create({
      data: {
        saleId: sale.id,
        model: 65,
        series: config.nfceSeries,
        number,
        environment: config.environment,
        recipientTaxId: sale.customerTaxId,
        recipientName: fiscalText(sale.leadName) || null,
        totalAmount: new Prisma.Decimal(sale.total),
        paymentSnapshot: { method: sale.paymentMethod, total: sale.total },
        items: {
          create: sale.items.map((item, index) => ({
            productId: item.productId || null,
            itemNumber: index + 1,
            productCode: item.product?.barcode || item.manualBarcode || item.productId || `AVULSO-${index + 1}`,
            description: item.product?.name || item.manualDescription || 'PRODUTO',
            ncm: item.product?.ncm || settings.defaultNcm,
            cest: item.product?.cest,
            cfop: item.product?.cfop || settings.defaultCfop,
            unitOfMeasure: item.product?.unitOfMeasure || 'UN',
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.total),
            fiscalOrigin: item.product?.fiscalOrigin || '0',
            icmsCst: item.product?.icmsCst || settings.defaultIcmsCst,
            icmsRate: item.product?.icmsRate,
            pisCst: item.product?.pisCst || settings.defaultPisCst,
            cofinsCst: item.product?.cofinsCst || settings.defaultCofinsCst,
          })),
        },
      },
    });
  });
  return transmitFiscalDocument(document.id);
};

export const issueManualNfce = (input: ManualNfceInput, adminUserId: string) => issueManualDocument(input, adminUserId, 65);
export const issueManualNfe = (input: ManualNfceInput, adminUserId: string) => issueManualDocument(input, adminUserId, 55);
const issueManualDocument = async (input: ManualNfceInput, adminUserId: string, model: 55 | 65) => {
  const settings = await loadFiscalSettings(model);
  const operation = model === 55 ? validateOperation(input, settings.stateCode, settings.taxRegime) : undefined;
  if (model === 65 && input.recipientAddress && input.recipientAddress.stateCode !== settings.stateCode) throw new Error('Envio interestadual exige NF-e');
  const recipientName = fiscalText(input.recipientName);
  const recipientTaxId = onlyDigits(input.recipientTaxId);
  const notes = String(input.notes || '').trim().slice(0, 4000);
  if (model === 55 && (!recipientName || ![11, 14].includes(recipientTaxId.length))) throw new Error('NF-e exige nome e CPF/CNPJ do destinatário');

  if (!MANUAL_PAYMENT_METHODS.has(input.paymentMethod)) {
    throw new Error('Forma de pagamento invalida');
  }
  if (recipientTaxId && ![11, 14].includes(recipientTaxId.length)) {
    throw new Error('CPF/CNPJ do destinatario invalido');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Adicione pelo menos um item para emitir a NFC-e');
  }
  if (input.items.length > 50) {
    throw new Error('A NFC-e avulsa permite no maximo 50 itens');
  }

  const items = input.items.map((rawItem, index) => {
    const fallbackProductCode = `ITEM${String(index + 1).padStart(3, '0')}`;
    const description = String(rawItem.description || '').trim();
    const quantity = Number(rawItem.quantity);
    const unitPrice = Number(rawItem.unitPrice);
    const ncm = onlyDigits(rawItem.ncm) || settings.defaultNcm;
    const cest = onlyDigits(rawItem.cest) || null;
    const cfop = onlyDigits(rawItem.cfop) || (operation ? resolveDefaultCfop(settings.defaultCfop, operation.destination, operation.address.taxpayerIndicator) : settings.defaultCfop);
    if (!cfop) throw new Error(`Item ${index + 1}: informe CFOP ou configure um padrão de venda compatível na Central Fiscal`);
    const icmsCst = String(rawItem.icmsCst || settings.defaultIcmsCst || '').trim();
    const pisCst = String(rawItem.pisCst || settings.defaultPisCst || '').trim();
    const cofinsCst = String(rawItem.cofinsCst || settings.defaultCofinsCst || '').trim();
    const unitOfMeasure = String(rawItem.unitOfMeasure || 'UN').trim().toUpperCase();
    const fiscalOrigin = String(rawItem.fiscalOrigin || '0').trim();

    if (description.length < 2 || description.length > 120) {
      throw new Error(`Item ${index + 1}: a descricao deve ter entre 2 e 120 caracteres`);
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999) {
      throw new Error(`Item ${index + 1}: quantidade invalida`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 9999999.99) {
      throw new Error(`Item ${index + 1}: preco unitario invalido`);
    }
    if (!/^\d{8}$/.test(ncm)) throw new Error(`Item ${index + 1}: NCM invalido`);
    validateCfop(cfop, model, operation?.destination ?? 1);
    if (model === 55) {
      const allowed = operation!.destination === 1 ? ['5101', '5102'] : operation!.address.taxpayerIndicator === '9' ? ['6107', '6108'] : ['6101', '6102'];
      if (!allowed.includes(cfop)) throw new Error('Este fluxo suporta venda de produção própria ou revenda: confira CFOP e condição de contribuinte com o contador');
    }
    if (model === 55) validateNfeTax({ ...rawItem, icmsCst, pisCst, cofinsCst, fiscalOrigin }, settings.taxRegime, operation!.difal.applies, operation!.destination);
    if (!icmsCst || !pisCst || !cofinsCst) {
      throw new Error(`Item ${index + 1}: tributacao incompleta na Central Fiscal`);
    }
    if (!/^[A-Z]{1,6}$/.test(unitOfMeasure)) {
      throw new Error(`Item ${index + 1}: unidade de medida invalida`);
    }

    const totalPrice = roundMoney(quantity * roundMoney(unitPrice));
    return {
      productCode: String(rawItem.productCode || fallbackProductCode)
        .trim()
        .replace(/[^A-Za-z0-9._-]/g, '')
        .slice(0, 60) || fallbackProductCode,
      description,
      quantity,
      unitPrice: roundMoney(unitPrice),
      totalPrice,
      ncm,
      cest,
      cfop,
      unitOfMeasure,
      fiscalOrigin,
      icmsCst,
      icmsRate: rawItem.icmsRate == null ? null : Number(rawItem.icmsRate),
      pisCst,
      cofinsCst,
    };
  });

  const total = roundMoney(items.reduce((sum, item) => sum + item.totalPrice, 0));
  if (total <= 0) throw new Error('O valor total da NFC-e deve ser maior que zero');

  const document = await prisma.$transaction(async (tx) => {
    const config = await tx.fiscalConfig.update({
      where: { id: 'default' },
      data: model === 55 ? { nextNfeNumber: { increment: 1 } } : { nextNfceNumber: { increment: 1 } },
      select: { nfceSeries: true, nfeSeries: true, nextNfceNumber: true, nextNfeNumber: true, environment: true },
    });
    if ((config.environment === 'PRODUCTION' ? 1 : 2) !== settings.environment) throw new Error('Ambiente fiscal alterado durante emissão; revise antes de emitir');
    const number = (model === 55 ? config.nextNfeNumber : config.nextNfceNumber) - 1;
    const saleNumber = `FA${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        leadName: recipientName || null,
        customerTaxId: recipientTaxId || null,
        sellerId: adminUserId,
        subtotal: total,
        discount: 0,
        total,
        status: 'PAID',
        paymentMethod: input.paymentMethod,
        notes: `[FISCAL_MANUAL]${notes ? ` ${notes}` : ''}`,
        paidAt: new Date(),
      },
    });

    return tx.fiscalDocument.create({
      data: {
        saleId: sale.id,
        model,
        series: model === 55 ? config.nfeSeries : config.nfceSeries,
        number,
        environment: config.environment,
        operationNature: 'VENDA',
        recipientTaxId: recipientTaxId || null,
        recipientName: recipientName || null,
        totalAmount: new Prisma.Decimal(total),
        paymentSnapshot: JSON.parse(JSON.stringify({
          method: input.paymentMethod,
          total,
          source: 'MANUAL_ADMIN',
          notes,
          issuer: Object.fromEntries(['companyName', 'tradeName', 'taxId', 'stateTaxId', 'taxRegime', 'stateCode', 'cityCode', 'cityName', 'street', 'streetNumber', 'district', 'zipCode', 'addressComplement'].map(key => [key, (settings as any)[key]])),
          ...(operation ? { operation, itemTaxes: input.items.map((item, index) => ({
            pisRate: resolveContributionRate(items[index].pisCst, item.pisRate, settings.taxRegime, 'PIS'),
            cofinsRate: resolveContributionRate(items[index].cofinsCst, item.cofinsRate, settings.taxRegime, 'COFINS'),
            ...(operation.difal.applies && item.difal ? { difal: item.difal } : {}),
          })) } : {}),
          issuedBy: adminUserId,
        })),
        items: {
          create: items.map((item, index) => ({
            itemNumber: index + 1,
            productCode: item.productCode,
            description: item.description,
            ncm: item.ncm,
            cest: item.cest,
            cfop: item.cfop,
            unitOfMeasure: item.unitOfMeasure,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.totalPrice),
            fiscalOrigin: item.fiscalOrigin,
            icmsCst: item.icmsCst,
            icmsRate: item.icmsRate == null ? null : new Prisma.Decimal(item.icmsRate),
            pisCst: item.pisCst,
            cofinsCst: item.cofinsCst,
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
  const document = await fullDocument(documentId);
  if (!document || document.status !== 'AUTHORIZED' || !document.accessKey || !document.protocolNumber) {
    throw new Error('Somente uma NFC-e autorizada pode ser cancelada');
  }
  const settings = await loadFiscalSettings(document.model);
  if ((document.environment === 'PRODUCTION' ? 1 : 2) !== settings.environment) throw new Error('Ambiente atual diferente do documento');
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
    url: getSefazUrl(settings.stateCode, 'RecepcaoEvento', settings.environment, false, document.model as 55 | 65),
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
