import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, Barcode, QrCode, Edit3, Trash2, Eye, AlertTriangle, Minus, History, X, Printer } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  Product, 
  Category, 
  Subcategory,
  Pattern, 
  Size, 
  ProductFormData, 
  ProductFilters,
  GeneratedCodes 
} from '../types';
import { 
  productsApi, 
  categoriesApi, 
  subcategoriesApi,
  patternsApi, 
  sizesApi,
  barcodeApi,
  stockMovementsApi 
} from '../services/api';
import api from '../services/api';
import SearchableSelect from '../components/SearchableSelect';

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
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
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

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories'],
    queryFn: () => subcategoriesApi.list(),
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

  const createSizeMutation = useMutation({
    mutationFn: sizesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
      setShowSizeModal(false);
      toast.success('Tamanho criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar tamanho');
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
    if (!product.categoryId || !product.patternId || !product.size) {
      toast.error('Produto deve ter categoria, estampa e tamanho para gerar códigos');
      return;
    }

    // Buscar o tamanho pelo nome para obter o ID
    const sizeObj = sizes.find(s => s.name === product.size);
    if (!sizeObj) {
      toast.error('Tamanho não encontrado');
      return;
    }

    // Definir o produto selecionado para que esteja disponível na impressão
    setSelectedProduct(product);

    generateCodesMutation.mutate({
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId || undefined,
      patternId: product.patternId,
      sizeId: sizeObj.id
    });
  };

  const handleCreateCategory = async (data: { name: string; code: string; description?: string }) => {
    createCategoryMutation.mutate(data);
  };

  const handleCreatePattern = async (data: { name: string; code: string; description?: string }) => {
    createPatternMutation.mutate(data);
  };

  const handleCreateSize = async (data: { name: string; code: string; description?: string }) => {
    createSizeMutation.mutate({
      ...data,
      active: true
    });
  };

  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) return { color: 'text-red-600 bg-red-100', text: 'Sem estoque' };
    if (product.stock <= product.minStock) return { color: 'text-yellow-600 bg-yellow-100', text: 'Estoque baixo' };
    return { color: 'text-green-600 bg-green-100', text: 'Em estoque' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-8 rounded-b-3xl shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Produtos</h1>
              <p className="text-blue-100 text-lg">Gerencie o catálogo de produtos da loja</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-50 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Novo Produto
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 card-hover animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Produtos</p>
                <p className="text-3xl font-bold text-gray-900">
                  {productsData?.pagination?.total || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 card-hover animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Produtos Ativos</p>
                <p className="text-3xl font-bold text-green-600">
                  {productsData?.data?.filter((p: Product) => p.active).length || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 card-hover animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Sem Estoque</p>
                <p className="text-3xl font-bold text-red-600">
                  {productsData?.data?.filter((p: Product) => p.stock <= 0).length || 0}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 card-hover animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Categorias</p>
                <p className="text-3xl font-bold text-purple-600">
                  {categories?.length || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Filter className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Melhorados */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8 mb-8 card-hover">
          <div className="flex items-center gap-3 mb-8">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Filtros e Busca</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {/* Busca */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Buscar Produto
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nome, código..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 input-focus"
                />
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Categoria
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200"
                  title="Criar nova categoria"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 input-focus"
              >
                <option value="">Todas as categorias</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Estampa */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Estampa
                </label>
                <button
                  type="button"
                  onClick={() => setShowPatternModal(true)}
                  className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all duration-200"
                  title="Criar nova estampa"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <select
                value={filters.pattern || ''}
                onChange={(e) => handleFilterChange('pattern', e.target.value || undefined)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 input-focus"
              >
                <option value="">Todas as estampas</option>
                {(patterns ?? []).map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tamanho */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Tamanho
                </label>
                <button
                  type="button"
                  onClick={() => setShowSizeModal(true)}
                  className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all duration-200"
                  title="Criar novo tamanho"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <select
                value={filters.size || ''}
                onChange={(e) => handleFilterChange('size', e.target.value || undefined)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 input-focus"
              >
                <option value="">Todos os tamanhos</option>
                {(sizes ?? []).map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Status
              </label>
              <select
                value={filters.active === undefined ? '' : filters.active.toString()}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : e.target.value === 'true';
                  handleFilterChange('active', value);
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 input-focus"
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Produtos - Layout em Cards */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loadingProducts ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600">Carregando produtos...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header da Tabela */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Produtos ({productsData?.pagination?.total || 0})
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>Catálogo de Produtos</span>
                  </div>
                </div>
              </div>

              {/* Grid de Produtos */}
              <div className="p-6">
                {productsData && Array.isArray(productsData.data) && productsData.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {productsData.data.map((product: Product) => {
                      const stockStatus = getStockStatus(product);
                      return (
                        <div key={product.id} className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden group card-hover animate-fade-in-up">
                          {/* Imagem do Produto */}
                          <div className="relative h-48 bg-gray-100 overflow-hidden">
                            {product.imageUrl ? (
                              <img 
                                src={`http://https://amoras-sistema-gew1.gbl2yq.easypanel.host${product.imageUrl}`}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center ${product.imageUrl ? 'hidden' : ''}`}>
                              <Package className="w-12 h-12 text-gray-400" />
                            </div>
                            
                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {product.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>

                            {/* Estoque Badge */}
                            <div className="absolute top-3 left-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                {stockStatus.text}
                              </span>
                            </div>
                          </div>

                          {/* Informações do Produto */}
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                              {product.name}
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Preço:</span>
                                <span className="font-semibold text-green-600">
                                  R$ {product.price.toFixed(2)}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Estoque:</span>
                                <span className={`font-medium ${product.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                                  {product.stock} un
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Código:</span>
                                <span className="font-mono text-xs text-gray-500">
                                  {product.barcode || 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowDetailsModal(true);
                                }}
                                className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200 flex items-center justify-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                Ver
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowEditModal(true);
                                }}
                                className="px-3 py-2 text-sm bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors duration-200 flex items-center justify-center gap-1"
                              >
                                <Edit3 className="w-4 h-4" />
                                Editar
                              </button>
                              
                              <button
                                onClick={() => handleGenerateCodes(product)}
                                className="px-3 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                title="Gerar códigos de barras"
                              >
                                <Barcode className="w-4 h-4" />
                                Códigos
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowStockModal(true);
                                }}
                                className="px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                title="Gerenciar estoque"
                              >
                                <Package className="w-4 h-4" />
                                Estoque
                              </button>
                              
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                title="Excluir produto"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                    <p className="text-gray-600 mb-6">
                      {filters.search || filters.category || filters.pattern || filters.size || filters.active !== undefined
                        ? 'Tente ajustar os filtros de busca'
                        : 'Comece criando seu primeiro produto'
                      }
                    </p>
                    {!filters.search && !filters.category && !filters.pattern && !filters.size && filters.active === undefined && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 mx-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Criar Primeiro Produto
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Paginação */}
              {productsData && productsData.pagination && productsData.pagination.total > (filters.limit || 20) && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Mostrando {((filters.page || 1) - 1) * (filters.limit || 20) + 1} a {Math.min((filters.page || 1) * (filters.limit || 20), productsData.pagination.total)} de {productsData.pagination.total} produtos
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange((filters.page || 1) - 1)}
                        disabled={(filters.page || 1) <= 1}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <span className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">
                        {filters.page || 1}
                      </span>
                      <button
                        onClick={() => handlePageChange((filters.page || 1) + 1)}
                        disabled={(filters.page || 1) >= Math.ceil(productsData.pagination.total / (filters.limit || 20))}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <ProductFormModal
          title="Novo Produto"
          categories={categories}
          subcategories={subcategories}
          patterns={patterns}
          sizes={sizes}
          onSubmit={handleCreateProduct}
          onClose={() => setShowCreateModal(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {showEditModal && selectedProduct && (
        <ProductFormModal
          title="Editar Produto"
          product={selectedProduct}
          categories={categories}
          subcategories={subcategories}
          patterns={patterns}
          sizes={sizes}
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
          categories={categories}
          patterns={patterns}
          sizes={sizes}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showCodeModal && generatedCodes && selectedProduct && (
        <GeneratedCodesModal
          codes={generatedCodes}
          product={selectedProduct}
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

      {showSizeModal && (
        <SizeFormModal
          onSubmit={handleCreateSize}
          onClose={() => setShowSizeModal(false)}
          isLoading={createSizeMutation.isPending}
        />
      )}

      {showStockModal && selectedProduct && (
        <StockModal
          product={selectedProduct}
          onClose={() => {
            setShowStockModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}

      {/* Force Delete Modal */}
      {forceDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Este produto possui vínculos com vendas ou movimentações de estoque. 
              Deseja realmente excluir o produto e todos os seus vínculos?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setForceDeleteId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleForceDelete}
                disabled={forceDeleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {forceDeleteLoading ? 'Excluindo...' : 'Excluir Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function
function normalizePrice(value: string | number): number {
  if (typeof value === 'number') return value;
  // Remove tudo que não é dígito e converte de centavos para reais
  const numbers = value.replace(/\D/g, '');
  return numbers ? parseInt(numbers) / 100 : 0;
}

// Product Form Modal Component
interface ProductFormModalData {
  name: string;
  description?: string;
  price: string;
  cost?: string;
  stock: string;
  minStock: string;
  categoryId: string;
  subcategoryId?: string; // Opcional
  patternId: string;
  sizeId: string;
  active?: boolean;
  imageFile?: File | null;
}

interface ProductFormModalProps {
  title: string;
  product?: Product;
  categories: Category[];
  subcategories: Subcategory[];
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
  subcategories,
  patterns,
  sizes,
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [formData, setFormData] = useState<ProductFormModalData>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price ? (product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
    cost: product?.cost ? (product.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
    stock: product?.stock?.toString() || '0',
    minStock: product?.minStock?.toString() || '0',
    categoryId: product?.categoryId || '',
    subcategoryId: product?.subcategoryId || '',
    patternId: product?.patternId || '',
    sizeId: product?.sizeId || '',
    imageFile: null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Limpar subcategoria quando categoria mudar
  useEffect(() => {
    if (formData.categoryId && product?.categoryId !== formData.categoryId) {
      setFormData(prev => ({ ...prev, subcategoryId: '' }));
    }
  }, [formData.categoryId, product?.categoryId]);

  // Função para formatar valor monetário no padrão brasileiro
  const formatCurrency = (value: string): string => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Se vazio, retorna vazio
    if (!numbers) return '';
    
    // Converte para centavos
    const cents = parseInt(numbers);
    
    // Formata como moeda brasileira
    const formatted = (cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatted;
  };

  // Função para converter valor formatado para número
  const parseCurrency = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? parseInt(numbers) / 100 : 0;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.price || parseCurrency(formData.price) <= 0) {
      newErrors.price = 'Preço deve ser maior que zero';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }

    // Subcategoria é opcional - removida validação obrigatória

    if (!formData.patternId) {
      newErrors.patternId = 'Estampa é obrigatória';
    }

    if (!formData.sizeId) {
      newErrors.sizeId = 'Tamanho é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData: ProductFormData = {
        ...formData,
        subcategoryId: formData.subcategoryId || undefined,
        price: normalizePrice(formData.price),
        cost: formData.cost ? normalizePrice(formData.cost) : undefined,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        imageFile: formData.imageFile || undefined,
      };
      onSubmit(submitData);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Preço *
              </label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData(prev => ({ ...prev, price: formatted }));
                }}
                className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0,00"
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo
              </label>
              <input
                type="text"
                value={formData.cost || ''}
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  setFormData(prev => ({ ...prev, cost: formatted }));
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque Atual
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque Mínimo
              </label>
              <input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            <SearchableSelect
              label="Categoria"
              required
              options={categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                code: cat.code,
                description: cat.description
              }))}
              value={formData.categoryId}
              onChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
              placeholder="Busque ou selecione uma categoria"
              error={errors.categoryId}
            />

            <SearchableSelect
              label="Subcategoria (opcional)"
              options={subcategories
                .filter(sub => sub.categoryId === formData.categoryId)
                .map(sub => ({
                  id: sub.id,
                  name: sub.name,
                  code: sub.code,
                  description: sub.description
                }))}
              value={formData.subcategoryId || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, subcategoryId: value }))}
              placeholder="Busque ou selecione uma subcategoria"
              disabled={!formData.categoryId}
              error={errors.subcategoryId}
            />

            <SearchableSelect
              label="Estampa"
              required
              options={patterns.map(pattern => ({
                id: pattern.id,
                name: pattern.name,
                code: pattern.code,
                description: pattern.description
              }))}
              value={formData.patternId}
              onChange={(value) => setFormData(prev => ({ ...prev, patternId: value }))}
              placeholder="Busque ou selecione uma estampa"
              error={errors.patternId}
            />

            <SearchableSelect
              label="Tamanho"
              required
              options={sizes.map(size => ({
                id: size.id,
                name: size.name,
                code: size.code
              }))}
              value={formData.sizeId}
              onChange={(value) => setFormData(prev => ({ ...prev, sizeId: value }))}
              placeholder="Busque ou selecione um tamanho"
              error={errors.sizeId}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imagem
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

          <div className="flex justify-end gap-3">
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
  const category = categories.find(c => c.id === product.categoryId);
  const pattern = patterns.find(p => p.id === product.patternId);
  const size = sizes.find(s => s.name === product.size);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Detalhes do Produto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{product.name}</h3>
            
            {product.imageUrl && (
              <div className="mb-4">
                <img 
                  src={`http://https://amoras-sistema-gew1.gbl2yq.easypanel.host${product.imageUrl}`}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <p className="text-sm text-gray-900">{product.description || 'Sem descrição'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Código de Barras</label>
                <p className="text-sm text-gray-900">{product.barcode}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <p className="text-sm text-gray-900">{category?.name || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Estampa</label>
                <p className="text-sm text-gray-900">{pattern?.name || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tamanho</label>
                <p className="text-sm text-gray-900">{size?.name || '-'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Informações Financeiras</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Preço de Venda:</span>
                  <span className="text-sm font-medium text-gray-900">R$ {product.price.toFixed(2)}</span>
                </div>
                {product.cost && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Custo:</span>
                    <span className="text-sm font-medium text-gray-900">R$ {product.cost.toFixed(2)}</span>
                  </div>
                )}
                {product.cost && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Margem:</span>
                    <span className="text-sm font-medium text-green-600">
                      {((product.price - product.cost) / product.price * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Informações de Estoque</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estoque Atual:</span>
                  <span className="text-sm font-medium text-gray-900">{product.stock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estoque Mínimo:</span>
                  <span className="text-sm font-medium text-gray-900">{product.minStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium ${
                    product.stock <= 0 ? 'text-red-600' : 
                    product.stock <= product.minStock ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {product.stock <= 0 ? 'Sem estoque' : 
                     product.stock <= product.minStock ? 'Estoque baixo' : 'Em estoque'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Informações do Sistema</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium ${product.active ? 'text-green-600' : 'text-red-600'}`}>
                    {product.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Criado em:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Atualizado em:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(product.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
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
  product: Product;
  onClose: () => void;
}

const GeneratedCodesModal: React.FC<GeneratedCodesModalProps> = ({ codes, product, onClose }) => {
  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.download = `qrcode-${codes.sku}.png`;
    link.href = codes.qrcodeUrl;
    link.click();
  };

  const handlePrintQR = async () => {
    if (!product) {
      toast.error('Produto não encontrado para impressão');
      return;
    }

    // Buscar informações completas do produto
    try {
      const productDetails = await productsApi.getById(product.id);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etiqueta - ${codes.sku}</title>
              <style>
                @page {
                  size: 40mm 30mm;
                  margin: 0mm;
                  padding: 0mm;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  width: 40mm;
                  height: 30mm;
                  font-family: 'Arial', 'Helvetica', sans-serif;
                  font-size: 10px;
                  line-height: 1.1;
                  display: flex;
                  overflow: hidden;
                  background: white;
                  color: black;
                }
                .etiqueta {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  padding: 1mm;
                  gap: 0.5mm;
                  border: 1px solid #000;
                }
                .qr-section {
                  width: 17mm;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: flex-start;
                  position: relative;
                  padding-top: 0.5mm;
                  border: 1px solid #ff0000;
                }
                .qr-code {
                  width: 11mm;
                  height: 11mm;
                  object-fit: contain;
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: pixelated;
                  /* Sem padding para ficar igual à imagem */
                  padding: 0;
                  box-sizing: border-box;
                  /* Centralizar o QR Code dentro da área */
                  margin: 0 auto;
                }
                .sku-code {
                  font-size: 9px;
                  font-weight: bold;
                  text-align: center;
                  margin-top: 0.4mm;
                  word-break: break-all;
                  line-height: 1;
                  font-family: 'Arial', sans-serif;
                  /* Centralizar o código SKU */
                  width: 100%;
                  padding: 0;
                  box-sizing: border-box;
                }

                .left-info {
                  font-size: 10px;
                  text-align: center;
                  margin-top: 0.3mm;
                  line-height: 1.1;
                  width: 100%;
                  padding: 0;
                  box-sizing: border-box;
                  border: 1px solid #0000ff;
                }

                .left-info-line {
                  margin-bottom: 0.4mm;
                  white-space: normal;
                  overflow: visible;
                  word-wrap: break-word;
                  font-weight: 500;
                  padding: 0;
                  line-height: 1.1;
                }
                .info-section {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  overflow: hidden;
                  /* Padding mínimo como na imagem */
                  padding: 0.3mm 0;
                  box-sizing: border-box;
                  border: 1px solid #00ff00;
                }
                .product-name {
                  font-weight: bold;
                  font-size: 11px;
                  line-height: 1.1;
                  margin-bottom: 0.7mm;
                  word-wrap: break-word;
                  overflow: hidden;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  text-transform: uppercase;
                  /* Alinhar à esquerda como na imagem */
                  text-align: left;
                  padding: 0;
                }
                .product-details {
                  font-size: 10px;
                  line-height: 1.1;
                  flex-grow: 1;
                  border: 1px solid #ff00ff;
                }
                .detail-line {
                  margin-bottom: 0.4mm;
                  white-space: normal;
                  overflow: visible;
                  word-wrap: break-word;
                  font-weight: 500;
                  /* Alinhar à esquerda como na imagem */
                  text-align: left;
                  padding: 0;
                  line-height: 1.1;
                }
                .price {
                  font-weight: bold;
                  font-size: 10px;
                  margin-top: auto;
                  text-align: right;
                  background: #f0f0f0;
                  padding: 0.3mm 0.6mm;
                  border-radius: 1mm;
                  /* Alinhar à direita como na imagem */
                  margin-left: auto;
                  margin-right: 0;
                  width: fit-content;
                }
                @media print {
                  body {
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                  }
                  .price {
                    background: #f0f0f0 !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="etiqueta">
                <div class="qr-section">
                  <img src="${codes.qrcodeUrl}" alt="QR Code" class="qr-code" />
                  <div class="sku-code">${codes.sku}</div>
                  <div class="left-info">
                    ${productDetails.subcategory ? `<div class="left-info-line">SUB: ${productDetails.subcategory.name}</div>` : ''}
                    <div class="left-info-line">EST: ${productDetails.pattern?.name || 'N/A'}</div>
                  </div>
                </div>
                <div class="info-section">
                  <div class="product-name">${productDetails.name}</div>
                  <div class="product-details">
                    <div class="detail-line">TAM: ${productDetails.size}</div>
                    <div class="detail-line">CAT: ${productDetails.category?.name || 'N/A'}</div>
                  </div>
                  <div class="price">R$ ${productDetails.price.toFixed(2).replace('.', ',')}</div>
                </div>
              </div>
              <script>
                window.onload = function() {
                  setTimeout(() => {
                    window.print();
                    window.onafterprint = function() {
                      window.close();
                    };
                  }, 100);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do produto:', error);
      toast.error('Erro ao buscar informações do produto');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Código copiado para a área de transferência!');
    }).catch(() => {
      toast.error('Erro ao copiar código');
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Códigos Gerados</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-gray-50 rounded border font-mono text-center">
                {codes.sku}
              </div>
              <button
                onClick={() => copyToClipboard(codes.sku)}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title="Copiar SKU"
              >
                Copiar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de Barras
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-gray-50 rounded border font-mono text-center">
                {codes.barcode}
              </div>
              <button
                onClick={() => copyToClipboard(codes.barcode)}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title="Copiar código de barras"
              >
                Copiar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
            <div className="flex justify-center p-4 bg-gray-50 rounded border">
              <img src={codes.qrcodeUrl} alt="QR Code" className="w-32 h-32" />
            </div>
            <div className="text-center text-sm text-gray-600 mt-2">
              O QR Code contém apenas o código: <strong>{codes.sku}</strong>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={handlePrintQR}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir QR
          </button>
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

// Size Form Modal Component
interface SizeFormModalProps {
  onSubmit: (data: { name: string; code: string; description?: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

const SizeFormModal: React.FC<SizeFormModalProps> = ({
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
          <h2 className="text-xl font-bold text-gray-900">Novo Tamanho</h2>
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
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de gestão de estoque
interface StockModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const StockModal: React.FC<StockModalProps> = ({ product, onClose, onSuccess }) => {
  const [operation, setOperation] = useState<'add' | 'remove' | 'history'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStockOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    setIsLoading(true);
    try {
      if (operation === 'add') {
        const result = await productsApi.addStock(product.id, quantity, reason);
        toast.success(result.message);
      } else if (operation === 'remove') {
        const result = await productsApi.removeStock(product.id, quantity, reason);
        toast.success(result.message);
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao atualizar estoque';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const [stockHistory, setStockHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadStockHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await productsApi.getStockHistory(product.id);
      setStockHistory(history);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (operation === 'history') {
      loadStockHistory();
    }
  }, [operation]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Gerenciar Estoque
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Informações do produto */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600">
                  Estoque atual: <span className="font-semibold text-blue-600">{product.stock} unidades</span>
                </p>
                <p className="text-xs text-gray-500">
                  {product.category?.name} • {product.pattern?.name} • {product.size}
                </p>
              </div>
            </div>
          </div>

          {/* Abas de operação */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setOperation('add')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                operation === 'add'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline-block mr-2" />
              Adicionar
            </button>
            <button
              onClick={() => setOperation('remove')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                operation === 'remove'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Minus className="w-4 h-4 inline-block mr-2" />
              Retirar
            </button>
            <button
              onClick={() => setOperation('history')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                operation === 'history'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-4 h-4 inline-block mr-2" />
              Histórico
            </button>
          </div>

          {/* Formulário de operação */}
          {operation !== 'history' && (
            <form onSubmit={handleStockOperation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite a quantidade"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={operation === 'add' ? 'Ex: Recebimento de fornecedor' : 'Ex: Produto danificado'}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    operation === 'add'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isLoading ? 'Processando...' : operation === 'add' ? 'Adicionar' : 'Retirar'}
                </button>
              </div>
            </form>
          )}

          {/* Histórico de movimentações */}
          {operation === 'history' && (
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Carregando histórico...</p>
                </div>
              ) : stockHistory && stockHistory.movements.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {stockHistory.movements.map((movement: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {movement.type === 'ENTRY' ? (
                            <Plus className="w-4 h-4 text-green-600" />
                          ) : (
                            <Minus className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`text-sm font-medium ${
                            movement.type === 'ENTRY' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movement.type === 'ENTRY' ? '+' : '-'}{movement.quantity}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(movement.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{movement.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Nenhuma movimentação encontrada</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products; 