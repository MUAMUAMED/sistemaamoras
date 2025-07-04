import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, Barcode, QrCode, Edit3, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  Product, 
  Category, 
  Pattern, 
  Size, 
  ProductFormData, 
  ProductFilters,
  GeneratedCodes 
} from '../types';
import { 
  productsApi, 
  categoriesApi, 
  patternsApi, 
  sizesApi,
  barcodeApi,
  stockMovementsApi 
} from '../services/api';
import api from '../services/api';

const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 20,
    search: '',
    active: true
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCodes | null>(null);
  const [forceDeleteId, setForceDeleteId] = useState<string | null>(null);
  const [forceDeleteLoading, setForceDeleteLoading] = useState(false);

  // Queries
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list(filters),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ['patterns'],
    queryFn: () => patternsApi.list(),
  });

  const { data: sizes = [] } = useQuery({
    queryKey: ['sizes'],
    queryFn: () => sizesApi.list({ active: true }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowCreateModal(false);
      toast.success('Produto criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar produto');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductFormData> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowEditModal(false);
      setSelectedProduct(null);
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar produto');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir produto');
    },
  });

  const generateCodesMutation = useMutation({
    mutationFn: barcodeApi.generate,
    onSuccess: (data) => {
      setGeneratedCodes(data);
      setShowCodeModal(true);
      toast.success('Códigos gerados com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao gerar códigos');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowCategoryModal(false);
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar categoria');
    },
  });

  const createPatternMutation = useMutation({
    mutationFn: patternsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      setShowPatternModal(false);
      toast.success('Estampa criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar estampa');
    },
  });

  // Handlers
  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleCreateProduct = async (data: ProductFormData) => {
    // Buscar o objeto do tamanho selecionado
    const selectedSize = sizes.find(s => s.id === data.sizeId);
    // Montar o payload com size e sizeCode (sem o arquivo de imagem)
    const { imageFile, ...productData } = data;
    const payload = {
      ...productData,
      size: selectedSize ? selectedSize.name : '',
      sizeCode: selectedSize ? selectedSize.code : '',
    };
    
    try {
      // Criar o produto primeiro
      const createdProduct = await productsApi.create(payload);
      
      // Se há uma imagem, fazer o upload
      if (imageFile) {
        await productsApi.uploadImage(createdProduct.id, imageFile);
      }
      
      // Atualizar a lista de produtos
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowCreateModal(false);
      toast.success('Produto criado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar produto');
    }
  };

  const handleUpdateProduct = async (data: Partial<ProductFormData>) => {
    if (selectedProduct) {
      try {
        const { imageFile, ...productData } = data;
        
        // Atualizar dados do produto (sem a imagem)
        await productsApi.update(selectedProduct.id, productData);
        
        // Se há uma nova imagem, fazer o upload
        if (imageFile) {
          await productsApi.uploadImage(selectedProduct.id, imageFile);
        }
        
        // Atualizar a lista de produtos
        queryClient.invalidateQueries({ queryKey: ['products'] });
        setShowEditModal(false);
        setSelectedProduct(null);
        toast.success('Produto atualizado com sucesso!');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Erro ao atualizar produto');
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error: any) {
        // Se for erro 409 e canForce, exibe modal de confirmação
        if (error?.response?.status === 409 && error?.response?.data?.canForce) {
          setForceDeleteId(id);
        }
      }
    }
  };

  const handleForceDelete = async () => {
    if (!forceDeleteId) return;
    setForceDeleteLoading(true);
    try {
      await api.delete(`/products/${forceDeleteId}?force=true`);
      setForceDeleteId(null);
      // Atualiza lista de produtos
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto e vínculos excluídos com sucesso!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao excluir produto');
    } finally {
      setForceDeleteLoading(false);
    }
  };

  const handleGenerateCodes = (product: Product) => {
    if (!product.categoryId || !product.patternId || !product.sizeId) {
      toast.error('Produto deve ter categoria, estampa e tamanho para gerar códigos');
      return;
    }

    generateCodesMutation.mutate({
      categoryId: product.categoryId,
      patternId: product.patternId,
      sizeId: product.sizeId
    });
  };

  const handleCreateCategory = async (data: { name: string; code: string; description?: string }) => {
    createCategoryMutation.mutate(data);
  };

  const handleCreatePattern = async (data: { name: string; code: string; description?: string }) => {
    createPatternMutation.mutate(data);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) return { color: 'text-red-600 bg-red-100', text: 'Sem estoque' };
    if (product.stock <= product.minStock) return { color: 'text-yellow-600 bg-yellow-100', text: 'Estoque baixo' };
    return { color: 'text-green-600 bg-green-100', text: 'Em estoque' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600">Gerencie o catálogo de produtos da loja</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nome, código de barras..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <div className="flex gap-2">
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as categorias</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                title="Criar nova categoria"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estampa
            </label>
            <div className="flex gap-2">
              <select
                value={filters.pattern || ''}
                onChange={(e) => handleFilterChange('pattern', e.target.value || undefined)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as estampas</option>
                {(patterns ?? []).map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowPatternModal(true)}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                title="Criar nova estampa"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.active === undefined ? '' : filters.active.toString()}
              onChange={(e) => {
                const value = e.target.value === '' ? undefined : e.target.value === 'true';
                handleFilterChange('active', value);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loadingProducts ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU/Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estoque
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
                  {productsData && Array.isArray(productsData.data) && productsData.data.map((product: Product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {product.imageUrl ? (
                                <img 
                                  src={`http://localhost:3001${product.imageUrl}`}
                                  alt={product.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                  onError={(e) => {
                                    // Fallback para ícone se a imagem não carregar
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center ${product.imageUrl ? 'hidden' : ''}`}>
                                <Package className="w-5 h-5 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {categories.find((category: Category) => category.id === product.categoryId)?.name || '-'} • {patterns.find((pattern: Pattern) => pattern.id === product.patternId)?.name || '-'} • {sizes.find((size: Size) => size.id === product.sizeId)?.name || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.barcode}</div>
                          <div className="text-xs text-gray-500">Código: {product.barcode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            R$ {product.price.toFixed(2)}
                          </div>
                          {product.cost && (
                            <div className="text-xs text-gray-500">
                              Custo: R$ {product.cost.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {product.stock}
                            </span>
                            {product.stock <= product.minStock && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Mín: {product.minStock}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                            {stockStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowDetailsModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowEditModal(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGenerateCodes(product)}
                              className="text-green-600 hover:text-green-900"
                              title="Gerar códigos"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {productsData?.pagination && (
              <div className="px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {((productsData.pagination.page - 1) * productsData.pagination.limit) + 1} a {' '}
                    {Math.min(productsData.pagination.page * productsData.pagination.limit, productsData.pagination.total)} de {' '}
                    {productsData.pagination.total} produtos
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(productsData.pagination.page - 1)}
                      disabled={productsData.pagination.page <= 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-700">
                      Página {productsData.pagination.page} de {productsData.pagination.pages}
                    </span>
                    <button
                      onClick={() => handlePageChange(productsData.pagination.page + 1)}
                      disabled={productsData.pagination.page >= productsData.pagination.pages}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ProductFormModal
          title="Novo Produto"
          categories={(categories ?? [])}
          patterns={(patterns ?? [])}
          sizes={(sizes ?? [])}
          onSubmit={handleCreateProduct}
          onClose={() => setShowCreateModal(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {showEditModal && selectedProduct && (
        <ProductFormModal
          title="Editar Produto"
          product={selectedProduct}
          categories={(categories ?? [])}
          patterns={(patterns ?? [])}
          sizes={(sizes ?? [])}
          onSubmit={handleUpdateProduct}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          isLoading={updateMutation.isPending}
        />
      )}

      {showDetailsModal && selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          categories={categories ?? []}
          patterns={patterns ?? []}
          sizes={sizes ?? []}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showCodeModal && generatedCodes && (
        <GeneratedCodesModal
          codes={generatedCodes}
          onClose={() => {
            setShowCodeModal(false);
            setGeneratedCodes(null);
          }}
        />
      )}

      {showCategoryModal && (
        <CategoryFormModal
          onSubmit={handleCreateCategory}
          onClose={() => setShowCategoryModal(false)}
          isLoading={createCategoryMutation.isPending}
        />
      )}

      {showPatternModal && (
        <PatternFormModal
          onSubmit={handleCreatePattern}
          onClose={() => setShowPatternModal(false)}
          isLoading={createPatternMutation.isPending}
        />
      )}

      {forceDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Excluir produto vinculado?</h2>
            <p className="mb-4 text-gray-700">Este produto está vinculado a vendas ou movimentações. Deseja apagar mesmo assim? <b>Isso removerá todos os vínculos relacionados.</b></p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setForceDeleteId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={forceDeleteLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleForceDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={forceDeleteLoading}
              >
                {forceDeleteLoading ? 'Excluindo...' : 'Excluir mesmo assim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Função utilitária para normalizar preço
function normalizePrice(value: string | number): number {
  if (typeof value === 'number') return value;
  // Troca vírgula por ponto e converte para float
  return parseFloat(value.replace(',', '.')) || 0;
}

// Product Form Modal Component
interface ProductFormModalProps {
  title: string;
  product?: Product;
  categories: Category[];
  patterns: Pattern[];
  sizes: Size[];
  onSubmit: (data: ProductFormData) => void;
  onClose: () => void;
  isLoading: boolean;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  title,
  product,
  categories,
  patterns,
  sizes,
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    cost: product?.cost || 0,
    stock: product?.stock || 0,
    minStock: product?.minStock || 0,
    categoryId: product?.categoryId || '',
    patternId: product?.patternId || '',
    sizeId: product?.sizeId || '',
    active: product?.active ?? true,
    imageFile: undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await onSubmit({
        ...formData,
        price: normalizePrice(formData.price),
        cost: normalizePrice(formData.cost !== undefined ? formData.cost : '0'),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
      });
    } catch (error: any) {
      setFormError(error?.response?.data?.message || 'Erro ao salvar produto.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {formError && (
          <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-2 text-sm">{formError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagem do Produto
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData(prev => ({ ...prev, imageFile: file }));
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma categoria</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estampa *
              </label>
              <select
                value={formData.patternId}
                onChange={(e) => setFormData(prev => ({ ...prev, patternId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma estampa</option>
                {(patterns ?? []).map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamanho *
              </label>
              <select
                value={formData.sizeId}
                onChange={(e) => setFormData(prev => ({ ...prev, sizeId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um tamanho</option>
                {(sizes ?? []).map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço *
              </label>
              <input
                type="text"
                value={formData.price !== undefined ? String(formData.price) : ''}
                onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value.replace(',', '.')) || 0 }))}
                placeholder="Ex: 29.90"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo
              </label>
              <input
                type="text"
                value={formData.cost !== undefined ? String(formData.cost) : ''}
                onChange={e => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value.replace(',', '.')) || 0 }))}
                placeholder="Ex: 19.90"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque *
              </label>
              <input
                type="text"
                value={formData.stock !== undefined ? String(formData.stock) : ''}
                onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque Mínimo *
              </label>
              <input
                type="text"
                value={formData.minStock !== undefined ? String(formData.minStock) : ''}
                onChange={e => setFormData(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Produto ativo</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Product Details Modal Component
interface ProductDetailsModalProps {
  product: Product;
  categories: Category[];
  patterns: Pattern[];
  sizes: Size[];
  onClose: () => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, categories, patterns, sizes, onClose }) => {
  const { data: movements } = useQuery({
    queryKey: ['stock-movements', product.id],
    queryFn: () => stockMovementsApi.getByProduct(product.id, 1, 10),
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Detalhes do Produto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Info */}
          <div className="space-y-4">
            {/* Product Image */}
            {product.imageUrl && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Imagem do Produto</h3>
                <div className="flex justify-center">
                  <img 
                    src={`http://localhost:3001${product.imageUrl}`}
                    alt={product.name}
                    className="max-w-full h-48 object-cover rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações Básicas</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Nome:</span>
                  <p className="text-gray-900">{product.name}</p>
                </div>
                {product.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Descrição:</span>
                    <p className="text-gray-900">{product.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Categoria:</span>
                    <p className="text-gray-900">{categories.find((category: Category) => category.id === product.categoryId)?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Estampa:</span>
                    <p className="text-gray-900">{patterns.find((pattern: Pattern) => pattern.id === product.patternId)?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Tamanho:</span>
                    <p className="text-gray-900">{sizes.find((size: Size) => size.id === product.sizeId)?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Códigos</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Código de Barras:</span>
                  <p className="text-gray-900 font-mono">{product.barcode}</p>
                </div>
                {product.qrcodeUrl && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">QR Code:</span>
                    <div className="mt-2">
                      <img src={product.qrcodeUrl} alt="QR Code" className="w-24 h-24" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stock and Pricing */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Preços e Estoque</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Preço de Venda:</span>
                  <p className="text-lg font-semibold text-green-600">
                    R$ {product.price.toFixed(2)}
                  </p>
                </div>
                {product.cost && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Custo:</span>
                    <p className="text-lg font-semibold text-gray-900">
                      R$ {product.cost.toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Estoque Atual:</span>
                  <p className="text-lg font-semibold text-blue-600">{product.stock}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Estoque Mínimo:</span>
                  <p className="text-lg font-semibold text-orange-600">{product.minStock}</p>
                </div>
              </div>
            </div>

            {movements && movements.data && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Últimas Movimentações
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(movements.data || []).map((movement) => (
                    <div
                      key={movement.id}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <span className="text-sm font-medium">
                          {movement.type === 'ENTRY' ? '+' : '-'}{movement.quantity}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {movement.reason}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Generated Codes Modal Component
interface GeneratedCodesModalProps {
  codes: GeneratedCodes;
  onClose: () => void;
}

const GeneratedCodesModal: React.FC<GeneratedCodesModalProps> = ({ codes, onClose }) => {
  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.download = `qrcode-${codes.sku}.png`;
    link.href = codes.qrcodeUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Códigos Gerados</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <div className="p-2 bg-gray-50 rounded border font-mono text-center">
              {codes.sku}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de Barras
            </label>
            <div className="p-2 bg-gray-50 rounded border font-mono text-center">
              {codes.barcode}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
            <div className="flex justify-center p-4 bg-gray-50 rounded border">
              <img src={codes.qrcodeUrl} alt="QR Code" className="w-32 h-32" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={handleDownloadQR}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Baixar QR Code
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Category Form Modal Component
interface CategoryFormModalProps {
  onSubmit: (data: { name: string; code: string; description?: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    } else if (!/^\d{1,2}$/.test(formData.code)) {
      newErrors.code = 'Código deve ter 1 ou 2 dígitos numéricos (ex: 10, 50)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2); // Apenas números, máximo 2 dígitos
    setFormData(prev => ({ ...prev, code: value }));
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Nova Categoria</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={handleCodeChange}
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: 10"
            />
            {errors.code && (
              <p className="text-red-500 text-xs mt-1">{errors.code}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">Máximo 2 dígitos numéricos</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Pattern Form Modal Component
interface PatternFormModalProps {
  onSubmit: (data: { name: string; code: string; description?: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

const PatternFormModal: React.FC<PatternFormModalProps> = ({
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    } else if (!/^\d{1,4}$/.test(formData.code)) {
      newErrors.code = 'Código deve ter 1 a 4 dígitos numéricos (ex: 0001, 0032)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4); // Apenas números, máximo 4 dígitos
    setFormData(prev => ({ ...prev, code: value }));
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Nova Estampa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={handleCodeChange}
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: 0001"
            />
            {errors.code && (
              <p className="text-red-500 text-xs mt-1">{errors.code}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">Máximo 4 dígitos numéricos</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Products; 