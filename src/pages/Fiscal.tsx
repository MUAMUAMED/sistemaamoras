import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownTrayIcon, ArrowPathIcon, CheckCircleIcon, DocumentTextIcon, ExclamationTriangleIcon, EyeIcon, SignalIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fiscalApi } from '../services/api';
import { FiscalConfig, FiscalDocument } from '../types';
import { getFiscalFileName } from '../utils/fiscalFileName';

const emptyConfig: FiscalConfig = {
  active: false, companyName: 'Amoras Capital', tradeName: 'Amoras Capital', taxId: '', stateTaxId: '', taxRegime: 1,
  stateCode: 'DF', cityCode: '5300108', cityName: 'Brasilia', street: '', streetNumber: '', district: '', zipCode: '',
  environment: 'HOMOLOGATION', nfeSeries: 1, nfceSeries: 1, nextNfeNumber: 1, nextNfceNumber: 1,
  defaultNcm: '', defaultCfop: '5102', defaultIcmsCst: '', defaultPisCst: '', defaultCofinsCst: '',
};

const statusClasses: Record<string, string> = {
  AUTHORIZED: 'bg-emerald-100 text-emerald-800', CANCELLED: 'bg-gray-200 text-gray-700',
  PROCESSING: 'bg-blue-100 text-blue-800', PENDING: 'bg-amber-100 text-amber-800',
  ERROR: 'bg-red-100 text-red-800', REJECTED: 'bg-red-100 text-red-800', DENIED: 'bg-red-100 text-red-800',
};

