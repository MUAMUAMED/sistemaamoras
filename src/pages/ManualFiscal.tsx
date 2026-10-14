import FiscalDestination, { automaticDifal, emptyFiscalOperation } from '../components/FiscalDestination';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  KeyRound,
  Loader2,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fiscalApi, productsApi } from '../services/api';
import type { Product } from '../types';

type PaymentMethod = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_SLIP' | 'BANK_TRANSFER';
type AiProvider = 'gemini' | 'groq' | 'openrouter';

interface ManualItem {
  id: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  ncm: string;
  cfop: string;
  advanced: boolean;
  icmsCst?: string; icmsRate?: string; fiscalOrigin?: string;
  pisCst?: string; pisRate?: string; cofinsCst?: string; cofinsRate?: string;
  difalBase?: string; internalRate?: string; interstateRate?: string; fcpRate?: string;
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
  const queryClient = useQueryClient();
  const [interstate, setInterstate] = useState(false);
  const [operation, setOperation] = useState(emptyFiscalOperation);
  const [addressStatus, setAddressStatus] = useState('');
  const [cnpjResult, setCnpjResult] = useState<Awaited<ReturnType<typeof fiscalApi.lookupCnpj>> | null>(null);
  const taxIdRef = useRef('');

  const noteLabel = interstate ? 'NF-e' : 'NFC-e';
  const [recipientName, setRecipientName] = useState('');
  const [recipientTaxId, setRecipientTaxId] = useState('');
  taxIdRef.current = recipientTaxId.replace(/\D/g, '');
  const automaticAddress = useRef<{ id: string; address: any } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ManualItem[]>([newItem()]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider | ''>('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [lastAiModel, setLastAiModel] = useState('');
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [settingsProvider, setSettingsProvider] = useState<AiProvider>('gemini');
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [settingsModel, setSettingsModel] = useState('');
  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [settingsDefault, setSettingsDefault] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');

  const configQuery = useQuery({
    queryKey: ['fiscal-config'],
    queryFn: fiscalApi.getConfig,
  });
  const providersQuery = useQuery({
    queryKey: ['fiscal-ai-providers'],
    queryFn: fiscalApi.getAiProviders,
  });
  const productsQuery = useQuery({
    queryKey: ['manual-fiscal-products', debouncedProductSearch],
    queryFn: () => productsApi.list({
      search: debouncedProductSearch,
      isDraft: false,
      page: 1,
      limit: 8,
    }),
    enabled: debouncedProductSearch.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!aiProvider && providersQuery.data?.defaultProvider) {
      setAiProvider(providersQuery.data.defaultProvider);
    }
  }, [aiProvider, providersQuery.data?.defaultProvider]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedProductSearch(productSearch.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const internalNfe = (operation.deliveryAddress?.stateCode || operation.recipientAddress.stateCode) === configQuery.data?.stateCode;
  const noDifal = automaticDifal(operation, configQuery.data);
  useEffect(() => {
    if (noDifal) setOperation(current => current.difal.applies === false ? current : { ...current, difal: { applies: false, reason: '' } });
    else setOperation(current => current.difal.applies === false && !current.difal.reason ? { ...current, difal: { applies: null, reason: '' } } : current);
  }, [noDifal]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
    [items]
  );

  const lookupCnpjMutation = useMutation({
    mutationFn: fiscalApi.lookupCnpj,
    onSuccess: (result, cnpj) => {
      if (taxIdRef.current !== cnpj) return;
      setCnpjResult(result);
      setRecipientName(current => current.trim() ? current : result.recipientName);
      setOperation(current => {
        const a = current.recipientAddress;
        const empty = Object.keys(result.address).every(key => !a[key as keyof typeof a]);
        const registration = result.stateRegistration && !a.taxpayerIndicator && !a.stateTaxId ? result.stateRegistration : {};
        if (!empty) return { ...current, recipientAddress: { ...a, ...registration } };
        automaticAddress.current = { id: cnpj, address: result.address };
        return { ...current, recipientAddress: { ...a, ...result.address, ...registration } };
      });
      setAddressStatus(`Cadastro consultado em ${result.source}.${result.stateRegistration ? ' Inscrição estadual ativa preenchida.' : ''} Confira os endereços; os dados já informados foram preservados.`);
    },
    onError: (error: any, cnpj) => {
      if (taxIdRef.current !== cnpj) return;
      setAddressStatus(error.response?.data?.message || 'Consulta do CNPJ indisponível. Você pode preencher o endereço manualmente.');
    },
  });
  const lookupCnpj = lookupCnpjMutation.mutate;
  useEffect(() => {
    if (!interstate || !/^\d{14}$/.test(taxIdRef.current)) return;
    const cnpj = taxIdRef.current;
    const timer = window.setTimeout(() => lookupCnpj(cnpj), 650);
    return () => window.clearTimeout(timer);
  }, [interstate, recipientTaxId, lookupCnpj]);

  useEffect(() => {
    const cep = operation.recipientAddress.zipCode;
    if (!interstate || !/^\d{8}$/.test(cep)) return;
    if (operation.recipientAddress.cityCode && operation.recipientAddress.street) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setAddressStatus('Consultando CEP…');
      fiscalApi.lookupCep(cep).then(result => {
        if (cancelled) return;
        setOperation(current => {
          if (current.recipientAddress.zipCode !== cep) return current;
          if (current.recipientAddress.stateCode && current.recipientAddress.stateCode !== result.address.stateCode) return current;
          const address = { ...current.recipientAddress };
          for (const key of ['stateCode', 'cityCode', 'cityName', 'street', 'district'] as const) {
            if (!address[key]) address[key] = result.address[key];
          }
          return { ...current, recipientAddress: address };
        });
        setAddressStatus('CEP consultado. Confira o endereço de entrega e informe o número.');
      }).catch((error: any) => {
        if (!cancelled) setAddressStatus(error.response?.data?.message || 'Consulta do CEP indisponível. Preencha manualmente.');
      });
    }, 500);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // A consulta acompanha o CEP. Alterações manuais nos outros campos são preservadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interstate, operation.recipientAddress.zipCode]);

  const changeRecipientTaxId = (value: string) => {
    const cnpj = value.replace(/\D/g, '');
    const auto = automaticAddress.current;
    if (cnpj !== taxIdRef.current) {
      setCnpjResult(null); setAddressStatus('');
      setOperation(current => {
        const sameAddress = auto && Object.entries(auto.address).every(([key, field]) => current.recipientAddress[key as keyof typeof current.recipientAddress] === field);
        return { ...current, finalConsumer: null, difal: { applies: null, reason: '' },
          recipientAddress: sameAddress ? { ...emptyFiscalOperation.recipientAddress } : { ...current.recipientAddress, taxpayerIndicator: '', stateTaxId: '' } };
      });
    }
    setRecipientTaxId(value);
  };

  const issueMutation = useMutation({
    mutationFn: () => {
      const data = {
        recipientName: recipientName.trim() || undefined,
        recipientTaxId: recipientTaxId.replace(/\D/g, '') || undefined,
        paymentMethod, notes: notes.trim() || undefined,
        items: items.map(({ id, advanced, ...item }) => ({
          productCode: item.productCode.trim() || undefined,
          description: item.description.trim(), quantity: item.quantity, unitPrice: item.unitPrice,
          ncm: item.ncm.replace(/\D/g, '') || undefined,
          cfop: item.cfop.replace(/\D/g, '') || undefined,
          ...(interstate ? {
            icmsCst: item.icmsCst || configQuery.data?.defaultIcmsCst,
            icmsRate: item.icmsRate ? Number(item.icmsRate) : undefined,
            fiscalOrigin: item.fiscalOrigin || '0',
            pisCst: item.pisCst || configQuery.data?.defaultPisCst,
            pisRate: item.pisRate !== undefined && item.pisRate !== '' ? Number(item.pisRate) : undefined,
            cofinsCst: item.cofinsCst || configQuery.data?.defaultCofinsCst,
            cofinsRate: item.cofinsRate !== undefined && item.cofinsRate !== '' ? Number(item.cofinsRate) : undefined,
            ...(operation.difal.applies ? { difal: { base: Number(item.difalBase), internalRate: Number(item.internalRate), interstateRate: Number(item.interstateRate), fcpRate: Number(item.fcpRate) } } : {}),
          } : {}),
        })),
      };
      return interstate ? fiscalApi.issueManualNfe({ ...data, ...operation }) : fiscalApi.issueManualNfce(data);
    },
    onSuccess: (document) => {
      setConfirmOpen(false);
      if (document.status === 'AUTHORIZED') {
        toast.success(`${noteLabel} autorizada`);
        navigate(`/erp/fiscal/${document.id}/danfe`, { state: { fromManualFiscal: true, shareFiscal: true } });
        return;
      }
      toast.error(document.statusMessage || `A SEFAZ retornou o status ${document.status}`);
      navigate('/erp/fiscal/history');
    },
    onError: (error: any) => {
      setConfirmOpen(false);
      toast.error(error.response?.data?.message || error.response?.data?.error || `Não foi possível emitir a ${noteLabel}`);
    },
  });

  const aiMutation = useMutation({
    mutationFn: () => fiscalApi.parseManualDraft({
      provider: aiProvider as AiProvider,
      prompt: aiPrompt.trim(),
    }),
    onSuccess: ({ draft, warnings, model }) => {
      const sameRecipient = draft.recipientTaxId.replace(/\D/g, '') === taxIdRef.current;
      if (!sameRecipient) { setCnpjResult(null); setAddressStatus(''); automaticAddress.current = null; }
      setOperation(current => {
        const base = sameRecipient ? current : emptyFiscalOperation;
        const address = { ...base.recipientAddress };
        for (const [key, value] of Object.entries(draft.recipientAddress || {})) {
          if (value) (address as any)[key] = value;
        }
        return { ...base, recipientAddress: address,
          finalConsumer: draft.finalConsumer ?? base.finalConsumer,
          freightMode: draft.freightMode || base.freightMode,
          difal: { applies: draft.difal?.applies ?? base.difal.applies, reason: draft.difal?.reason || base.difal.reason },
        };
      });
      setRecipientName(draft.recipientName);
      setRecipientTaxId(draft.recipientTaxId);
      setPaymentMethod(draft.paymentMethod);
      setNotes(draft.notes);
      setItems(draft.items.map((item) => ({
        id: crypto.randomUUID(),
        productCode: item.productCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ncm: item.ncm,
        cfop: item.cfop,
        advanced: Boolean(item.ncm || item.cfop),
      })));
      setAiWarnings(warnings);
      setLastAiModel(model);
      toast.success('Rascunho preenchido pela IA. Revise antes de emitir.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Não foi possível interpretar a venda');
    },
  });

  const selectedSettings = providersQuery.data?.providers.find((provider) => provider.id === settingsProvider);

  useEffect(() => {
    if (!selectedSettings) return;
    setSettingsModel(selectedSettings.model);
    setSettingsEnabled(selectedSettings.enabled);
    setSettingsDefault(selectedSettings.isDefault);
    setSettingsApiKey('');
  }, [settingsProvider, selectedSettings?.model, selectedSettings?.enabled, selectedSettings?.isDefault]);

  const saveAiSettingsMutation = useMutation<
    Awaited<ReturnType<typeof fiscalApi.saveAiProvider>>,
    any,
    boolean
  >({
    mutationFn: (clearKey: boolean) => fiscalApi.saveAiProvider(settingsProvider, {
      apiKey: clearKey ? undefined : settingsApiKey.trim() || undefined,
      model: settingsModel.trim(),
      enabled: settingsEnabled,
      isDefault: settingsDefault,
      clearKey,
    }),
    onSuccess: (data, clearKey) => {
      queryClient.setQueryData(['fiscal-ai-providers'], data);
      setSettingsApiKey('');
      if (clearKey) toast.success('Chave removida');
      else toast.success('Configuração de IA salva');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Não foi possível salvar a configuração');
    },
  });

  const testAiSettingsMutation = useMutation({
    mutationFn: () => fiscalApi.testAiProvider(settingsProvider),
    onSuccess: ({ model }) => toast.success(`Conexão realizada com ${model}`),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Falha ao testar o provedor');
    },
  });

  const updateItem = (id: string, changes: Partial<ManualItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return toast.error('A nota precisa ter pelo menos um item');
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addProductToDocument = (product: Product) => {
    const fiscalItem: ManualItem = {
      id: crypto.randomUUID(),
      productCode: product.barcode || product.id,
      description: product.name,
      quantity: 1,
      unitPrice: Number(product.price) || 0,
      ncm: product.ncm || '',
      cfop: product.cfop || '',
      advanced: Boolean(product.ncm || product.cfop),
    };

    setItems((current) => {
      const emptyIndex = current.findIndex((item) =>
        !item.description.trim() && !item.productCode.trim() && Number(item.unitPrice) === 0
      );
      if (emptyIndex < 0) return [...current, fiscalItem];
      return current.map((item, index) => (index === emptyIndex ? fiscalItem : item));
    });
    setProductSearch('');
    setDebouncedProductSearch('');
    toast.success(`${product.name} adicionado à nota`);
  };

  const requestConfirmation = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTaxId = recipientTaxId.replace(/\D/g, '');
    if (cleanTaxId && ![11, 14].includes(cleanTaxId.length)) return toast.error('Informe um CPF ou CNPJ válido');
    if (items.some((item) => item.description.trim().length < 2)) return toast.error('Preencha a descrição de todos os itens');
    if (items.some((item) => Number(item.quantity) <= 0)) return toast.error('A quantidade deve ser maior que zero');
    if (items.some((item) => Number(item.unitPrice) <= 0)) return toast.error('O preço deve ser maior que zero');
    if (interstate && (!operation.recipientAddress.taxpayerIndicator || operation.finalConsumer === null || !operation.freightMode || (!noDifal && operation.difal.applies === null))) return toast.error('Confirme contribuinte de ICMS, finalidade, transporte e DIFAL');
    if (interstate && (!recipientName.trim() || !cleanTaxId)) return toast.error('NF-e exige nome e CPF/CNPJ');
    if (interstate && items.some(item => !(internalNfe ? /^5\d{3}$/ : /^6\d{3}$/).test(item.cfop || (internalNfe ? configQuery.data?.defaultCfop || '' : '')))) return toast.error(`Informe o CFOP iniciado com ${internalNfe ? '5' : '6'} em cada item`);
    if (total <= 0) return toast.error('O total da nota deve ser maior que zero');
    setConfirmOpen(true);
  };

  const config = configQuery.data;
  const production = config?.environment === 'PRODUCTION';
  const configuredProviders = providersQuery.data?.providers.filter((provider) => provider.configured && provider.enabled) || [];
  const inputClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-700">Administração fiscal</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Emissor avulso de notas fiscais</h1>
          <p className="mt-1 text-sm text-gray-600">Emissão direta, sem cadastro de produto e sem movimentação de estoque.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${production ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <AlertTriangle className="h-4 w-4" />
          {production ? 'Ambiente de produção' : 'Ambiente de homologação'}
        </div>
      </header>

      <section className="rounded-md border border-indigo-200 bg-white p-4">
        <label className="text-sm font-semibold">Tipo de venda
          <select className="mt-2 block w-full rounded-md border border-gray-300 p-2 sm:ml-3 sm:mt-0 sm:inline-block sm:w-auto" value={interstate ? 'INTERSTATE' : 'LOCAL'} onChange={e => { setInterstate(e.target.value === 'INTERSTATE'); setConfirmOpen(false); }}>
            <option value="LOCAL">Venda ao consumidor final no DF — NFC-e</option>
            <option value="INTERSTATE">Revenda / entrega no DF ou em outro estado — NF-e</option>
          </select>
        </label>
        <p className="mt-2 text-xs text-gray-600">O CNPJ e o cadastro do emitente permanecem os mesmos. A UF de entrega define o destino da operação.</p>
      </section>
      <form onSubmit={requestConfirmation} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="border border-indigo-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-5 py-4">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-indigo-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-gray-950">Preencher com IA</h2>
                  <p className="mt-0.5 text-xs text-gray-600">Descreva a venda; a IA monta um rascunho para sua revisão.</p>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <label className="min-w-44 text-xs font-semibold text-gray-600">
                  Provedor
                  <select
                    value={aiProvider}
                    onChange={(event) => setAiProvider(event.target.value as AiProvider)}
                    className={`${inputClass} mt-1 bg-white`}
                    disabled={!configuredProviders.length}
                  >
                    {!configuredProviders.length && <option value="">Nenhum configurado</option>}
                    {configuredProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>{provider.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsProvider((aiProvider || providersQuery.data?.providers[0]?.id || 'gemini') as AiProvider);
                    setAiSettingsOpen(true);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100"
                  title="Configurar provedores de IA"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                className={`${inputClass} min-h-28 resize-y`}
                maxLength={5000}
                placeholder="Ex.: Venda para Maria, CPF 000.000.000-00, 2 vestidos envelope a R$ 179,90 cada, pagamento no Pix."
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  {lastAiModel
                    ? `Último rascunho: ${lastAiModel}`
                    : configuredProviders.length
                      ? 'A IA não emite a nota; ela apenas preenche os campos.'
                      : 'Configure uma chave de IA no botão de configurações.'}
                </div>
                <button
                  type="button"
                  onClick={() => aiMutation.mutate()}
                  disabled={!aiProvider || aiPrompt.trim().length < 5 || aiMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiMutation.isPending ? 'Interpretando...' : 'Preencher formulário'}
                </button>
              </div>
              {aiWarnings.length > 0 && (
                <div className="mt-4 border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase text-amber-800">Revise estes pontos</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {aiWarnings.map((warning) => <li key={warning}>• {warning}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-indigo-700" />
              <h2 className="font-semibold text-gray-950">Destinatário e pagamento</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Nome do cliente
                <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className={`${inputClass} mt-1.5`} required={interstate} placeholder="Consumidor não identificado" maxLength={120} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                CPF ou CNPJ
                <input value={recipientTaxId} onChange={(event) => changeRecipientTaxId(event.target.value)} className={`${inputClass} mt-1.5`} required={interstate} placeholder="Opcional para NFC-e" inputMode="numeric" maxLength={18} />
                {interstate && <button type="button" disabled={lookupCnpjMutation.isPending || taxIdRef.current.length !== 14} onClick={() => lookupCnpjMutation.mutate(taxIdRef.current)} className="mt-2 text-xs font-semibold text-indigo-700 disabled:text-gray-400">{lookupCnpjMutation.isPending ? 'Consultando CNPJ…' : 'Consultar endereço pelo CNPJ'}</button>}
              </label>
              <label className="text-sm font-medium text-gray-700">
                Forma de pagamento
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className={`${inputClass} mt-1.5`}>
                  {paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </section>

          {interstate && <>
            {(addressStatus || lookupCnpjMutation.isPending) && <div className="border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900" role="status">
              {lookupCnpjMutation.isPending ? 'Consultando o endereço cadastral do CNPJ…' : addressStatus}
              {cnpjResult && cnpjResult.recipientTaxId === taxIdRef.current && !lookupCnpjMutation.isPending && <button type="button" className="ml-2 font-semibold underline" onClick={() => {
                automaticAddress.current = { id: cnpjResult.recipientTaxId, address: cnpjResult.address };
                setOperation(current => ({ ...current, recipientAddress: { ...current.recipientAddress, ...cnpjResult.address, ...(!current.recipientAddress.taxpayerIndicator && cnpjResult.stateRegistration ? cnpjResult.stateRegistration : {}) } }));
                setAddressStatus('Endereço cadastral aplicado. Confira também o local da entrega abaixo.');
              }}>Usar endereço do CNPJ</button>}
            </div>}
            <FiscalDestination value={operation} config={config} onChange={setOperation} />
          </>}
          <section className="border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-950">Itens da nota</h2>
                <p className="mt-0.5 text-xs text-gray-500">{interstate ? 'A entrega define se o CFOP começa com 5 (interna) ou 6 (interestadual). Confira os códigos com a orientação contábil.' : 'NCM e CFOP usam os padrões da Central Fiscal.'}</p>
              </div>
              <button type="button" onClick={() => setItems((current) => [...current, newItem()])} className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
                <Plus className="h-4 w-4" /> Adicionar item
              </button>
            </div>

            <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
              <label className="text-xs font-bold uppercase text-gray-600">Buscar produto no ERP</label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  className={`${inputClass} pl-9`}
                  placeholder="Nome, código, categoria, tamanho ou estampa"
                  autoComplete="off"
                />
              </div>

              {debouncedProductSearch.length >= 2 && (
                <div className="mt-2 max-h-72 divide-y divide-gray-200 overflow-y-auto border border-gray-200 bg-white">
                  {productsQuery.isLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando produtos...
                    </div>
                  )}
                  {!productsQuery.isLoading && productsQuery.data?.data.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-600">Nenhum produto encontrado.</p>
                  )}
                  {productsQuery.data?.data.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProductToDocument(product)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-indigo-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-950">{product.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {product.barcode || 'Sem código'} · {product.size?.name || 'Sem tamanho'} · estoque {product.stock}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <strong className="text-sm text-gray-950">{money(Number(product.price) || 0)}</strong>
                        <PackagePlus className="h-4 w-4 text-indigo-700" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
                  {(item.advanced || interstate) && (
                    <div className="mt-3 grid gap-3 border-l-2 border-indigo-100 pl-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-gray-600">
                        NCM
                        <input value={item.ncm} onChange={(event) => updateItem(item.id, { ncm: event.target.value })} className={`${inputClass} mt-1`} placeholder={config?.defaultNcm || 'Padrão fiscal'} inputMode="numeric" maxLength={8} />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        CFOP
                        <input value={item.cfop} onChange={(event) => updateItem(item.id, { cfop: event.target.value })} className={`${inputClass} mt-1`} required={interstate && !internalNfe} placeholder={interstate && !internalNfe ? '6xxx (contador)' : config?.defaultCfop || 'Padrão fiscal'} inputMode="numeric" maxLength={4} />
                      </label>
                      {interstate && <>
                        {([['icmsCst', 'CST/CSOSN ICMS', config?.defaultIcmsCst], ['icmsRate', 'Alíquota ICMS (%)', ''], ['fiscalOrigin', 'Origem da mercadoria', '0'], ['pisCst', 'CST PIS', config?.defaultPisCst], ['pisRate', 'Alíquota PIS (%)', ''], ['cofinsCst', 'CST COFINS', config?.defaultCofinsCst], ['cofinsRate', 'Alíquota COFINS (%)', '']] as const).map(([key, label, placeholder]) => <label key={key} className="text-xs font-medium text-gray-700">{label}<input className={`${inputClass} mt-1`} value={item[key] || ''} placeholder={placeholder || 'Conforme tributação'} onChange={e => updateItem(item.id, { [key]: e.target.value })} /></label>)}
                        {operation.difal.applies && ([['difalBase', 'Base DIFAL (R$)'], ['internalRate', 'Alíquota interna destino (%)'], ['interstateRate', 'Alíquota interestadual (%)'], ['fcpRate', 'FCP (%)']] as const).map(([key, label]) => <label key={key} className="text-xs font-medium text-gray-700">{label}<input required type="number" min="0" step="0.0001" className={`${inputClass} mt-1`} value={item[key] || ''} onChange={e => updateItem(item.id, { [key]: e.target.value })} /></label>)}
                      </>}

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
            <p className="text-xs font-semibold uppercase text-gray-500">Total da {noteLabel}</p>
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
              <div className="flex justify-between"><span className="text-gray-600">Documento</span><strong>{noteLabel}{interstate ? ` — entrega em ${operation.deliveryAddress?.stateCode || operation.recipientAddress.stateCode}` : ' — venda local'}</strong></div>
              {interstate && <div className="flex justify-between"><span className="text-gray-600">Série / próximo número NF-e</span><strong>{config?.nfeSeries} / {config?.nextNfeNumber}</strong></div>}
              <div className="flex justify-between"><span className="text-gray-600">Itens</span><strong>{items.length}</strong></div>
              <div className="flex justify-between text-base"><span className="font-semibold">Total</span><strong>{money(total)}</strong></div>
              {production && <div className="flex gap-2 border border-rose-200 bg-rose-50 p-3 text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Esta é uma emissão real em ambiente de produção.</span></div>}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Voltar</button>
              <button type="button" onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {issueMutation.isPending ? 'Transmitindo...' : `Emitir ${noteLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {aiSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-200 p-5">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 items-center justify-center bg-indigo-600 text-white">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-950">Configurar inteligência artificial</h2>
                  <p className="mt-1 text-sm text-gray-600">As chaves são criptografadas no backend e não voltam para o navegador.</p>
                </div>
              </div>
              <button type="button" onClick={() => setAiSettingsOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block text-sm font-semibold text-gray-700">
                Provedor
                <select value={settingsProvider} onChange={(event) => setSettingsProvider(event.target.value as AiProvider)} className={`${inputClass} mt-1.5`}>
                  {providersQuery.data?.providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Chave da API
                <input
                  type="password"
                  value={settingsApiKey}
                  onChange={(event) => setSettingsApiKey(event.target.value)}
                  className={`${inputClass} mt-1.5`}
                  placeholder={selectedSettings?.configured ? 'Chave já configurada; digite apenas para substituir' : 'Cole a chave do provedor'}
                  autoComplete="new-password"
                  maxLength={1000}
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Modelo
                <input value={settingsModel} onChange={(event) => setSettingsModel(event.target.value)} className={`${inputClass} mt-1.5`} maxLength={160} />
              </label>

              <div className="flex flex-wrap gap-5 border-y border-gray-200 py-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input type="checkbox" checked={settingsEnabled} onChange={(event) => setSettingsEnabled(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
                  Provedor ativo
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input type="checkbox" checked={settingsDefault} onChange={(event) => setSettingsDefault(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
                  Usar como padrão
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                <span>
                  {selectedSettings?.configured
                    ? `Chave configurada via ${selectedSettings.source === 'database' ? 'ERP' : 'ambiente do servidor'}.`
                    : 'Nenhuma chave configurada.'}
                </span>
                {selectedSettings?.configured && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Remover a chave salva para este provedor?')) saveAiSettingsMutation.mutate(true);
                    }}
                    disabled={saveAiSettingsMutation.isPending}
                    className="font-semibold text-rose-700 hover:text-rose-800 disabled:opacity-50"
                  >
                    Remover chave
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 p-5">
              <button
                type="button"
                onClick={() => testAiSettingsMutation.mutate()}
                disabled={!selectedSettings?.configured || testAiSettingsMutation.isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testAiSettingsMutation.isPending ? 'Testando...' : 'Testar conexão'}
              </button>
              <button
                type="button"
                onClick={() => saveAiSettingsMutation.mutate(false)}
                disabled={!settingsModel.trim() || saveAiSettingsMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveAiSettingsMutation.isPending ? 'Salvando...' : 'Salvar configuração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
