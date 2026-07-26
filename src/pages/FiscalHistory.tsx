import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileClock,
  Loader2,
  RefreshCw,
  RotateCw,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fiscalApi } from '../services/api';
import { FiscalDocument, FiscalDocumentStatus } from '../types';
import { getFiscalFileName } from '../utils/fiscalFileName';

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'AUTHORIZED', label: 'Autorizada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'REJECTED', label: 'Rejeitada' },
  { value: 'DENIED', label: 'Denegada' },
  { value: 'ERROR', label: 'Erro' },
];

const statusLabels: Record<FiscalDocumentStatus, string> = {
  AUTHORIZED: 'Autorizada',
  CANCELLED: 'Cancelada',
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  REJECTED: 'Rejeitada',
  DENIED: 'Denegada',
  CONTINGENCY: 'Contingência',
  VOIDED: 'Inutilizada',
  ERROR: 'Erro',
};

const statusClasses: Record<FiscalDocumentStatus, string> = {
  AUTHORIZED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  DENIED: 'bg-rose-100 text-rose-800',
  CONTINGENCY: 'bg-violet-100 text-violet-800',
  VOIDED: 'bg-slate-200 text-slate-700',
  ERROR: 'bg-red-100 text-red-800',
};

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dateParts = (value: string) => {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('pt-BR'),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
};

