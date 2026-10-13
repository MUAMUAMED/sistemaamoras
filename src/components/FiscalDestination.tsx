import React from 'react';

export interface FiscalOperation {
  recipientAddress: {
    stateCode: string; cityCode: string; cityName: string; street: string;
    streetNumber: string; district: string; zipCode: string; complement: string;
    stateTaxId: string; taxpayerIndicator: '1' | '2' | '9';
  };
  finalConsumer: boolean;
  freightMode: string;
  difal: { applies: boolean; reason: string };
}

export const emptyFiscalOperation: FiscalOperation = {
  recipientAddress: { stateCode: '', cityCode: '', cityName: '', street: '', streetNumber: '', district: '', zipCode: '', complement: '', stateTaxId: '', taxpayerIndicator: '9' },
  finalConsumer: true, freightMode: '0', difal: { applies: false, reason: '' },
};

export default function FiscalDestination({ value, onChange }: { value: FiscalOperation; onChange: (value: FiscalOperation) => void }) {
  const input = 'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm';
  const address = value.recipientAddress;
  const setAddress = (key: keyof FiscalOperation['recipientAddress'], field: string) => onChange({ ...value, recipientAddress: { ...address, [key]: field } });
  return <section className="border border-gray-200 bg-white p-5 space-y-4">
    <h2 className="font-semibold">Destino e tributação da NF-e</h2>
    <p className="text-sm text-gray-600">Informe o local de entrega. Para compra no balcão com retirada no DF, utilize NFC-e local. Confirme CFOP, CST/CSOSN e tratamento do DIFAL com o contador.</p>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="text-sm">UF de entrega<select required className={input} value={address.stateCode} onChange={e => setAddress('stateCode', e.target.value)}><option value="">Selecione</option>{'AC AL AP AM BA CE ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map(uf => <option key={uf}>{uf}</option>)}</select></label>
      {([['cityName', 'Município'], ['cityCode', 'Código IBGE (7 dígitos)'], ['zipCode', 'CEP'], ['street', 'Logradouro'], ['streetNumber', 'Número'], ['district', 'Bairro'], ['complement', 'Complemento']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input required={key !== 'complement'} className={input} value={address[key]} maxLength={key === 'zipCode' ? 8 : key === 'cityCode' ? 7 : 60} onChange={e => setAddress(key, ['zipCode', 'cityCode'].includes(key) ? e.target.value.replace(/\D/g, '') : e.target.value)} /></label>)}
      <label className="text-sm">Contribuinte de ICMS<select className={input} value={address.taxpayerIndicator} onChange={e => onChange({ ...value, finalConsumer: e.target.value === '9' ? true : value.finalConsumer, recipientAddress: { ...address, taxpayerIndicator: e.target.value as '1' | '2' | '9', stateTaxId: '' } })}><option value="9">Não contribuinte</option><option value="1">Contribuinte com IE</option><option value="2">Contribuinte isento de IE</option></select></label>
      {address.taxpayerIndicator === '1' && <label className="text-sm">Inscrição estadual<input required className={input} value={address.stateTaxId} maxLength={14} onChange={e => setAddress('stateTaxId', e.target.value.replace(/\D/g, ''))} /></label>}
      <label className="text-sm">Finalidade da compra<select className={input} value={String(value.finalConsumer)} onChange={e => onChange({ ...value, finalConsumer: e.target.value === 'true' })}><option value="true">Consumidor final</option>{address.taxpayerIndicator !== '9' && <option value="false">Revenda / industrialização</option>}</select></label>
      <label className="text-sm">Transporte<select className={input} value={value.freightMode} onChange={e => onChange({ ...value, freightMode: e.target.value })}><option value="0">Frete por conta do emitente</option><option value="1">Frete por conta do destinatário</option><option value="2">Frete por conta de terceiros</option><option value="3">Transporte próprio do emitente</option><option value="4">Transporte próprio do destinatário</option><option value="9">Sem transporte</option></select></label>
      <label className="text-sm">DIFAL no XML<select className={input} value={String(value.difal.applies)} onChange={e => onChange({ ...value, difal: { ...value.difal, applies: e.target.value === 'true' } })}><option value="false">Não destacar, conforme enquadramento</option><option value="true">Destacar DIFAL e FCP</option></select></label>
    </div>
    {!value.difal.applies && <label className="block text-sm">Fundamento para não destacar DIFAL<input required={address.taxpayerIndicator === '9' && value.finalConsumer} className={input} value={value.difal.reason} maxLength={500} placeholder="Informe a orientação do contador para esta operação" onChange={e => onChange({ ...value, difal: { ...value.difal, reason: e.target.value } })} /></label>}
    <p className="text-xs text-gray-500">Este fluxo não adiciona frete ao valor da nota. O recolhimento por guia, quando devido, deve seguir a orientação contábil.</p>
  </section>;
}