export default function Fiscal() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FiscalConfig>(emptyConfig);
  const [secrets, setSecrets] = useState({ cscToken: '', certificatePassword: '', certificatePfxBase64: '' });
  const configQuery = useQuery({ queryKey: ['fiscal-config'], queryFn: fiscalApi.getConfig });
  const documentsQuery = useQuery({ queryKey: ['fiscal-documents'], queryFn: () => fiscalApi.listDocuments({ limit: 50 }) });

  useEffect(() => {
    if (configQuery.data) setForm({ ...emptyConfig, ...configQuery.data });
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => fiscalApi.updateConfig({ ...form, ...Object.fromEntries(Object.entries(secrets).filter(([, value]) => value)) }),
    onSuccess: (data) => {
      setForm({ ...emptyConfig, ...data });
      setSecrets({ cscToken: '', certificatePassword: '', certificatePfxBase64: '' });
      queryClient.invalidateQueries({ queryKey: ['fiscal-config'] });
      toast.success('Configuracao fiscal salva');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.response?.data?.error || 'Erro ao salvar configuracao'),
  });

  const statusMutation = useMutation({
    mutationFn: fiscalApi.checkStatus,
    onSuccess: (data) => toast.success(data.online ? 'SEFAZ disponivel' : `SEFAZ respondeu: ${data.statusMessage}`),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Falha ao consultar a SEFAZ'),
  });

  const retryMutation = useMutation({
    mutationFn: fiscalApi.retry,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] }); toast.success('Documento reenviado'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Falha no reenvio'),
  });

  const downloadXml = async (document: FiscalDocument) => {
    try {
      const blob = await fiscalApi.downloadXml(document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${getFiscalFileName(document.sale?.leadName)}.xml`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nao foi possivel baixar o XML');
    }
  };

  const set = (key: keyof FiscalConfig, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
  const ready = Boolean(form.active && form.hasCertificate && form.hasCscToken && form.defaultNcm && form.defaultCfop && form.defaultIcmsCst && form.defaultPisCst && form.defaultCofinsCst);

  const readCertificate = (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('O certificado deve ter no maximo 10 MB');
    const reader = new FileReader();
    reader.onload = () => setSecrets((current) => ({ ...current, certificatePfxBase64: String(reader.result).split(',')[1] || '' }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central fiscal</h1>
          <p className="text-sm text-gray-600">NFC-e do PDV, certificado A1 e comunicacao com a SEFAZ.</p>
        </div>
        <div className="flex gap-2">
          <span className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
            {ready ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-5 w-5" />}
            {ready ? 'Pronto para emitir' : 'Configuracao incompleta'}
          </span>
          <button onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending} className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            <SignalIcon className="h-5 w-5" /> Testar SEFAZ
          </button>
        </div>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div><h2 className="font-semibold text-gray-900">Emitente e credenciais</h2><p className="text-xs text-gray-500">Segredos sao criptografados e nao reaparecem nesta tela.</p></div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Emissao ativa</label>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Razao social"><input className={inputClass} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
            <Field label="Nome fantasia"><input className={inputClass} value={form.tradeName || ''} onChange={(e) => set('tradeName', e.target.value)} /></Field>
            <Field label="CNPJ"><input className={inputClass} value={form.taxId} onChange={(e) => set('taxId', e.target.value.replace(/\D/g, '').slice(0, 14))} /></Field>
            <Field label="Inscricao estadual"><input className={inputClass} value={form.stateTaxId} onChange={(e) => set('stateTaxId', e.target.value)} /></Field>
            <Field label="Regime tributario"><select className={inputClass} value={form.taxRegime} onChange={(e) => set('taxRegime', Number(e.target.value))}><option value={1}>Simples Nacional</option><option value={2}>Simples, excesso sublimite</option><option value={3}>Regime normal</option></select></Field>
            <Field label="Ambiente"><select className={inputClass} value={form.environment} onChange={(e) => set('environment', e.target.value)}><option value="HOMOLOGATION">Homologacao</option><option value="PRODUCTION">Producao</option></select></Field>
            <Field label="Logradouro"><input className={inputClass} value={form.street} onChange={(e) => set('street', e.target.value)} /></Field>
            <Field label="Numero"><input className={inputClass} value={form.streetNumber} onChange={(e) => set('streetNumber', e.target.value)} /></Field>
            <Field label="Bairro"><input className={inputClass} value={form.district} onChange={(e) => set('district', e.target.value)} /></Field>
            <Field label="Cidade"><input className={inputClass} value={form.cityName} onChange={(e) => set('cityName', e.target.value)} /></Field>
            <Field label="Codigo IBGE"><input className={inputClass} value={form.cityCode} onChange={(e) => set('cityCode', e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="CEP"><input className={inputClass} value={form.zipCode} onChange={(e) => set('zipCode', e.target.value.replace(/\D/g, '').slice(0, 8))} /></Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-5">
            <Field label={`Certificado A1 ${form.hasCertificate ? '(configurado)' : ''}`}><input type="file" accept=".pfx,.p12" onChange={(e) => readCertificate(e.target.files?.[0])} className={inputClass} /></Field>
            <Field label="Senha do certificado"><input type="password" className={inputClass} value={secrets.certificatePassword} onChange={(e) => setSecrets((s) => ({ ...s, certificatePassword: e.target.value }))} placeholder={form.hasCertificate ? 'Deixe vazio para manter' : ''} /></Field>
            <Field label="ID do CSC"><input className={inputClass} value={form.cscId || ''} onChange={(e) => set('cscId', e.target.value)} /></Field>
            <Field label={`Token CSC ${form.hasCscToken ? '(configurado)' : ''}`}><input type="password" className={inputClass} value={secrets.cscToken} onChange={(e) => setSecrets((s) => ({ ...s, cscToken: e.target.value }))} placeholder={form.hasCscToken ? 'Deixe vazio para manter' : ''} /></Field>
            <Field label="Serie NFC-e"><input type="number" min="1" className={inputClass} value={form.nfceSeries} onChange={(e) => set('nfceSeries', Number(e.target.value))} /></Field>
            <Field label="Proximo numero"><input type="number" min="1" className={inputClass} value={form.nextNfceNumber} onChange={(e) => set('nextNfceNumber', Number(e.target.value))} /></Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t pt-5">
            <Field label="NCM padrao"><input className={inputClass} value={form.defaultNcm || ''} onChange={(e) => set('defaultNcm', e.target.value)} /></Field>
            <Field label="CFOP padrao"><input className={inputClass} value={form.defaultCfop || ''} onChange={(e) => set('defaultCfop', e.target.value)} /></Field>
            <Field label="CST/CSOSN ICMS"><input className={inputClass} value={form.defaultIcmsCst || ''} onChange={(e) => set('defaultIcmsCst', e.target.value)} /></Field>
            <Field label="CST PIS"><input className={inputClass} value={form.defaultPisCst || ''} onChange={(e) => set('defaultPisCst', e.target.value)} /></Field>
            <Field label="CST COFINS"><input className={inputClass} value={form.defaultCofinsCst || ''} onChange={(e) => set('defaultCofinsCst', e.target.value)} /></Field>
          </div>
          <div className="flex justify-end"><button disabled={saveMutation.isPending} className="bg-indigo-600 text-white rounded-md px-5 py-2 text-sm font-medium disabled:opacity-50">{saveMutation.isPending ? 'Salvando...' : 'Salvar configuracao'}</button></div>
        </form>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between"><div className="flex items-center gap-2"><DocumentTextIcon className="h-5 w-5 text-gray-500" /><h2 className="font-semibold text-gray-900">Documentos recentes</h2></div><button onClick={() => documentsQuery.refetch()} title="Atualizar" className="p-2 text-gray-500 hover:text-gray-800"><ArrowPathIcon className="h-5 w-5" /></button></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3 text-left">Venda</th><th className="px-5 py-3 text-left">NFC-e</th><th className="px-5 py-3 text-left">Emissao</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Retorno</th><th className="px-5 py-3 text-right">Acao</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {documentsQuery.data?.data.map((document: FiscalDocument) => <tr key={document.id}><td className="px-5 py-3 font-medium">#{document.sale?.saleNumber || document.saleId}</td><td className="px-5 py-3 font-mono">{document.series}/{document.number}</td><td className="px-5 py-3">{new Date(document.issuedAt).toLocaleString('pt-BR')}</td><td className="px-5 py-3"><span className={`rounded px-2 py-1 text-xs font-semibold ${statusClasses[document.status] || 'bg-gray-100 text-gray-700'}`}>{document.status}</span></td><td className="px-5 py-3 max-w-xs truncate" title={document.statusMessage}>{document.statusMessage || document.accessKey || '-'}</td><td className="px-5 py-3"><div className="flex justify-end gap-3">{document.status === 'AUTHORIZED' && <><Link to={`/erp/fiscal/${document.id}/danfe`} className="inline-flex items-center gap-1 text-indigo-700 font-medium hover:underline"><EyeIcon className="h-4 w-4" /> DANFE</Link><button onClick={() => downloadXml(document)} className="inline-flex items-center gap-1 text-gray-700 font-medium hover:underline"><ArrowDownTrayIcon className="h-4 w-4" /> XML</button></>}{['ERROR', 'REJECTED'].includes(document.status) && <button onClick={() => retryMutation.mutate(document.id)} className="text-indigo-700 font-medium hover:underline">Reenviar</button>}</div></td></tr>)}
              {!documentsQuery.data?.data.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500">Nenhum documento fiscal emitido.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>{children}</label>;
}
