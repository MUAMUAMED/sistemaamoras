import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, EyeIcon, CreditCardIcon, QrCodeIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { saleService, productService, fiscalApi } from '../services/api';
import { Sale, Product } from '../types';
import toast from 'react-hot-toast';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductSelector from '../components/ProductSelector';

export default function Sales() {
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [saleForInvoice, setSaleForInvoice] = useState<Sale | null>(null);
  const [invoiceTaxId, setInvoiceTaxId] = useState('');
  
  // Estados para nova venda
  const [newSale, setNewSale] = useState({
    customerName: '',
    customerPhone: '',
    paymentMethod: '',
    items: [] as Array<{ productId: string; quantity: number; product?: Product }>,
  });

  const queryClient = useQueryClient();

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', searchTerm, statusFilter],
    queryFn: () => saleService.list({ search: searchTerm, status: statusFilter }),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.list(),
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('🛒 [FRONTEND] Chamando API para criar venda:', data);
      return saleService.create(data);
    },
    onSuccess: (data) => {
      console.log('🛒 [FRONTEND] Venda criada com sucesso na API:', data);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Venda criada com sucesso!');
      setShowModal(false);
      setNewSale({ customerName: '', customerPhone: '', paymentMethod: '', items: [] });
    },
    onError: (error: any) => {
      console.error('🛒 [FRONTEND] Erro ao criar venda:', error);
      console.error('🛒 [FRONTEND] Detalhes do erro:', error.response?.data);
      toast.error(error.response?.data?.message || 'Erro ao criar venda');
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('🗑️ [FRONTEND] Chamando API para excluir venda:', id);
      return saleService.delete(id);
    },
    onSuccess: (data) => {
      console.log('🗑️ [FRONTEND] Venda excluída com sucesso na API:', data);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(`Venda #${data.saleNumber} excluída com sucesso!`);
      setSaleToDelete(null);
    },
    onError: (error: any) => {
      console.error('🗑️ [FRONTEND] Erro ao excluir venda:', error);
      console.error('🗑️ [FRONTEND] Detalhes do erro:', error.response?.data);
      toast.error(error.response?.data?.message || 'Erro ao excluir venda');
    },
  });

  const issueNfceMutation = useMutation({
    mutationFn: async ({ sale, customerTaxId }: { sale: Sale; customerTaxId?: string }) => {
      if (customerTaxId !== undefined) await saleService.updateCustomerTaxId(sale.id, { customerTaxId, leadName: sale.leadName });
      return fiscalApi.issueNfce(sale.id);
    },
    onSuccess: (document, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(document.status === 'AUTHORIZED' ? `NFC-e ${document.series}/${document.number} emitida` : 'NFC-e enviada para processamento');
      setSaleForInvoice(null);
      setInvoiceTaxId('');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Não foi possível emitir a nota fiscal'),
  });

  const beginInvoice = (sale: Sale) => {
    setSaleForInvoice(sale);
    setInvoiceTaxId(sale.customerTaxId || '');
  };

  const sales = salesData?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Pago';
      case 'PENDING':
        return 'Pendente';
      case 'CANCELLED':
        return 'Cancelada';
      case 'REFUNDED':
        return 'Reembolsada';
      default:
        return status;
    }
  };

  const addItemToSale = () => {
    setNewSale(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1 }]
    }));
  };

  const removeItemFromSale = (index: number) => {
    setNewSale(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    setNewSale(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleProductFound = (product: Product) => {
    // Verificar se o produto já está no carrinho
    const existingItemIndex = newSale.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Se já existe, aumentar a quantidade
      setNewSale(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === existingItemIndex 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }));
    } else {
      // Se não existe, adicionar novo item
      setNewSale(prev => ({
        ...prev,
        items: [...prev.items, { productId: product.id, quantity: 1 }]
      }));
    }
    
    setShowScanner(false);
    toast.success(`${product.name} adicionado à venda!`);
  };

  const handleProductSelect = (product: Product) => {
    // Verificar se o produto já está no carrinho
    const existingItemIndex = newSale.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Se já existe, aumentar a quantidade
      setNewSale(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === existingItemIndex 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }));
      toast.success(`Quantidade de ${product.name} aumentada!`);
    } else {
      // Se não existe, adicionar novo item
      setNewSale(prev => ({
        ...prev,
        items: [...prev.items, { productId: product.id, quantity: 1 }]
      }));
      toast.success(`${product.name} adicionado à venda!`);
    }
  };

  const handleDeleteSale = (sale: Sale) => {
    setSaleToDelete(sale);
  };

  const confirmDeleteSale = () => {
    if (saleToDelete) {
      deleteSaleMutation.mutate(saleToDelete.id);
    }
  };

  const handleCreateSale = () => {
    console.log('🛒 [FRONTEND] Iniciando criação de venda...');
    console.log('🛒 [FRONTEND] Dados do formulário:', newSale);
    
    if (!newSale.paymentMethod) {
      toast.error('Selecione um método de pagamento');
      return;
    }

    if (newSale.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    // Validar se todos os itens têm produto selecionado
    const invalidItems = newSale.items.filter(item => !item.productId);
    if (invalidItems.length > 0) {
      toast.error('Todos os itens devem ter um produto selecionado');
      return;
    }

    const saleData = {
      items: newSale.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      paymentMethod: newSale.paymentMethod,
      leadName: newSale.customerName || undefined,
      leadPhone: newSale.customerPhone || undefined,
      notes: newSale.customerName ? `Cliente: ${newSale.customerName}${newSale.customerPhone ? ` - Tel: ${newSale.customerPhone}` : ''}` : undefined,
    };

    console.log('🛒 [FRONTEND] Dados que serão enviados para API:', saleData);
    createSaleMutation.mutate(saleData);
  };

  const getTotalAmount = () => {
    return newSale.items.reduce((total, item) => {
      const product = products?.data?.find((p: Product) => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">Gerencie suas vendas e faturamento</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nova Venda</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ID da venda ou cliente..."
              className="input-field"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">Todos os status</option>
              <option value="PAID">Pago</option>
              <option value="PENDING">Pendente</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="REFUNDED">Reembolsada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de vendas */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales?.map((sale: Sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    #{sale.saleNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {sale.leadName || sale.lead?.name || 'Cliente não informado'}
                    </div>
                    {(sale.leadPhone || sale.lead?.phone) && (
                      <div className="text-xs text-gray-500">
                        {sale.leadPhone || sale.lead?.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {sale.paymentMethod || 'Não informado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                      {getStatusLabel(sale.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSale(sale);
                          setShowModal(true);
                        }}
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        title="Ver detalhes"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {sale.status === 'PAID' && (
                        <button onClick={() => beginInvoice(sale)} className="inline-flex min-h-9 items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 text-emerald-700 hover:bg-emerald-100" title="Emitir nota fiscal">
                          <DocumentTextIcon className="h-4 w-4" /><span className="hidden lg:inline">Nota</span>
                        </button>
                      )}
                      {(sale.status === 'PAID' || sale.status === 'PENDING') && (
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          title="Excluir venda"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(!sales || sales.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma venda encontrada</p>
          </div>
        )}
      </div>

      {/* Modal de nova venda */}
      {showModal && !selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nova Venda</h3>
              
              <div className="space-y-4">
                {/* Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome do Cliente (opcional)</label>
                    <input
                      type="text"
                      value={newSale.customerName}
                      onChange={(e) => setNewSale(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Nome do cliente"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone (opcional)</label>
                    <input
                      type="tel"
                      value={newSale.customerPhone}
                      onChange={(e) => setNewSale(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Método de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Método de Pagamento *</label>
                  <select 
                    value={newSale.paymentMethod}
                    onChange={(e) => setNewSale(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Selecione</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                    <option value="DEBIT_CARD">Cartão de Débito</option>
                    <option value="BANK_SLIP">Boleto</option>
                  </select>
                </div>

                {/* Itens */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Itens da Venda *</label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                      >
                        <QrCodeIcon className="h-4 w-4 mr-1" />
                        Scanner
                      </button>
                    </div>
                  </div>
                  
                  {/* Seletor de produtos avançado */}
                  <div className="mb-4">
                    <ProductSelector
                      products={products?.data || []}
                      onProductSelect={handleProductSelect}
                      placeholder="Pesquisar produto por nome, categoria, padrão ou código..."
                      className="w-full"
                    />
                  </div>
                  
                  {/* Lista de itens adicionados */}
                  {newSale.items.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="text-sm font-medium text-gray-700">Itens Selecionados:</h4>
                      {newSale.items.map((item, index) => {
                        const product = products?.data?.find((p: Product) => p.id === item.productId);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{product?.name || 'Produto não encontrado'}</div>
                              <div className="text-xs text-gray-500">
                                {product?.category?.name && `${product.category.name}`}
                                {product?.pattern?.name && ` • ${product.pattern.name}`}
                                {product?.barcode && ` • Código: ${product.barcode}`}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="font-medium text-sm">R$ {product?.price?.toFixed(2) || '0.00'}</div>
                                <div className="text-xs text-gray-500">Estoque: {product?.stock || 0}</div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={product?.stock || 1}
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                  placeholder="Qtd"
                                />
                                <button
                                  onClick={() => removeItemFromSale(index)}
                                  className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                                  title="Remover item"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {newSale.items.length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-500">Nenhum item adicionado</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Use a pesquisa acima ou o scanner para adicionar produtos
                      </p>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    Total: R$ {getTotalAmount().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setNewSale({ customerName: '', customerPhone: '', paymentMethod: '', items: [] });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateSale}
                  disabled={createSaleMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createSaleMutation.isPending ? 'Criando...' : 'Criar Venda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Scanner */}
      {saleForInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Emitir nota fiscal</h3>
            <p className="mt-1 text-sm text-gray-600">Venda #{saleForInvoice.saleNumber}. O CPF/CNPJ é opcional; deixe vazio para emitir para consumidor não identificado.</p>
            <label className="mt-5 block text-sm font-medium text-gray-700">CPF ou CNPJ do cliente (opcional)
              <input value={invoiceTaxId} inputMode="numeric" onChange={(event) => setInvoiceTaxId(event.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="Somente números" className="input-field mt-1 font-mono" />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => { setSaleForInvoice(null); setInvoiceTaxId(''); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancelar</button>
              <button onClick={() => issueNfceMutation.mutate({ sale: saleForInvoice, customerTaxId: invoiceTaxId })} disabled={issueNfceMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><DocumentTextIcon className="h-4 w-4" />{issueNfceMutation.isPending ? 'Emitindo…' : 'Emitir nota'}</button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onProductFound={handleProductFound}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-gray-900">Confirmar Exclusão</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Tem certeza que deseja excluir a venda <strong>#{saleToDelete.saleNumber}</strong>?
                  </p>
                  <div className="mt-3 text-xs text-gray-400">
                    <p>Cliente: {saleToDelete.leadName || 'Não informado'}</p>
                    <p>Total: R$ {saleToDelete.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p>Status: {getStatusLabel(saleToDelete.status)}</p>
                  </div>
                  <p className="text-xs text-red-500 mt-2">
                    ⚠️ Esta ação não pode ser desfeita!
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSaleToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteSale}
                  disabled={deleteSaleMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteSaleMutation.isPending ? 'Excluindo...' : 'Excluir Venda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes da venda */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Venda #{selectedSale.saleNumber}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cliente</label>
                  <p className="text-sm text-gray-900">{selectedSale.leadName || 'Cliente não informado'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total</label>
                  <p className="text-sm text-gray-900">R$ {selectedSale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(selectedSale.status)}`}>
                    {getStatusLabel(selectedSale.status)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Método de Pagamento</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedSale.paymentMethod || 'Não informado'}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedSale(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