export default function FiscalHistory() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [environment, setEnvironment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const documentsQuery = useQuery({
    queryKey: ['fiscal-history', page, search, status, environment, dateFrom, dateTo],
    queryFn: () =>
      fiscalApi.listDocuments({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        environment: environment || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const retryMutation = useMutation({
    mutationFn: fiscalApi.retry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-history'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toast.success('Documento reenviado');
    },
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
      toast.error(error.response?.data?.message || 'Não foi possível baixar o XML');
    }
  };

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const clearFilters = () => {
    setPage(1);
    setSearchDraft('');
    setSearch('');
    setStatus('');
    setEnvironment('');
    setDateFrom('');
    setDateTo('');
  };

  const pagination = documentsQuery.data?.pagination;
  const documents = documentsQuery.data?.data || [];
  const hasFilters = Boolean(search || status || environment || dateFrom || dateTo);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <FileClock className="h-5 w-5" />
            Fiscal
          </div>
          <h1 className="text-2xl font-bold text-gray-950">Histórico de notas fiscais</h1>
          <p className="mt-1 text-sm text-gray-600">
            Consulte NFC-e emitidas, rejeitadas e canceladas pelo PDV.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/erp/fiscal"
            className="inline-flex h-10 items-center border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Configuração fiscal
          </Link>
          <button
            type="button"
            title="Atualizar histórico"
            onClick={() => documentsQuery.refetch()}
            className="grid h-10 w-10 place-items-center border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className={`h-5 w-5 ${documentsQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <section className="border border-gray-200 bg-white">
        <form onSubmit={applySearch} className="border-b border-gray-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(16rem,1fr)_12rem_12rem_10rem_10rem_auto]">
            <div className="relative sm:col-span-2 lg:col-span-3 2xl:col-span-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Número, chave, venda, cliente ou CPF/CNPJ"
                className="h-11 w-full border border-gray-300 pl-10 pr-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <select
              value={status}
              onChange={(event) => { setPage(1); setStatus(event.target.value); }}
              className="h-11 border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={environment}
              onChange={(event) => { setPage(1); setEnvironment(event.target.value); }}
              className="h-11 border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
            >
              <option value="">Todos os ambientes</option>
              <option value="PRODUCTION">Produção</option>
              <option value="HOMOLOGATION">Homologação</option>
            </select>
            <input
              type="date"
              aria-label="Data inicial"
              value={dateFrom}
              onChange={(event) => { setPage(1); setDateFrom(event.target.value); }}
              className="h-11 border border-gray-300 px-3 text-sm outline-none focus:border-indigo-600"
            />
            <input
              type="date"
              aria-label="Data final"
              value={dateTo}
              onChange={(event) => { setPage(1); setDateTo(event.target.value); }}
              className="h-11 border border-gray-300 px-3 text-sm outline-none focus:border-indigo-600"
            />
            <button type="submit" className="h-11 bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">
              Buscar
            </button>
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="mt-3 text-sm font-medium text-indigo-700 hover:underline">
              Limpar filtros
            </button>
          )}
        </form>

        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <span><strong className="text-gray-900">{pagination?.total || 0}</strong> documento(s) encontrado(s)</span>
          {pagination && pagination.pages > 0 && <span>Página {pagination.page} de {pagination.pages}</span>}
        </div>

        {documentsQuery.isLoading ? (
          <div className="grid min-h-64 place-items-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : documents.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">NFC-e</th>
                    <th className="px-4 py-3 text-left">Venda / cliente</th>
                    <th className="px-4 py-3 text-left">Emissão</th>
                    <th className="px-4 py-3 text-left">Valor</th>
                    <th className="px-4 py-3 text-left">Ambiente</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((document) => (
                    <DocumentRow
                      key={document.id}
                      document={document}
                      retrying={retryMutation.isPending && retryMutation.variables === document.id}
                      onDownload={() => downloadXml(document)}
                      onRetry={() => retryMutation.mutate(document.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-200 md:hidden">
              {documents.map((document) => (
                <article key={document.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold">NFC-e {document.series}/{document.number}</p>
                      <p className="mt-1 text-xs text-gray-500">Venda #{document.sale?.saleNumber || document.saleId}</p>
                    </div>
                    <StatusBadge status={document.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="block text-xs text-gray-500">Emissão</span>{new Date(document.issuedAt).toLocaleString('pt-BR')}</div>
                    <div><span className="block text-xs text-gray-500">Valor</span><strong>{money(document.totalAmount)}</strong></div>
                    <div><span className="block text-xs text-gray-500">Cliente</span>{document.sale?.leadName || 'Consumidor não identificado'}</div>
                    <div><span className="block text-xs text-gray-500">Ambiente</span>{document.environment === 'PRODUCTION' ? 'Produção' : 'Homologação'}</div>
                  </div>
                  <DocumentActions
                    document={document}
                    retrying={retryMutation.isPending && retryMutation.variables === document.id}
                    onDownload={() => downloadXml(document)}
                    onRetry={() => retryMutation.mutate(document.id)}
                  />
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="grid min-h-64 place-items-center px-6 text-center text-gray-500">
            <div>
              <FileClock className="mx-auto mb-3 h-11 w-11 text-gray-300" />
              <p className="font-semibold text-gray-700">Nenhuma nota fiscal encontrada</p>
              <p className="mt-1 text-sm">{hasFilters ? 'Revise os filtros utilizados.' : 'As notas emitidas pelo PDV aparecerão aqui.'}</p>
            </div>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <footer className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-10 items-center gap-2 border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-sm text-gray-600">{pagination.total} registros</span>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-10 items-center gap-2 border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}

function DocumentRow({
  document,
  retrying,
  onDownload,
  onRetry,
}: {
  document: FiscalDocument;
  retrying: boolean;
  onDownload: () => void;
  onRetry: () => void;
}) {
  const issuedAt = dateParts(document.issuedAt);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-3">
        <p className="font-mono font-bold">{document.series}/{document.number}</p>
        <p className="mt-1 max-w-32 truncate font-mono text-[11px] text-gray-500" title={document.accessKey}>{document.accessKey || '-'}</p>
      </td>
      <td className="px-3 py-3">
        <p className="font-medium">#{document.sale?.saleNumber || document.saleId}</p>
        <p className="mt-1 max-w-36 truncate text-xs text-gray-500">{document.sale?.leadName || 'Consumidor não identificado'}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <p>{issuedAt.date}</p>
        <p className="text-xs text-gray-500">{issuedAt.time}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-semibold">{money(document.totalAmount)}</td>
      <td className="px-3 py-3 text-xs font-medium">{document.environment === 'PRODUCTION' ? 'Produção' : 'Homologação'}</td>
      <td className="px-3 py-3"><StatusBadge status={document.status} /></td>
      <td className="px-3 py-3"><DocumentActions document={document} retrying={retrying} onDownload={onDownload} onRetry={onRetry} /></td>
    </tr>
  );
}

function StatusBadge({ status }: { status: FiscalDocumentStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap px-2 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function DocumentActions({
  document,
  retrying,
  onDownload,
  onRetry,
}: {
  document: FiscalDocument;
  retrying: boolean;
  onDownload: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      {document.status === 'AUTHORIZED' && (
        <>
          <Link
            to={`/erp/fiscal/${document.id}/danfe`}
            title="Abrir DANFE"
            className="grid h-9 w-9 place-items-center border border-gray-300 text-indigo-700 hover:bg-indigo-50"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            title="Baixar XML"
            onClick={onDownload}
            className="grid h-9 w-9 place-items-center border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
          </button>
        </>
      )}
      {['ERROR', 'REJECTED'].includes(document.status) && (
        <button
          type="button"
          title="Reenviar documento"
          disabled={retrying}
          onClick={onRetry}
          className="grid h-9 w-9 place-items-center border border-gray-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
