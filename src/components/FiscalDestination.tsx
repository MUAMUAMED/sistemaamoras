import React from 'react';
import type { FiscalConfig } from '../types';

type DeliveryAddress = Omit<FiscalOperation['recipientAddress'], 'stateTaxId' | 'taxpayerIndicator'>;

export interface FiscalOperation {
  recipientAddress: {
    stateCode: string; cityCode: string; cityName: string; street: string;
    streetNumber: string; district: string; zipCode: string; complement: string;
    stateTaxId: string; taxpayerIndicator: '' | '1' | '2' | '9';
  };
  deliveryAddress?: DeliveryAddress;
  finalConsumer: boolean | null;
  freightMode: string;
  buyerPresence?: string;
  difal: { applies: boolean | null; reason: string };
}

export const emptyFiscalOperation: FiscalOperation = {
  recipientAddress: { stateCode: '', cityCode: '', cityName: '', street: '', streetNumber: '', district: '', zipCode: '', complement: '', stateTaxId: '', taxpayerIndicator: '' },
  finalConsumer: null, freightMode: '', difal: { applies: null, reason: '' },
};

export function automaticDifal(value: FiscalOperation, config?: FiscalConfig | null) {
  return config?.taxRegime === 1 || value.finalConsumer === false || (!!value.recipientAddress.taxpayerIndicator && value.recipientAddress.taxpayerIndicator !== '9') || (!!config && (value.deliveryAddress?.stateCode || value.recipientAddress.stateCode) === config.stateCode);
}

