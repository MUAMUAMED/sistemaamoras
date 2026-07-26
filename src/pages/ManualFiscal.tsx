import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fiscalApi } from '../services/api';

type PaymentMethod = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_SLIP' | 'BANK_TRANSFER';

interface ManualItem {
  id: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ncm: string;
  cfop: string;
  advanced: boolean;
}

const newItem = (): ManualItem => ({
  id: crypto.randomUUID(),
  productCode: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  ncm: '',
  cfop: '',
  advanced: false,
});

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'Pix' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de débito' },
  { value: 'BANK_TRANSFER', label: 'Transferência' },
  { value: 'BANK_SLIP', label: 'Boleto' },
];

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ManualFiscal() {
  const navigate = useNavigate();
  const [recipientName, setRecipientName] = useState('');
  const [recipientTaxId, setRecipientTaxId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ManualItem[]>([newItem()]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const configQuery = useQuery({
    queryKey: ['fiscal-config'],
    queryFn: fiscalApi.getConfig,
  });

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
    [items]
  );

  const issueMutation = useMutation({
    mutationFn: () =>
      fiscalApi.issueManualNfce({
        recipientName: recipientName.trim() || undefined,
        recipientTaxId: recipientTaxId.replace(/\D/g, '') || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        items: items.map(({ id, advanced, ...item }) => ({
          ...item,
          productCode: item.productCode.trim() || undefined,
          description: item.description.trim(),
          ncm: item.ncm.replace(/\D/g, '') || undefined,
          cfop: item.cfop.replace(/\D/g, '') || undefined,
        })),
      }),
    onSuccess: (document) => {
      setConfirmOpen(false);
      if (document.status === 'AUTHORIZED') {
        toast.success('NFC-e autorizada');
        navigate(`/erp/fiscal/${document.id}/danfe`, { state: { fromManualFiscal: true } });
        return;
      }
      toast.error(document.statusMessage || `A SEFAZ retornou o status ${document.status}`);
      navigate('/erp/fiscal/history');
    },
    onError: (error: any) => {
      setConfirmOpen(false);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Não foi possível emitir a NFC-e');
    },
  });

  const updateItem = (id: string, changes: Partial<ManualItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return toast.error('A nota precisa ter pelo menos um item');
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const requestConfirmation = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTaxId = recipientTaxId.replace(/\D/g, '');
    if (cleanTaxId && ![11, 14].includes(cleanTaxId.length)) return toast.error('Informe um CPF ou CNPJ válido');
    if (items.some((item) => item.description.trim().length < 2)) return toast.error('Preencha a descrição de todos os itens');
    if (items.some((item) => Number(item.quantity) <= 0)) return toast.error('A quantidade deve ser maior que zero');
    if (items.some((item) => Number(item.unitPrice) <= 0)) return toast.error('O preço deve ser maior que zero');
    if (total <= 0) return toast.error('O total da nota deve ser maior que zero');
    setConfirmOpen(true);
  };

  const config = configQuery.data;
  const production = config?.environment === 'PRODUCTION';
  const inputClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-700">Administração fiscal</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Emissor avulso de NFC-e</h1>
          <p className="mt-1 text-sm text-gray-600">Emissão direta, sem cadastro de produto e sem movimentação de estoque.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${production ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <AlertTriangle className="h-4 w-4" />
          {production ? 'Ambiente de produção' : 'Ambiente de homologação'}
        </div>
      </header>

      <form onSubmit={requestConfirmation} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-indigo-700" />
              <h2 className="font-semibold text-gray-950">Destinatário e pagamento</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Nome do cliente
                <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className={`${inputClass} mt-1.5`} placeholder="Consumidor não identificado" maxLength={120} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                CPF ou CNPJ
                <input value={recipientTaxId} onChange={(event) => setRecipientTaxId(event.target.value)} className={`${inputClass} mt-1.5`} placeholder="Opcional" inputMode="numeric" maxLength={18} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Forma de pagamento
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className={`${inputClass} mt-1.5`}>
                  {paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-950">Itens da nota</h2>
                <p className="mt-0.5 text-xs text-gray-500">NCM e CFOP usam os padrões da Central Fiscal.</p>
              </div>
              <button type="button" onClick={() => setItems((current) => [...current, newItem()])} className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
                <Plus className="h-4 w-4" /> Adicionar item
              </button>
            </div>

            <div className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <div key={item.id} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-gray-500">Item {index + 1}</span>
                    <button type="button" onClick={() => removeItem(item.id)} className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" title="Remover item">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[120px_minmax(220px,1fr)_110px_150px_130px]">
                    <label className="text-xs font-semibold text-gray-600">
                      Código
                      <input value={item.productCode} onChange={(event) => updateItem(item.id, { productCode: event.target.value })} className={`${inputClass} mt-1`} placeholder="Automático" maxLength={60} />
                    </label>
                    <label className="text-xs font-semibold text-gray-600">
                      Descrição
                      <input value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} className={`${inputClass} mt-1`} placeholder="Ex.: Vestido feminino" maxLength={120} required />
                    </label>
                    <label className="text-xs font-semibold text-gray-600">
                      Quantidade
                      <input type="number" min="0.0001" max="9999" step="0.0001" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className={`${inputClass} mt-1 text-right`} required />
                    </label>
                    <label className="text-xs font-semibold text-gray-600">
                      Preço unitário
                      <input type="number" min="0.01" step="0.01" value={item.unitPrice || ''} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} className={`${inputClass} mt-1 text-right`} placeholder="0,00" required />
                    </label>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-gray-600">Total</span>
                      <p className="mt-3 text-sm font-bold text-gray-950">{money(item.quantity * item.unitPrice)}</p>
                    </div>
                  </div>

                  <button type="button" onClick={() => updateItem(item.id, { advanced: !item.advanced })} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-indigo-700">
                    {item.advanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Tributação avançada
                  </button>
                  {item.advanced && (
                    <div className="mt-3 grid gap-3 border-l-2 border-indigo-100 pl-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-gray-600">
                        NCM
                        <input value={item.ncm} onChange={(event) => updateItem(item.id, { ncm: event.target.value })} className={`${inputClass} mt-1`} placeholder={config?.defaultNcm || 'Padrão fiscal'} inputMode="numeric" maxLength={8} />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        CFOP
                        <input value={item.cfop} onChange={(event) => updateItem(item.id, { cfop: event.target.value })} className={`${inputClass} mt-1`} placeholder={config?.defaultCfop || 'Padrão fiscal'} inputMode="numeric" maxLength={4} />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="border border-gray-200 bg-white p-5">
            <label className="text-sm font-medium text-gray-700">
              Observação interna
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} mt-1.5 min-h-20 resize-y`} maxLength={500} placeholder="Opcional; não altera o cadastro de produtos." />
            </label>
          </section>
        </div>

        <aside className="h-fit border border-gray-200 bg-white p-5 xl:sticky xl:top-5">
          <h2 className="font-semibold text-gray-950">Resumo da emissão</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-600">Itens</dt><dd className="font-semibold">{items.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-600">Quantidade</dt><dd className="font-semibold">{items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toLocaleString('pt-BR')}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-600">Pagamento</dt><dd className="text-right font-semibold">{paymentOptions.find((option) => option.value === paymentMethod)?.label}</dd></div>
          </dl>
          <div className="my-5 border-t border-gray-200 pt-5">
            <p className="text-xs font-semibold uppercase text-gray-500">Total da NFC-e</p>
            <p className="mt-1 text-3xl font-bold text-gray-950">{money(total)}</p>
          </div>
          <button type="submit" disabled={issueMutation.isPending || configQuery.isLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            <FileCheck2 className="h-5 w-5" />
            Conferir e emitir
          </button>
          <p className="mt-3 text-xs leading-5 text-gray-500">A numeração fiscal é automática. Esta operação não cria produto nem movimenta estoque.</p>
        </aside>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Confirmar emissão fiscal</h2>
                <p className="mt-1 text-sm text-gray-600">Revise os dados antes de transmitir para a SEFAZ.</p>
              </div>
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Destinatário</span><strong>{recipientName.trim() || 'Não identificado'}</strong></div>
              <div className="flex justify-between"><span className="text-gray-600">Itens</span><strong>{items.length}</strong></div>
              <div className="flex justify-between text-base"><span className="font-semibold">Total</span><strong>{money(total)}</strong></div>
              {production && <div className="flex gap-2 border border-rose-200 bg-rose-50 p-3 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Esta é uma emissão real em ambiente de produção.</span></div>}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Voltar</button>
              <button type="button" onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {issueMutation.isPending ? 'Transmitindo...' : 'Emitir NFC-e'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
