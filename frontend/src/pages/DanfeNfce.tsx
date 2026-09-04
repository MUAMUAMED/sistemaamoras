import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownTrayIcon, ArrowLeftIcon, DocumentTextIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Download, Loader2, MessageCircle, Share2, X } from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { fiscalApi } from '../services/api';
import { getFiscalFileName, getFiscalPdfFileName } from '../utils/fiscalFileName';
import { createFiscalPdfFile, downloadFile } from '../utils/fiscalPdf';

const money = (value: number | string) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const digits = (value?: string) => String(value || '').replace(/\D/g, '');
const formatTaxId = (value?: string) => {
  const clean = digits(value);
  if (clean.length === 14) return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (clean.length === 11) return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value || '';
};
const formatKey = (value?: string) => String(value || '').replace(/(.{4})/g, '$1 ').trim();
const paymentLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  CREDIT_CARD: 'Cartao de credito',
  DEBIT_CARD: 'Cartao de debito',
  BANK_SLIP: 'Boleto',
  BANK_TRANSFER: 'Transferencia',
};

export default function DanfeNfce() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [qrCode, setQrCode] = useState('');
  const [shareOpen, setShareOpen] = useState(
    () => Boolean(location.state?.shareFiscal || new URLSearchParams(location.search).get('share') === '1')
  );
  const [phone, setPhone] = useState('');
  const [sharing, setSharing] = useState<'pdf' | 'native' | 'whatsapp' | null>(null);
  const query = useQuery({
    queryKey: ['fiscal-danfe', id],
    queryFn: () => fiscalApi.getDanfe(id),
    enabled: Boolean(id),
  });
  const document = query.data;

  useEffect(() => {
    if (!document?.qrCodeUrl) {
      setQrCode('');
      return;
    }
    QRCode.toDataURL(document.qrCodeUrl, { width: 280, margin: 1, errorCorrectionLevel: 'M' })
      .then(setQrCode)
      .catch(() => setQrCode(''));
  }, [document?.qrCodeUrl]);

  const print = (format: '80mm' | 'a4') => {
    if (!document) return;
    const style = window.document.createElement('style');
    style.id = 'danfe-print-size';
    style.textContent = format === '80mm'
      ? '@page { size: 80mm auto; margin: 3mm; }'
      : '@page { size: A4 portrait; margin: 12mm; }';
    window.document.getElementById(style.id)?.remove();
    window.document.head.appendChild(style);
    window.document.body.dataset.danfeFormat = format;
    const previousTitle = window.document.title;
    window.document.title = getFiscalFileName(document.recipientName || document.sale.leadName);
    try {
      window.print();
    } finally {
      window.document.title = previousTitle;
    }
  };

  const downloadXml = async () => {
    if (!document) return;
    try {
      const blob = await fiscalApi.downloadXml(document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${getFiscalFileName(document.recipientName || document.sale.leadName)}.xml`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nao foi possivel baixar o XML');
    }
  };

  const createPdf = async () => {
    if (!document) throw new Error('Documento fiscal indisponivel');
    const element = window.document.getElementById('danfe-document');
    if (!element) throw new Error('DANFE ainda nao esta pronta');
    return createFiscalPdfFile(
      element,
      getFiscalPdfFileName(document.recipientName || document.sale.leadName)
    );
  };

  const downloadPdf = async () => {
    try {
      setSharing('pdf');
      downloadFile(await createPdf());
      toast.success('PDF da nota fiscal baixado');
    } catch (error: any) {
      toast.error(error.message || 'Nao foi possivel gerar o PDF');
    } finally {
      setSharing(null);
    }
  };

  const shareNative = async () => {
    try {
      setSharing('native');
      const file = await createPdf();
      const shareData = {
        text: 'segue em anexo a nota fiscal emitida',
        files: [file],
      };

      if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
        downloadFile(file);
        toast('O compartilhamento de arquivos nao e suportado neste navegador. O PDF foi baixado.');
        return;
      }
      await navigator.share(shareData);
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast.error(error.message || 'Nao foi possivel compartilhar a nota');
    } finally {
      setSharing(null);
    }
  };

  const openWhatsApp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    if (![12, 13].includes(fullPhone.length)) {
      toast.error('Digite um numero valido com DDD');
      return;
    }

    const popup = window.open('about:blank', '_blank');
    try {
      setSharing('whatsapp');
      downloadFile(await createPdf());
      const message = 'segue em anexo a nota fiscal emitida';
      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
      if (popup) popup.location.href = url;
      else window.location.href = url;
    } catch (error: any) {
      popup?.close();
      toast.error(error.message || 'Nao foi possivel abrir o WhatsApp');
    } finally {
      setSharing(null);
    }
  };

  if (query.isLoading) {
    return <div className="py-20 text-center text-gray-500">Carregando documento fiscal...</div>;
  }
  if (query.isError || !document) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <DocumentTextIcon className="h-12 w-12 mx-auto text-red-500" />
        <h1 className="mt-4 text-xl font-semibold">DANFE indisponivel</h1>
        <p className="mt-2 text-gray-600">{(query.error as any)?.response?.data?.message || 'Nao foi possivel carregar o documento autorizado.'}</p>
        <Link to="/erp/fiscal" className="inline-block mt-5 text-indigo-700 font-medium">Voltar para a Central Fiscal</Link>
      </div>
    );
  }

  const address = [
    `${document.issuer.street}, ${document.issuer.streetNumber}`,
    document.issuer.addressComplement,
    document.issuer.district,
    `${document.issuer.cityName}-${document.issuer.stateCode}`,
    `CEP ${document.issuer.zipCode}`,
  ].filter(Boolean).join(' - ');

  return (
    <div className="danfe-screen">
      <div className="danfe-no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to={location.state?.pdvPath || (location.state?.fromManualFiscal ? '/erp/fiscal/manual' : location.state?.fromPdv ? '/erp/scanner' : '/erp/fiscal')} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-950">
          <ArrowLeftIcon className="h-5 w-5" /> {location.state?.fromManualFiscal ? 'Voltar ao emissor' : location.state?.fromPdv ? 'Voltar ao PDV' : 'Central Fiscal'}
        </Link>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadXml} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
            <ArrowDownTrayIcon className="h-5 w-5" /> Baixar XML
          </button>
          <button onClick={() => setShareOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-md border border-emerald-700 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
            <Share2 className="h-5 w-5" /> Enviar / compartilhar
          </button>
          <button onClick={() => print('a4')} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
            <PrinterIcon className="h-5 w-5" /> Imprimir A4
          </button>
          <button onClick={() => print('80mm')} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <PrinterIcon className="h-5 w-5" /> Imprimir 80 mm
          </button>
        </div>
      </div>

      {shareOpen && (
        <section className="danfe-no-print mx-auto mb-5 max-w-3xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-950">Enviar nota fiscal</h2>
              <p className="mt-1 text-sm text-gray-600">Compartilhe o PDF pelo celular ou abra uma conversa pelo numero informado.</p>
            </div>
            <button type="button" title="Fechar" onClick={() => setShareOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-700">WhatsApp com DDD</span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(61) 99999-9999"
                className="h-11 w-full border border-gray-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <button type="button" disabled={Boolean(sharing)} onClick={openWhatsApp} className="mt-auto inline-flex h-11 items-center justify-center gap-2 bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {sharing === 'whatsapp' ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
              Baixar PDF e abrir WhatsApp
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={Boolean(sharing)} onClick={shareNative} className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-emerald-700 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
              {sharing === 'native' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
              Compartilhar arquivo
            </button>
            <button type="button" disabled={Boolean(sharing)} onClick={downloadPdf} className="inline-flex h-11 items-center justify-center gap-2 border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {sharing === 'pdf' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              Baixar PDF
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">No Android e iPhone, “Compartilhar arquivo” abre o menu do sistema com o PDF anexado. No computador, o PDF e baixado antes de abrir a conversa para voce anexa-lo.</p>
        </section>
      )}

      <main id="danfe-document" className="danfe-print-root mx-auto bg-white text-black">
        <header className="border-b border-dashed border-black pb-2 text-center">
          <h1 className="text-base font-bold uppercase">{document.issuer.tradeName || document.issuer.companyName}</h1>
          <p className="text-[11px] font-medium">{document.issuer.companyName}</p>
          <p className="text-[10px] leading-4">CNPJ {formatTaxId(document.issuer.taxId)} | IE {document.issuer.stateTaxId}</p>
          <p className="text-[10px] leading-4">{address}</p>
        </header>

        <section className="py-2 text-center">
          <h2 className="text-xs font-bold">DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletronica</h2>
          <p className="mt-1 text-[10px]">Nao permite aproveitamento de credito de ICMS</p>
          {document.environment === 'HOMOLOGATION' && <p className="mt-2 border-y border-black py-1 text-xs font-extrabold">EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</p>}
        </section>

        <section className="border-y border-dashed border-black py-1">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[9px] font-bold uppercase">
            <span>Descricao</span><span>Qtd</span><span>Vl. unit.</span><span>Total</span>
          </div>
          {document.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-t border-gray-300 py-1 text-[9px] leading-3">
              <span><strong>{item.productCode}</strong> {item.description}</span>
              <span>{Number(item.quantity).toLocaleString('pt-BR')}</span>
              <span>{money(item.unitPrice)}</span>
              <span className="font-semibold">{money(item.totalPrice)}</span>
            </div>
          ))}
        </section>

        <section className="space-y-1 border-b border-dashed border-black py-2 text-[10px]">
          <div className="flex justify-between"><span>Qtd. total de itens</span><strong>{document.items.reduce((sum, item) => sum + Number(item.quantity), 0)}</strong></div>
          <div className="flex justify-between"><span>Subtotal</span><strong>{money(document.sale.subtotal)}</strong></div>
          {Number(document.sale.discount) > 0 && <div className="flex justify-between"><span>Desconto</span><strong>- {money(document.sale.discount)}</strong></div>}
          <div className="flex justify-between text-sm"><span>VALOR TOTAL</span><strong>{money(document.totalAmount)}</strong></div>
          <div className="flex justify-between"><span>Forma de pagamento</span><strong>{paymentLabels[document.sale.paymentMethod] || document.sale.paymentMethod}</strong></div>
        </section>

        <section className="border-b border-dashed border-black py-2 text-center text-[10px]">
          <p className="font-bold">Consulte pela chave de acesso</p>
          {document.consultationUrl && <p>{document.consultationUrl}</p>}
          <p className="mt-1 break-all font-mono leading-4">{formatKey(document.accessKey)}</p>
          {qrCode && <img src={qrCode} alt="QR Code de consulta da NFC-e" className="mx-auto mt-2 h-36 w-36" />}
        </section>

        <footer className="space-y-1 pt-2 text-center text-[9px] leading-3">
          <p><strong>NFC-e n. {document.number} Serie {document.series}</strong></p>
          <p>Emissao: {new Date(document.issuedAt).toLocaleString('pt-BR')}</p>
          <p>Protocolo de autorizacao: {document.protocolNumber || '-'}</p>
          {document.authorizedAt && <p>Autorizada em {new Date(document.authorizedAt).toLocaleString('pt-BR')}</p>}
          {(document.recipientName || document.recipientTaxId) && <p className="border-t border-dashed border-black pt-2">Consumidor: {document.recipientName || 'Nao identificado'} {document.recipientTaxId ? `- ${formatTaxId(document.recipientTaxId)}` : ''}</p>}
          <p>Venda #{document.sale.saleNumber}</p>
        </footer>
      </main>
    </div>
  );
}