export default function FiscalDestination({ value, onChange, config }: { value: FiscalOperation; onChange: (value: FiscalOperation) => void; config?: FiscalConfig | null }) {
  const input = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm';
  const address = value.recipientAddress;
  const noDifal = automaticDifal(value, config);
  const setAddress = (key: keyof FiscalOperation['recipientAddress'], field: string) => onChange({ ...value, recipientAddress: { ...address, ...(key === 'zipCode' && field !== address.zipCode ? { stateCode: '', cityCode: '', cityName: '', street: '', district: '', streetNumber: '', complement: '' } : {}), [key]: field } });
  return <section className="border border-gray-200 bg-white p-5 space-y-4">
    <h2 className="font-semibold">Destino e tributação da NF-e</h2>
    <p className="text-sm text-gray-600">Confira o endereço cadastral da cliente. Para revenda, utilize NF-e e informe abaixo se a entrega ocorrer em outro endereço.</p>
    <button type="button" className="text-sm font-semibold text-indigo-700 underline" onClick={() => onChange({ ...value, finalConsumer: false, buyerPresence: '9', freightMode: '3', difal: { applies: false, reason: '' } })}>Revenda com transporte próprio e frete gratuito</button>
    {config && <button type="button" className="block text-sm font-semibold text-indigo-700 underline" onClick={() => {
      const { stateCode, cityCode, cityName, street, streetNumber, district, zipCode } = config;
      onChange({ ...value, finalConsumer: false, buyerPresence: '1', freightMode: '9', difal: { applies: false, reason: '' }, deliveryAddress: { stateCode, cityCode, cityName, street, streetNumber, district, zipCode, complement: config.addressComplement || '' } });
    }}>Revenda com retirada presencial na loja</button>}
    <div className="grid gap-4 md:grid-cols-3">
      <label className="text-sm">UF do destinatário<select required className={input} value={address.stateCode} onChange={e => setAddress('stateCode', e.target.value)}><option value="">Selecione</option>{'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map(uf => <option key={uf}>{uf}</option>)}</select></label>
      {([['cityName', 'Município'], ['cityCode', 'Código IBGE (7 dígitos)'], ['zipCode', 'CEP'], ['street', 'Logradouro'], ['streetNumber', 'Número'], ['district', 'Bairro'], ['complement', 'Complemento']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input required={key !== 'complement'} className={input} value={address[key]} maxLength={key === 'zipCode' ? 9 : key === 'cityCode' ? 7 : 60} onChange={e => setAddress(key, ['zipCode', 'cityCode'].includes(key) ? e.target.value.replace(/\D/g, '') : e.target.value)} /></label>)}
      <label className="text-sm">Contribuinte de ICMS<select required className={input} value={address.taxpayerIndicator} onChange={e => onChange({ ...value, finalConsumer: e.target.value === '9' ? true : value.finalConsumer, recipientAddress: { ...address, taxpayerIndicator: e.target.value as '' | '1' | '2' | '9', stateTaxId: e.target.value === '1' ? address.stateTaxId : '' } })}><option value="">Selecione</option><option value="9">Não contribuinte</option><option value="1">Contribuinte com IE</option><option value="2">Contribuinte isento de IE</option></select></label>
      {address.taxpayerIndicator === '1' && <label className="text-sm">Inscrição estadual<input required className={input} value={address.stateTaxId} maxLength={14} onChange={e => setAddress('stateTaxId', e.target.value.replace(/\D/g, ''))} /></label>}
      <label className="text-sm">Finalidade da compra<select className={input} required value={value.finalConsumer === null ? '' : String(value.finalConsumer)} onChange={e => onChange({ ...value, finalConsumer: e.target.value === '' ? null : e.target.value === 'true' })}><option value="">Selecione</option><option value="true">Consumidor final</option>{address.taxpayerIndicator !== '9' && <option value="false">Revenda / industrialização</option>}</select></label>
      <label className="text-sm">Presença na compra<select className={input} value={value.buyerPresence || '9'} onChange={e => onChange({ ...value, buyerPresence: e.target.value })}><option value="1">Presencial na loja</option><option value="2">Não presencial — internet</option><option value="3">Não presencial — teleatendimento</option><option value="4">Não presencial com entrega</option><option value="5">Presencial fora da loja</option><option value="9">Não presencial — outros</option></select></label>
      <label className="text-sm">Transporte<select required className={input} value={value.freightMode} onChange={e => onChange({ ...value, freightMode: e.target.value })}><option value="">Selecione</option><option value="0">Frete por conta do emitente</option><option value="1">Frete por conta do destinatário</option><option value="2">Frete por conta de terceiros</option><option value="3">Transporte próprio do emitente</option><option value="4">Transporte próprio do destinatário</option><option value="9">Sem transporte</option></select></label>
      {!noDifal && <label className="text-sm">DIFAL no XML<select className={input} required value={value.difal.applies === null ? '' : String(value.difal.applies)} onChange={e => onChange({ ...value, difal: { ...value.difal, applies: e.target.value === '' ? null : e.target.value === 'true' } })}><option value="">Selecione</option><option value="false">Não destacar, conforme enquadramento</option><option value="true">Destacar DIFAL e FCP</option></select></label>}
    </div>
    {!noDifal && value.difal.applies === false && <label className="block text-sm">Fundamento para não destacar DIFAL<input required={address.taxpayerIndicator === '9' && value.finalConsumer === true} className={input} value={value.difal.reason} maxLength={500} placeholder="Informe a orientação do contador para esta operação" onChange={e => onChange({ ...value, difal: { ...value.difal, reason: e.target.value } })} /></label>}
    {noDifal && <p className="text-sm text-gray-600">DIFAL no XML: sem destaque automático para esta operação/enquadramento. Eventual recolhimento por guia deve seguir a orientação contábil.</p>}
    <div className="border-t border-gray-200 pt-4 space-y-3">
      <label className="block text-sm">Local da entrega<select className={input} value={value.deliveryAddress ? 'OTHER' : 'RECIPIENT'} onChange={e => onChange({ ...value, deliveryAddress: e.target.value === 'OTHER' ? { ...emptyFiscalOperation.recipientAddress } : undefined })}><option value="RECIPIENT">Mesmo endereço da cliente</option><option value="OTHER">Outro endereço</option></select></label>
      {config && <button type="button" className="text-sm font-semibold text-indigo-700 underline" onClick={() => {
        const { stateCode, cityCode, cityName, street, streetNumber, district, zipCode } = config;
        onChange({ ...value, deliveryAddress: { stateCode, cityCode, cityName, street, streetNumber, district, zipCode, complement: config.addressComplement || '' } });
      }}>Entrega na loja — usar endereço do emitente</button>}
      {value.deliveryAddress && <div className="grid gap-4 md:grid-cols-3">
        {(['stateCode', 'cityName', 'cityCode', 'zipCode', 'street', 'streetNumber', 'district', 'complement'] as const).map((key, i) => <label key={key} className="text-sm">{['UF da entrega', 'Município da entrega', 'IBGE da entrega', 'CEP da entrega', 'Logradouro da entrega', 'Número da entrega', 'Bairro da entrega', 'Complemento da entrega'][i]}<input required={key !== 'complement'} className={input} value={value.deliveryAddress![key]} maxLength={key === 'stateCode' ? 2 : key === 'zipCode' ? 8 : key === 'cityCode' ? 7 : 60} onChange={e => onChange({ ...value, deliveryAddress: { ...value.deliveryAddress!, [key]: ['zipCode', 'cityCode'].includes(key) ? e.target.value.replace(/\D/g, '') : key === 'stateCode' ? e.target.value.toUpperCase() : e.target.value } })} /></label>)}
      </div>}
    </div>
    <p className="text-xs text-gray-500">Este fluxo não adiciona frete ao valor da nota. O recolhimento por guia, quando devido, deve seguir a orientação contábil.</p>
  </section>;
}
