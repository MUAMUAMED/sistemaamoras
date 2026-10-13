import { STATE_IBGE_CODES } from '../vendor/finopenpos-fiscal/state-codes';

export interface RecipientAddress {
  stateCode: string; cityCode: string; cityName: string; street: string;
  streetNumber: string; district: string; zipCode: string; complement?: string;
  stateTaxId?: string; taxpayerIndicator: '1' | '2' | '9';
}

export interface FiscalOperationInput {
  recipientAddress?: RecipientAddress;
  finalConsumer?: boolean;
  freightMode?: string;
  difal?: { applies: boolean; reason?: string };
}

const digits = (value: unknown) => String(value || '').replace(/\D/g, '');
export const validateCfop = (cfop: string, model: number, destination: number) => {
  if (!/^\d{4}$/.test(cfop)) throw new Error('CFOP deve ter quatro dígitos');
  if (model === 65 && !['5101', '5102', '5103', '5104', '5115', '5405', '5656', '5667', '5933'].includes(cfop)) {
    throw new Error('CFOP incompatível com NFC-e. Para envio a outra UF, selecione NF-e interestadual.');
  }
  if (model === 55 && cfop[0] !== (destination === 2 ? '6' : '5')) {
    throw new Error(`CFOP incompatível com o destino: informe um código iniciado com ${destination === 2 ? '6' : '5'}`);
  }
};

export function validateOperation(input: FiscalOperationInput, issuerState: string, taxRegime: number) {
  if (!input.recipientAddress) throw new Error('Informe o endereço completo do destinatário');
  const a = input.recipientAddress;
  const stateCode = String(a.stateCode || '').trim().toUpperCase();
  if (!STATE_IBGE_CODES[stateCode]) throw new Error('UF do destinatário inválida');
  const cityCode = digits(a.cityCode);
  if (!/^\d{7}$/.test(cityCode) || !cityCode.startsWith(STATE_IBGE_CODES[stateCode])) {
    throw new Error('Código IBGE do município incompatível com a UF do destinatário');
  }
  if (!/^\d{8}$/.test(digits(a.zipCode))) throw new Error('CEP do destinatário inválido');
  const address: RecipientAddress = {
    stateCode, cityCode, zipCode: digits(a.zipCode), taxpayerIndicator: a.taxpayerIndicator,
    cityName: '', street: '', streetNumber: '', district: '',
  };
  for (const key of ['cityName', 'street', 'streetNumber', 'district'] as const) {
    const value = String(a[key] || '').trim();
    if (!value || value.length > 60) throw new Error(`Preencha ${key} do destinatário (até 60 caracteres)`);
    address[key] = value;
  }
  if (!['1', '2', '9'].includes(a.taxpayerIndicator)) throw new Error('Informe a condição de contribuinte do destinatário');
  if (a.taxpayerIndicator === '1') {
    address.stateTaxId = digits(a.stateTaxId);
    if (!/^\d{2,14}$/.test(address.stateTaxId)) throw new Error('Informe a inscrição estadual do contribuinte');
  } else if (String(a.stateTaxId || '').trim()) {
    throw new Error('Inscrição estadual deve ser informada somente para contribuinte');
  }
  if (a.complement) address.complement = String(a.complement).trim().slice(0, 60);
  if (typeof input.finalConsumer !== 'boolean') throw new Error('Informe se o cliente é consumidor final');
  if (a.taxpayerIndicator === '9' && !input.finalConsumer) throw new Error('Não contribuinte deve ser consumidor final');
  if (!['0', '1', '2', '3', '4', '9'].includes(String(input.freightMode))) throw new Error('Informe a modalidade do transporte');
  const destination = stateCode === issuerState ? 1 : 2;
  if (!input.difal || typeof input.difal.applies !== 'boolean') throw new Error('Informe o tratamento do DIFAL confirmado com o contador');
  const eligibleDifal = destination === 2 && input.finalConsumer && a.taxpayerIndicator === '9';
  if (input.difal.applies && (!eligibleDifal || taxRegime === 1)) {
    throw new Error('Grupo ICMSUFDest incompatível com esta operação/regime tributário');
  }
  if (!input.difal.applies && eligibleDifal && !String(input.difal.reason || '').trim()) {
    throw new Error('Informe o fundamento para não destacar DIFAL nesta venda');
  }
  return { address, destination: destination as 1 | 2, finalConsumer: input.finalConsumer,
    freightMode: String(input.freightMode), difal: { applies: input.difal.applies, reason: String(input.difal.reason || '').trim().slice(0, 500) } };
}

export const requireRate = (value: unknown, label: string, allowed?: number[]) => {
  if (value === undefined || value === null || value === '') throw new Error(`Informe ${label}`);
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100 || (allowed && !allowed.includes(rate))) {
    throw new Error(`${label} inválida`);
  }
  return rate;
};

export function validateNfeTax(item: any, regime: number, difal: boolean) {
  // Outros CST exigem crédito, ST, redução ou desoneração que este fluxo não calcula.
  const supported = regime === 1 ? ['102', '103', '300', '400'] : ['00', '41'];
  if (!supported.includes(item.icmsCst)) throw new Error(`CST/CSOSN ${item.icmsCst} exige campos fiscais ainda não suportados neste emissor de NF-e`);
  if (!/^[0-8]$/.test(item.fiscalOrigin)) throw new Error('Origem da mercadoria inválida');
  if (item.icmsCst === '00') requireRate(item.icmsRate, 'alíquota do ICMS', [4, 7, 12]);
  for (const tax of ['pis', 'cofins']) {
    const cst = item[`${tax}Cst`];
    if (!['01', '02', '04', '05', '06', '07', '08', '09', '49', '99'].includes(cst)) throw new Error(`CST de ${tax.toUpperCase()} não suportado`);
    if (['01', '02', '49', '99'].includes(cst)) requireRate(item[`${tax}Rate`], `alíquota de ${tax.toUpperCase()}`);
  }
  if (difal) {
    if (!item.difal) throw new Error('Preencha base e alíquotas do DIFAL em cada item');
    const base = Number(item.difal.base);
    if (!Number.isFinite(base) || base <= 0) throw new Error('Base de cálculo do DIFAL inválida');
    const internal = requireRate(item.difal.internalRate, 'alíquota interna da UF de destino');
    const interstate = requireRate(item.difal.interstateRate, 'alíquota interestadual', [4, 7, 12]);
    requireRate(item.difal.fcpRate, 'alíquota de FCP');
    if (internal < interstate) throw new Error('Alíquota interna inferior à interestadual; revise o tratamento do DIFAL');
  }
}

export function validateNfeSeries(series: number) {
  if (!Number.isInteger(series) || series < 1 || series > 889) {
    throw new Error('A série da NF-e deste emissor deve estar entre 1 e 889; séries especiais não são suportadas');
  }
}
