import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Check,
  CreditCard,
  Grid3X3,
  ImageOff,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  categoryService,
  paymentGatewayApi,
  productService,
  saleService,
  subcategoryService,
} from '../services/api';
import { Product } from '../types';
import { getProductCardImageUrl, getImageUrl } from '../utils/imageUrl';
import { productDisplayName, productSearchText } from '../utils/productDisplayName';

interface CartItem {
  key: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  manual?: {
    description: string;
    barcode?: string;
    categoryName: string;
    subcategoryName?: string;
  };
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const storeStock = (product: Product) =>
  Number.isFinite(Number(product.stockLoja)) ? Number(product.stockLoja) : Number(product.stock || 0);

const moneyInput = (value: string) => {
  const normalized = value.replace(/[^\d,]/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const productImage = (product: Product) => {
  const image = [...(product.images || [])].sort((a, b) => a.position - b.position)[0]?.url;
  return getProductCardImageUrl(image || product.imageUrl);
};

export default function Pdv() {
  const queryClient = useQueryClient();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [showPayment, setShowPayment] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [discount, setDiscount] = useState('');
  const [missingCode, setMissingCode] = useState('');
  const [showManualItem, setShowManualItem] = useState(false);
  const [manualItem, setManualItem] = useState({ description: '', categoryId: '', subcategoryId: '', unitPrice: '' });
  const [pixModal, setPixModal] = useState<{ qr: string; copyPaste: string } | null>(null);

  const productsQuery = useQuery({
    queryKey: ['pdv-products'],
    queryFn: () => productService.list({ page: 1, limit: 100, active: true }),
    staleTime: 30_000,
  });
  const categoriesQuery = useQuery({
    queryKey: ['pdv-categories'],
    queryFn: categoryService.list,
    staleTime: 60_000,
  });
  const subcategoriesQuery = useQuery({
    queryKey: ['pdv-subcategories'],
    queryFn: () => subcategoryService.list(),
    staleTime: 60_000,
  });

  const products = productsQuery.data?.data || [];
  const categories = (categoriesQuery.data || []).filter((category) => category.active);
  const subcategories = (subcategoriesQuery.data || []).filter((subcategory) => subcategory.active);
  const manualSubcategories = subcategories.filter((subcategory) => subcategory.categoryId === manualItem.categoryId);
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return products.filter((product) => {
      const matchesCategory = categoryId === 'all' || product.categoryId === categoryId;
      const matchesSearch =
        !term ||
        productSearchText(product).includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [categoryId, products, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const safeDiscount = Math.min(Math.max(moneyInput(discount), 0), subtotal);
  const total = Math.max(0, subtotal - safeDiscount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  const addProduct = (product: Product) => {
    const available = storeStock(product);
    if (available <= 0) {
      toast.error(`${product.name} está sem estoque na loja`);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.product?.id === product.id);
      if (existing) {
        if (existing.quantity >= available) {
          toast.error(`Estoque máximo de ${available} unidade(s)`);
          return current;
        }
        return current.map((item) =>
          item.product?.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { key: product.id, product, quantity: 1, unitPrice: Number(product.price) }];
    });
  };

  const changeQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.key !== key));
      return;
    }
    setCart((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        if (!item.product) return { ...item, quantity };
        const available = storeStock(item.product);
        if (quantity > available) {
          toast.error(`Estoque máximo de ${available} unidade(s)`);
          return item;
        }
        return { ...item, quantity };
      }),
    );
  };

  const scanMutation = useMutation({
    mutationFn: productService.searchByCode,
    onSuccess: (product) => {
      addProduct(product);
      setScanCode('');
      setMissingCode('');
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
    },
    onError: (error: any) => {
      setMissingCode(scanCode.trim());
      toast.error(error.response?.data?.message || 'Produto não encontrado');
      setScanCode('');
      window.setTimeout(() => scanInputRef.current?.focus(), 0);
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => saleService.create(data),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['pdv-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(`Venda #${sale.saleNumber} concluída`);
      resetSale();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Erro ao criar venda');
    },
  });

  const pixMutation = useMutation({
    mutationFn: () => paymentGatewayApi.payPix(total, 'Venda PDV', 'comprador@amoras.com'),
    onSuccess: (result: any) =>
      setPixModal({
        qr: result.point_of_interaction.transaction_data.qr_code_base64,
        copyPaste: result.point_of_interaction.transaction_data.qr_code,
      }),
    onError: () => toast.error('Não foi possível gerar a cobrança Pix'),
  });

  const resetSale = () => {
    setCart([]);
    setCustomerName('');
    setCustomerTaxId('');
    setPaymentMethod('');
    setDiscount('');
    setShowPayment(false);
    setPixModal(null);
  };

  const confirmSale = () => {
    if (!paymentMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    const unavailable = cart.find((item) => item.product && item.quantity > storeStock(item.product));
    if (unavailable) {
      toast.error(`Estoque insuficiente para ${unavailable.product?.name}`);
      setShowPayment(false);
      return;
    }
    createSaleMutation.mutate({
      items: cart.map((item) => item.product ? ({ productId: item.product.id, quantity: item.quantity, unitPrice: item.unitPrice }) : ({
        quantity: item.quantity, unitPrice: item.unitPrice, description: item.manual!.description,
        barcode: item.manual!.barcode, categoryName: item.manual!.categoryName, subcategoryName: item.manual!.subcategoryName,
      })),
      discount: safeDiscount,
      paymentMethod,
      leadName: customerName || undefined,
      customerTaxId: customerTaxId || undefined,
    });
  };

  const submitScan = (event: React.FormEvent) => {
    event.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    scanMutation.mutate(code);
  };

  const addManualItem = () => {
    const category = categories.find((item) => item.id === manualItem.categoryId);
    const subcategory = subcategories.find((item) => item.id === manualItem.subcategoryId);
    const unitPrice = moneyInput(manualItem.unitPrice);
    if (!manualItem.description.trim() || !category || !manualItem.unitPrice.trim()) {
      toast.error('Informe nome, categoria e preço da peça');
      return;
    }
    setCart((current) => [...current, {
      key: `manual-${crypto.randomUUID()}`,
      quantity: 1,
      unitPrice,
      manual: {
        description: manualItem.description.trim(),
        barcode: missingCode || undefined,
        categoryName: category.name,
        subcategoryName: subcategory?.name,
      },
    }]);
    setManualItem({ description: '', categoryId: '', subcategoryId: '', unitPrice: '' });
    setMissingCode('');
    setShowManualItem(false);
    toast.success('Peça avulsa adicionada. O estoque não será alterado.');
  };

  return (
    <div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden bg-[#eef1f4] text-slate-900 xl:overflow-hidden">
      <div className="flex min-h-full min-w-0 flex-col xl:h-full xl:min-h-0 xl:flex-row">
        <section className="flex min-h-[42rem] min-w-0 w-full flex-col border-b border-slate-300 bg-white xl:h-full xl:min-h-0 xl:w-[clamp(23rem,30vw,27rem)] xl:flex-none xl:border-b-0 xl:border-r">
          <header className="flex h-14 flex-none items-center justify-between border-b border-slate-200 bg-[#116e78] px-4 text-white">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6" />
              <div>
                <h1 className="text-lg font-semibold">PDV Amoras</h1>
                <p className="text-xs text-cyan-100">Venda em andamento</p>
              </div>
            </div>
            <button
              type="button"
              title="Limpar venda"
              onClick={() => {
                if (!cart.length || window.confirm('Limpar todos os itens desta venda?')) resetSale();
              }}
              className="grid h-10 w-10 place-items-center border border-white/30 bg-white/10 hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-none border-b border-slate-200 p-3">
            <form onSubmit={submitScan} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#116e78]" />
                <input
                  ref={scanInputRef}
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="Leia ou digite o código de barras"
                  className="h-11 w-full min-w-0 border border-slate-300 bg-slate-50 pl-11 pr-3 font-mono text-sm outline-none focus:border-[#116e78] focus:ring-2 focus:ring-cyan-100"
                />
              </div>
              <button
                type="submit"
                title="Adicionar pelo código"
                disabled={!scanCode.trim() || scanMutation.isPending}
                className="grid h-11 w-11 flex-none place-items-center bg-[#116e78] text-white hover:bg-[#0d5961] disabled:opacity-40"
              >
                {scanMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              </button>
            </form>
            <button type="button" onClick={() => setShowManualItem(true)} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 border border-dashed border-[#116e78] bg-cyan-50 px-3 text-sm font-semibold text-[#0d5961] hover:bg-cyan-100">
              <Plus className="h-4 w-4" /> Adicionar peça sem cadastro
            </button>
            {missingCode && (
              <button type="button" onClick={() => { setManualItem((current) => ({ ...current, description: `Peça sem cadastro (${missingCode})` })); setShowManualItem(true); }} className="mt-2 w-full border border-amber-400 bg-amber-50 px-3 py-2 text-left text-sm font-semibold text-amber-900 hover:bg-amber-100">
                Código {missingCode} não cadastrado · adicionar peça avulsa
              </button>
            )}
          </div>

          <div className="custom-scrollbar min-h-[18rem] flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-[24rem] flex-col items-center justify-center px-8 text-center text-slate-400">
                <PackageOpen className="mb-4 h-14 w-14" />
                <p className="font-medium text-slate-600">Nenhum produto na venda</p>
                <p className="mt-1 max-w-xs text-sm">
                  Use o leitor de código de barras ou escolha um produto no catálogo.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {cart.map((item, index) => (
                  <article key={item.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-2 px-3 py-3">
                    <span className="pt-1 text-[11px] font-semibold text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">{item.product?.name || item.manual?.description}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {money(item.unitPrice)} · {item.product ? `estoque ${storeStock(item.product)}` : `${[item.manual?.categoryName, item.manual?.subcategoryName].filter(Boolean).join(' · ')} · sem estoque`}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          type="button"
                          title="Diminuir quantidade"
                          onClick={() => changeQuantity(item.key, item.quantity - 1)}
                          className="grid h-8 w-8 place-items-center border border-slate-300 hover:bg-slate-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="grid h-8 min-w-10 place-items-center border-y border-slate-300 px-2 text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          title="Aumentar quantidade"
                          disabled={Boolean(item.product && item.quantity >= storeStock(item.product))}
                          onClick={() => changeQuantity(item.key, item.quantity + 1)}
                          className="grid h-8 w-8 place-items-center border border-slate-300 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        type="button"
                        title="Remover produto"
                        onClick={() => changeQuantity(item.key, 0)}
                        className="grid h-8 w-8 place-items-center text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <strong className="text-sm">{money(item.quantity * item.unitPrice)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <footer className="flex-none border-t border-slate-300 bg-slate-50 p-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><span className="block text-xs uppercase text-slate-500">Itens</span><strong>{itemCount}</strong></div>
              <div><span className="block text-xs uppercase text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div><span className="block text-xs uppercase text-slate-500">Desconto</span><strong>{money(safeDiscount)}</strong></div>
            </div>
            <div className="my-3 flex items-end justify-between border-y border-slate-300 py-2.5">
              <span className="text-sm font-semibold uppercase text-slate-500">Total</span>
              <strong className="text-2xl font-bold text-[#116e78]">{money(total)}</strong>
            </div>
            <button
              type="button"
              disabled={!cart.length}
              onClick={() => setShowPayment(true)}
              className="flex h-12 w-full items-center justify-center gap-3 bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CreditCard className="h-5 w-5" />
              Receber e finalizar
            </button>
          </footer>
        </section>

        <section className="flex min-h-[42rem] min-w-0 flex-1 flex-col bg-[#eef1f4] xl:h-full xl:min-h-0">
          <header className="flex-none border-b border-slate-300 bg-white p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar categoria, subcategoria, estampa, tamanho ou código"
                  className="h-11 w-full min-w-0 border border-slate-300 bg-white pl-11 pr-10 text-sm outline-none focus:border-[#116e78] focus:ring-2 focus:ring-cyan-100"
                />
                {search && (
                  <button
                    type="button"
                    title="Limpar pesquisa"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex h-11 flex-none items-center gap-2 border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-600">
                <Grid3X3 className="h-5 w-5 text-[#116e78]" />
                {visibleProducts.length} produtos
              </div>
            </div>
          </header>

          <nav className="custom-scrollbar flex min-w-0 flex-none gap-2 overflow-x-auto border-b border-slate-300 bg-white p-2.5">
            <button
              type="button"
              onClick={() => setCategoryId('all')}
              className={`h-10 flex-none border px-4 text-sm font-semibold ${
                categoryId === 'all'
                  ? 'border-[#116e78] bg-[#116e78] text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-[#116e78]'
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => setCategoryId(category.id)}
                className={`h-10 flex-none border px-4 text-sm font-semibold ${
                  categoryId === category.id
                    ? 'border-[#116e78] bg-[#116e78] text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-[#116e78]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>

          <div className="custom-scrollbar min-w-0 flex-1 overflow-y-auto p-3">
            {productsQuery.isLoading ? (
              <div className="grid min-h-80 place-items-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-[#116e78]" />
              </div>
            ) : visibleProducts.length ? (
              <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(11rem,100%),1fr))] gap-3">
                {visibleProducts.map((product) => {
                  const image = productImage(product);
                  const available = storeStock(product);
                  return (
                    <button
                      type="button"
                      key={product.id}
                      disabled={available <= 0}
                      onClick={() => addProduct(product)}
                      className="group flex min-h-[12rem] min-w-0 flex-col overflow-hidden border border-slate-300 bg-white text-left hover:border-[#116e78] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                        {image ? (
                          <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        ) : (
                          <div className="grid h-full place-items-center text-slate-300"><ImageOff className="h-8 w-8" /></div>
                        )}
                        <span className={`absolute right-2 top-2 px-2 py-1 text-[11px] font-bold ${available > 0 ? 'bg-white/95 text-emerald-700' : 'bg-rose-600 text-white'}`}>
                          {available > 0 ? `${available} un.` : 'Sem estoque'}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <h2 className="line-clamp-3 min-h-15 text-sm font-semibold leading-5">{productDisplayName(product)}</h2>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {product.barcode || 'Sem código'}
                        </p>
                        <strong className="mt-auto pt-2 text-base text-[#116e78]">{money(Number(product.price))}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center text-center text-slate-500">
                <div>
                  <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="font-medium">Nenhum produto encontrado</p>
                  <p className="mt-1 text-sm">Tente outro nome, código ou categoria.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {showManualItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="text-lg font-bold">Adicionar peça sem cadastro</h2><p className="text-sm text-slate-500">Esta venda não criará produto nem movimentará estoque.</p></div>
              <button type="button" onClick={() => setShowManualItem(false)} className="grid h-9 w-9 place-items-center hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="space-y-4 p-5">
              {missingCode && <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Código bipado: <strong className="font-mono">{missingCode}</strong></p>}
              <label className="block text-sm font-medium">Nome da peça<input value={manualItem.description} onChange={(event) => setManualItem((current) => ({ ...current, description: event.target.value }))} className="mt-1 h-11 w-full border border-slate-300 px-3 font-normal" placeholder="Ex.: Vestido liso" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Categoria<select value={manualItem.categoryId} onChange={(event) => setManualItem((current) => ({ ...current, categoryId: event.target.value, subcategoryId: '' }))} className="mt-1 h-11 w-full border border-slate-300 bg-white px-3 font-normal"><option value="">Selecionar</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="block text-sm font-medium">Subcategoria <span className="font-normal text-slate-500">(opcional)</span><select disabled={!manualItem.categoryId} value={manualItem.subcategoryId} onChange={(event) => setManualItem((current) => ({ ...current, subcategoryId: event.target.value }))} className="mt-1 h-11 w-full border border-slate-300 bg-white px-3 font-normal disabled:bg-slate-100"><option value="">Não informar</option>{manualSubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              </div>
              <label className="block text-sm font-medium">Preço (R$)<input type="text" inputMode="decimal" value={manualItem.unitPrice} onChange={(event) => setManualItem((current) => ({ ...current, unitPrice: event.target.value.replace(/[^\d,]/g, '') }))} className="mt-1 h-11 w-full border border-slate-300 px-3 font-normal" placeholder="Ex.: 89,90" /></label>
            </div>
            <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setShowManualItem(false)} className="h-11 border border-slate-300 px-4 font-semibold">Cancelar</button><button type="button" onClick={addManualItem} className="h-11 bg-[#116e78] px-5 font-semibold text-white">Adicionar à venda</button></footer>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">Finalizar venda</h2>
                <p className="text-sm text-slate-500">{itemCount} item(ns) · {money(total)}</p>
              </div>
              <button type="button" title="Fechar" onClick={() => setShowPayment(false)} className="grid h-10 w-10 place-items-center hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound className="h-5 w-5 text-[#116e78]" /> Cliente
                </div>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome opcional" className="h-11 w-full border border-slate-300 px-3 outline-none focus:border-[#116e78]" />
                <input value={customerTaxId} onChange={(event) => setCustomerTaxId(event.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="CPF/CNPJ na nota (opcional)" className="h-11 w-full border border-slate-300 px-3 font-mono outline-none focus:border-[#116e78]" />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Desconto em reais</span>
                  <input type="text" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value.replace(/[^\d,]/g, ''))} placeholder="Ex.: 15,00" className="h-11 w-full border border-slate-300 px-3 outline-none focus:border-[#116e78]" />
                </label>
                <p className="border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">A venda será finalizada sem emitir nota. Se precisar, emita depois pela tela de Vendas.</p>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">Forma de pagamento</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['CASH', 'Dinheiro', Banknote],
                    ['PIX', 'Pix', Smartphone],
                    ['CREDIT_CARD', 'Crédito', CreditCard],
                    ['DEBIT_CARD', 'Débito', CreditCard],
                  ].map(([value, label, Icon]: any) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex h-20 flex-col items-center justify-center gap-2 border text-sm font-semibold ${
                        paymentMethod === value
                          ? 'border-[#116e78] bg-cyan-50 text-[#116e78]'
                          : 'border-slate-300 text-slate-600 hover:border-[#116e78]'
                      }`}
                    >
                      <Icon className="h-6 w-6" /> {label}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'PIX' && (
                  <button type="button" onClick={() => pixMutation.mutate()} disabled={pixMutation.isPending} className="mt-3 h-11 w-full border border-emerald-600 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    {pixMutation.isPending ? 'Gerando cobrança...' : 'Gerar QR Code Pix'}
                  </button>
                )}
                <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Desconto</span><span>- {money(safeDiscount)}</span></div>
                  <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-[#116e78]">{money(total)}</span></div>
                </div>
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowPayment(false)} className="h-12 border border-slate-300 px-6 font-semibold text-slate-600 hover:bg-white">Voltar</button>
              <button type="button" onClick={confirmSale} disabled={!paymentMethod || createSaleMutation.isPending} className="flex h-12 items-center justify-center gap-2 bg-emerald-600 px-8 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                {createSaleMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                Confirmar pagamento
              </button>
            </footer>
          </div>
        </div>
      )}

      {pixModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm bg-white p-6 text-center shadow-2xl">
            <h2 className="text-lg font-bold">Pagamento por Pix</h2>
            <img src={`data:image/png;base64,${pixModal.qr}`} alt="QR Code Pix" className="mx-auto my-5 h-56 w-56" />
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Pix copia e cola</p>
            <div className="max-h-20 overflow-y-auto break-all bg-slate-100 p-3 text-left text-xs">{pixModal.copyPaste}</div>
            <button type="button" onClick={() => setPixModal(null)} className="mt-5 h-11 w-full bg-[#116e78] font-semibold text-white">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
