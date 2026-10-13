import React from 'react';
import type { FiscalDanfe } from '../types';

// Code 128C: pares numéricos, início 105, checksum módulo 103 e parada 106.
const patterns = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
export function accessKeyBars(key: string) {
  if (!/^\d{44}$/.test(key)) return { bars: [] as Array<{ x: number; width: number }>, width: 1 };
  const codes = [105, ...key.match(/\d{2}/g)!.map(Number)];
  codes.push(codes.reduce((sum, code, index) => sum + code * (index || 1), 0) % 103, 106);
  let x = 10;
  const bars: Array<{ x: number; width: number }> = [];
  for (const code of codes) {
    const pattern = patterns[code];
    for (let index = 0; index < pattern.length; index++) {
      const width = Number(pattern[index]);
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    }
  }
  return { bars, width: x + 10 };
}
const number = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const Cell = ({ label, children }: { label: string; children?: React.ReactNode }) => <div className="nfe-cell"><small>{label}</small><div>{children || '—'}</div></div>;

export default function DanfeNfe({ document }: { document: FiscalDanfe }) {
  const snapshot = document.fiscalSnapshot;
  const a = snapshot?.operation?.address;
  const totals = document.fiscalTotals || {};
  const barcode = accessKeyBars(document.accessKey);
  const pages = Array.from({ length: Math.max(1, Math.ceil(document.items.length / 8)) }, (_, i) => document.items.slice(i * 8, (i + 1) * 8));
  return <main id="danfe-document" className="nfe-document mx-auto bg-white text-black">
    <style>{`
      .nfe-document { width:190mm; max-width:none; font-family:Arial,sans-serif; font-size:10px; line-height:1.2; }
      .nfe-page { width:190mm; min-height:270mm; padding:3mm; background:white; box-sizing:border-box; page-break-after:always; }
      .nfe-page:last-child { page-break-after:auto; }
      .nfe-cell { border:1px solid black; padding:3px; min-width:0; overflow-wrap:anywhere; }
      .nfe-cell small { display:block; font-size:7px; text-transform:uppercase; margin-bottom:3px; }
      .nfe-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); }
      .nfe-heading { margin-top:8px; font-size:9px; font-weight:bold; text-transform:uppercase; }
      .nfe-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:8px; }
      .nfe-table th,.nfe-table td { border:1px solid black; padding:4px 2px; overflow-wrap:anywhere; vertical-align:top; }
      @media print { @page { size:A4 portrait; margin:8mm; } body * { visibility:hidden; } .nfe-document,.nfe-document * { visibility:visible; } .nfe-document { position:absolute; top:0; left:0; } .danfe-no-print { display:none!important; } }
    `}</style>
    {pages.map((items, index) => <article data-nfe-page key={index} className="nfe-page">
      <div className="nfe-cell">RECEBEMOS DE {document.issuer.companyName} OS PRODUTOS CONSTANTES DA NF-e Nº {document.number}, SÉRIE {document.series}<div className="mt-4 flex justify-between"><span>DATA DE RECEBIMENTO: ____/____/______</span><span>IDENTIFICAÇÃO E ASSINATURA: _______________________</span></div></div>
      <div className="grid mt-2" style={{ gridTemplateColumns: '30% 20% 50%' }}>
        <div className="nfe-cell"><strong>{document.issuer.companyName}</strong><p className="mt-2">{document.issuer.street}, {document.issuer.streetNumber} {document.issuer.addressComplement}</p><p>{document.issuer.district} — {document.issuer.cityName}/{document.issuer.stateCode}</p><p>CEP {document.issuer.zipCode}</p></div>
        <div className="nfe-cell text-center"><strong className="text-base">DANFE</strong><p>Documento Auxiliar da Nota Fiscal Eletrônica</p><p className="my-2">0 — ENTRADA<br />1 — SAÍDA: <strong>1</strong></p><strong>Nº {document.number}<br />SÉRIE {document.series}</strong><p>FOLHA {index + 1}/{pages.length}</p></div>
        <div className="nfe-cell"><svg role="img" aria-label="Código de barras da chave de acesso" width="100%" height="48" viewBox={`0 0 ${barcode.width} 48`} preserveAspectRatio="none">{barcode.bars.map((bar, i) => <rect key={i} x={bar.x} width={bar.width} y="0" height="48" fill="black" />)}</svg><small className="mt-1">CHAVE DE ACESSO</small><strong>{document.accessKey.replace(/(.{4})/g, '$1 ').trim()}</strong><p className="mt-2">Consulta de autenticidade no portal nacional da NF-e<br />www.nfe.fazenda.gov.br/portal</p></div>
      </div>
      <div className="nfe-grid"><Cell label="Natureza da operação">{document.operationNature}</Cell><Cell label="Protocolo de autorização">{document.protocolNumber}</Cell><Cell label="Data de autorização">{document.authorizedAt && new Date(document.authorizedAt).toLocaleString('pt-BR')}</Cell><Cell label="Inscrição estadual">{document.issuer.stateTaxId}</Cell><Cell label="Inscrição estadual do substituto tributário" /><Cell label="CNPJ">{document.issuer.taxId}</Cell></div>
      {document.environment === 'HOMOLOGATION' && <p className="my-2 text-center font-bold">EMITIDA EM HOMOLOGAÇÃO — SEM VALOR FISCAL</p>}
      <h3 className="nfe-heading">Destinatário / remetente</h3>
      <div className="nfe-grid"><Cell label="Nome / razão social">{document.recipientName}</Cell><Cell label="CPF / CNPJ">{document.recipientTaxId}</Cell><Cell label="Data de emissão">{new Date(document.issuedAt).toLocaleString('pt-BR')}</Cell><Cell label="Endereço">{a && `${a.street}, ${a.streetNumber} ${a.complement || ''}`}</Cell><Cell label="Bairro">{a?.district}</Cell><Cell label="CEP">{a?.zipCode}</Cell><Cell label="Município / UF">{a && `${a.cityName}/${a.stateCode}`}</Cell><Cell label="Inscrição estadual">{a?.stateTaxId || (a?.taxpayerIndicator === '2' ? 'ISENTO' : 'NÃO CONTRIBUINTE')}</Cell><Cell label="Data / hora saída" /></div>
      <h3 className="nfe-heading">Cálculo do imposto</h3>
      <div className="nfe-grid">{[['vBC', 'Base ICMS'], ['vICMS', 'Valor ICMS'], ['vProd', 'Valor dos produtos'], ['vBCST', 'Base ICMS ST'], ['vST', 'Valor ICMS ST'], ['vIPI', 'Valor IPI'], ['vFrete', 'Frete'], ['vSeg', 'Seguro'], ['vDesc', 'Desconto'], ['vICMSUFDest', 'DIFAL destino'], ['vFCPUFDest', 'FCP destino'], ['vNF', 'Valor total da nota']].map(([key, label]) => <Cell key={key} label={label}>{number(totals[key])}</Cell>)}</div>
      <h3 className="nfe-heading">Transporte / volumes</h3>
      <div className="nfe-grid"><Cell label="Modalidade do frete">{({ '0': 'Emitente', '1': 'Destinatário', '2': 'Terceiros', '3': 'Próprio emitente', '4': 'Próprio destinatário', '9': 'Sem transporte' } as Record<string, string>)[snapshot?.operation?.freightMode || '9']}</Cell><Cell label="Transportador" /><Cell label="Placa / UF" /><Cell label="Quantidade / espécie" /><Cell label="Peso bruto" /><Cell label="Peso líquido" /></div>
      <h3 className="nfe-heading">Dados dos produtos / serviços</h3>
      <table className="nfe-table"><thead><tr>{['Código', 'Descrição', 'NCM', 'CST/CSOSN', 'CFOP', 'UN', 'Qtd.', 'Vl. unit.', 'Vl. total', 'BC ICMS', 'Vl. ICMS', 'ICMS %'].map((label, i) => <th key={label} style={i === 1 ? { width: '22%' } : undefined}>{label}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.productCode}</td><td>{item.description}</td><td>{item.ncm}</td><td>{item.fiscalOrigin}{item.icmsCst}</td><td>{item.cfop}</td><td>{item.unitOfMeasure}</td><td>{Number(item.quantity)}</td><td>{number(item.unitPrice)}</td><td>{number(item.totalPrice)}</td><td>{number(item.icmsCst === '00' ? item.totalPrice : 0)}</td><td>{number(item.icmsCst === '00' ? Number(item.totalPrice) * Number(item.icmsRate || 0) / 100 : 0)}</td><td>{number(item.icmsCst === '00' ? item.icmsRate : 0)}</td></tr>)}</tbody></table>
      <h3 className="nfe-heading">Dados adicionais</h3>
      <div className="grid" style={{ gridTemplateColumns: '70% 30%' }}><Cell label="Informações complementares">{[snapshot?.notes, snapshot?.operation?.difal.reason].filter(Boolean).join(' — ') || '—'}</Cell><Cell label="Reservado ao fisco" /></div>
    </article>)}
  </main>;
}
