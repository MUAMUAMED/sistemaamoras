import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, Barcode, QrCode, Edit3, Trash2, Eye, AlertTriangle, Minus, History, X, Printer, ArrowDown, ArrowUp, Camera, CheckCircle } from 'lucide-react';
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
  GeneratedCodes,
  ProductStatus 
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
import { getImageUrl } from '../utils/imageUrl';

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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCodes | null>(null);
  const [forceDeleteId, setForceDeleteId] = useState<string | null>(null);
  const [forceDeleteLoading, setForceDeleteLoading] = useState(false);
  
  // Lista de produtos que foram finalizados (para controle local)
  const [finishedProducts, setFinishedProducts] = useState<Set<string>>(new Set());

  // TESTE: Popup para verificar se mudanças estão sendo aplicadas
  useEffect(() => {
    alert('🧪 TESTE: Se você está vendo isso, as mudanças estão sendo aplicadas!');
    toast.success('🧪 TESTE: Sistema está funcionando!', { duration: 5000 });
  }, []);

  // Queries
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list(filters),
  });

  // Log produtos recebidos
  useEffect(() => {
    if (productsData?.data) {
      console.log('📦 [PRODUCTS QUERY] Produtos recebidos:', productsData.data.length);
      productsData.data.forEach((product: Product) => {
        console.log(`  Produto ${product.id}:`, {
          name: product.name,
          imagesCount: product.images?.length || 0,
          images: product.images?.map(img => ({ id: img.id, url: img.url, type: img.type })) || [],
          imageUrl: product.imageUrl
        });
      });
    }
  }, [productsData]);

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

  const finishProductionMutation = useMutation({
    mutationFn: productsApi.finishProduction,
    onSuccess: (data, variables) => {
      console.log('🎉 [FRONTEND DEBUG] Mutation onSuccess chamada!');
      console.log('🎉 [FRONTEND DEBUG] Data recebida do backend:', data);
      console.log('🎉 [FRONTEND DEBUG] ProductId finalizado:', variables);
      
      // Adicionar produto à lista de finalizados
      setFinishedProducts(prev => {
        const newSet = new Set(Array.from(prev).concat([variables]));
        console.log('🎉 [FRONTEND DEBUG] Lista de produtos finalizados atualizada:', Array.from(newSet));
        return newSet;
      });
      
      console.log('🔄 [FRONTEND DEBUG] Invalidando queries...');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Processo finalizado com sucesso! Produto adicionado ao estoque.');
    },
    onError: (error: any) => {
      console.error('💥 [FRONTEND DEBUG] Erro na mutation:', error);
      toast.error(error.response?.data?.error || 'Erro ao finalizar processo');
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

  const createSubcategoryMutation = useMutation({
    mutationFn: subcategoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      setShowSubcategoryModal(false);
      toast.success('Subcategoria criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar subcategoria');
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

  const handleCreateProduct = async (data: ProductFormData, saveAsDraft: boolean = false) => {
    console.log('🆕 [FRONTEND CREATE] Dados do formulário recebidos:', data);
    console.log('📝 [FRONTEND CREATE] saveAsDraft:', saveAsDraft);
    
    // Buscar o objeto do tamanho selecionado
    const selectedSize = sizes.find(s => s.id === data.sizeId);
    console.log('🔍 [FRONTEND CREATE] Tamanho selecionado:', selectedSize);
    
    // Montar o payload com size e sizeCode (sem o arquivo de imagem)
    const { imageFile, imageFilesRoupa, imageFilesIA, ...productData } = data;
    const payload = {
      ...productData,
      size: selectedSize ? selectedSize.name : '',
      sizeCode: selectedSize ? selectedSize.code : '',
      saveAsDraft: saveAsDraft,
    };
    
    console.log('📤 [FRONTEND CREATE] Payload que será enviado para API:', payload);
    
    try {
      // Criar o produto primeiro
      console.log('🚀 [FRONTEND CREATE] Enviando requisição para criar produto...');
      const createdProduct = await productsApi.create(payload);
      console.log('✅ [FRONTEND CREATE] Produto criado com sucesso:', createdProduct);
      
      // Upload de imagens (agora funciona para rascunhos também, após correção no backend)
      if (imageFile) {
        console.log('📷 [FRONTEND CREATE] Fazendo upload de imagem...');
        await productsApi.uploadImage(createdProduct.id, imageFile);
        console.log('✅ [FRONTEND CREATE] Imagem enviada com sucesso');
      }
      // Upload de múltiplas imagens por tipo
      // Validar novamente antes de enviar (garantia extra)
      if (imageFilesRoupa && imageFilesRoupa.length > 0) {
        const validRoupaFiles = imageFilesRoupa.filter(f => f instanceof File && f.size > 0);
        if (validRoupaFiles.length > 0) {
          console.log('🖼️ [FRONTEND CREATE] Enviando imagens ROUPA...', validRoupaFiles.length);
          await productsApi.uploadImages(createdProduct.id, validRoupaFiles, 'ROUPA');
        } else {
          console.warn('⚠️ [FRONTEND CREATE] Nenhuma imagem ROUPA válida para enviar');
        }
      }
      if (imageFilesIA && imageFilesIA.length > 0) {
        const validIAFiles = imageFilesIA.filter(f => f instanceof File && f.size > 0);
        if (validIAFiles.length > 0) {
          console.log('🤖 [FRONTEND CREATE] Enviando imagens IA...', validIAFiles.length);
          await productsApi.uploadImages(createdProduct.id, validIAFiles, 'IA');
        } else {
          console.warn('⚠️ [FRONTEND CREATE] Nenhuma imagem IA válida para enviar');
        }
      }
      
      // Atualizar a lista de produtos
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowCreateModal(false);
      toast.success(saveAsDraft ? 'Rascunho salvo com sucesso!' : 'Produto criado com sucesso!');
    } catch (error: any) {
      console.error('💥 [FRONTEND CREATE] Erro ao criar produto:', error);
      console.error('💥 [FRONTEND CREATE] Resposta do servidor:', error.response?.data);
      toast.error(error.response?.data?.error || (saveAsDraft ? 'Erro ao salvar rascunho' : 'Erro ao criar produto'));
    }
  };

  const handleUpdateProduct = async (data: Partial<ProductFormData>, saveAsDraft?: boolean, imagesToDelete?: Set<string>) => {
    if (selectedProduct) {
      console.log('🔄 [FRONTEND UPDATE] ========== INÍCIO DA ATUALIZAÇÃO ==========');
      console.log('🔄 [FRONTEND UPDATE] Produto selecionado:', JSON.stringify(selectedProduct, null, 2));
      console.log('🔄 [FRONTEND UPDATE] Dados do formulário recebidos (RAW):', JSON.stringify(data, null, 2));
      console.log('🔄 [FRONTEND UPDATE] saveAsDraft (parâmetro):', saveAsDraft);
      console.log('🔄 [FRONTEND UPDATE] Produto ID:', selectedProduct.id);
      console.log('🔄 [FRONTEND UPDATE] Status atual do produto:', selectedProduct.status);
      
      try {
        console.log('🔍 [FRONTEND UPDATE] Passo 1: Separando campos de imagem...');
        const { imageFile, imageFilesRoupa, imageFilesIA, saveAsDraft: dataSaveAsDraft, ...productData } = data as any;
        console.log('🔍 [FRONTEND UPDATE] Campos de imagem separados:', {
          hasImageFile: !!imageFile,
          imageFilesRoupaCount: imageFilesRoupa?.length || 0,
          imageFilesIACount: imageFilesIA?.length || 0,
          dataSaveAsDraft: dataSaveAsDraft
        });
        console.log('🔍 [FRONTEND UPDATE] productData (após remover imagens):', JSON.stringify(productData, null, 2));
        
        const isDraft = saveAsDraft ?? dataSaveAsDraft ?? false;
        console.log('🔍 [FRONTEND UPDATE] Passo 2: Determinando isDraft:', {
          saveAsDraft,
          dataSaveAsDraft,
          isDraft
        });
        
        // Limpar dados: para rascunhos, não enviar null - apenas campos com valores ou que foram alterados
        const cleanedData: any = {};
        console.log('🔍 [FRONTEND UPDATE] Passo 3: Iniciando limpeza de dados...');
        console.log('🔍 [FRONTEND UPDATE] Chaves em productData:', Object.keys(productData));
        
        Object.keys(productData).forEach(key => {
          const value = productData[key];
          console.log(`🔍 [FRONTEND UPDATE] Processando campo "${key}":`, {
            value,
            type: typeof value,
            isString: typeof value === 'string',
            isEmpty: value === '',
            isUndefined: value === undefined,
            isNull: value === null,
            isZero: value === 0
          });
          
          // Pular campos de imagem e campos que não devem ser enviados na atualização
          if (key === 'imageFile' || 
              key === 'imageFilesRoupa' || 
              key === 'imageFilesIA' || 
              key === 'saveAsDraft') {
            console.log(`⏭️ [FRONTEND UPDATE] Pulando campo "${key}" (campo de imagem ou saveAsDraft)`);
            return;
          }
          
          // initialLocation só é usado quando convertendo rascunho para produto final
          if (key === 'initialLocation' && !isDraft) {
            // Ao converter rascunho para produto final, enviar initialLocation para definir onde colocar o estoque
            cleanedData[key] = value;
            console.log(`✅ [FRONTEND UPDATE] Campo "${key}" adicionado ao cleanedData (conversão para produto final):`, value);
            return;
          } else if (key === 'initialLocation') {
            // Se for rascunho, não enviar initialLocation
            console.log(`⏭️ [FRONTEND UPDATE] Pulando campo "${key}" (rascunho não precisa de initialLocation)`);
            return;
          }
          
          if (isDraft) {
            // Para rascunhos: apenas enviar campos que têm valores (não enviar null ou vazio)
            // Isso permite que o backend mantenha os valores atuais dos campos não enviados
            if (value !== '' && value !== undefined && value !== null) {
              cleanedData[key] = value;
              console.log(`✅ [FRONTEND UPDATE] Campo "${key}" adicionado ao cleanedData:`, value);
            }
            // Campos numéricos podem ser 0
            else if (['stock', 'minStock'].includes(key) && value === 0) {
              cleanedData[key] = 0;
              console.log(`✅ [FRONTEND UPDATE] Campo numérico "${key}" adicionado como 0`);
            }
            // Campos vazios/null não são enviados - mantém valores atuais no backend
            else {
              console.log(`⏭️ [FRONTEND UPDATE] Campo "${key}" não será enviado (vazio/null)`);
            }
          } else {
            // Para produtos finais: apenas valores válidos (não vazios)
            if (value !== '' && value !== undefined && value !== null) {
              cleanedData[key] = value;
              console.log(`✅ [FRONTEND UPDATE] Campo "${key}" adicionado ao cleanedData:`, value);
            } else {
              console.log(`⏭️ [FRONTEND UPDATE] Campo "${key}" não será enviado (produto final precisa de valor)`);
            }
          }
        });
        
        console.log('🔍 [FRONTEND UPDATE] Passo 4: cleanedData após processamento:', JSON.stringify(cleanedData, null, 2));
        console.log('🔍 [FRONTEND UPDATE] Quantidade de campos em cleanedData:', Object.keys(cleanedData).length);
        
        // Se for rascunho e não há dados para atualizar (apenas imagens), enviar apenas isDraft
        if (isDraft && Object.keys(cleanedData).length === 0) {
          // Apenas marcar como rascunho sem alterar outros campos
          cleanedData.isDraft = true;
          console.log('⚠️ [FRONTEND UPDATE] Nenhum campo para atualizar, adicionando apenas isDraft: true');
        }
        
        const finalPayload = { ...cleanedData, isDraft: isDraft };
        console.log('📤 [FRONTEND UPDATE] Passo 5: Payload final que será enviado:', JSON.stringify(finalPayload, null, 2));
        console.log('📤 [FRONTEND UPDATE] URL da requisição:', `PUT /api/products/${selectedProduct.id}`);
        console.log('📤 [FRONTEND UPDATE] É rascunho?', isDraft);
        
        // Atualizar dados do produto (sem a imagem)
        console.log('🚀 [FRONTEND UPDATE] Passo 6: Enviando requisição para atualizar produto...');
        console.log('🚀 [FRONTEND UPDATE] Timestamp:', new Date().toISOString());
        
        try {
          const updatedProduct = await productsApi.update(selectedProduct.id, finalPayload);
          console.log('✅ [FRONTEND UPDATE] Passo 7: Produto atualizado com sucesso!');
          console.log('✅ [FRONTEND UPDATE] Resposta do servidor:', JSON.stringify(updatedProduct, null, 2));
        
        } catch (apiError: any) {
          console.error('💥 [FRONTEND UPDATE] ========== ERRO NA REQUISIÇÃO ==========');
          console.error('💥 [FRONTEND UPDATE] Erro completo:', apiError);
          console.error('💥 [FRONTEND UPDATE] Tipo do erro:', apiError?.constructor?.name);
          console.error('💥 [FRONTEND UPDATE] Mensagem do erro:', apiError?.message);
          console.error('💥 [FRONTEND UPDATE] Código do erro:', apiError?.code);
          console.error('💥 [FRONTEND UPDATE] Status HTTP:', apiError?.response?.status);
          console.error('💥 [FRONTEND UPDATE] Status Text:', apiError?.response?.statusText);
          console.error('💥 [FRONTEND UPDATE] Headers da resposta:', apiError?.response?.headers);
          console.error('💥 [FRONTEND UPDATE] Dados da resposta:', JSON.stringify(apiError?.response?.data, null, 2));
          console.error('💥 [FRONTEND UPDATE] Config da requisição:', {
            url: apiError?.config?.url,
            method: apiError?.config?.method,
            baseURL: apiError?.config?.baseURL,
            data: JSON.stringify(apiError?.config?.data, null, 2),
            headers: apiError?.config?.headers
          });
          console.error('💥 [FRONTEND UPDATE] Stack trace:', apiError?.stack);
          console.error('💥 [FRONTEND UPDATE] Payload que causou o erro:', JSON.stringify(finalPayload, null, 2));
          throw apiError;
        }
        
        // Deletar imagens marcadas para exclusão
        console.log('🗑️ [FRONTEND UPDATE] Passo 8: Verificando imagens para deletar...');
        const imagesToDeleteSet = imagesToDelete || new Set<string>();
        if (imagesToDeleteSet.size > 0) {
          console.log('🗑️ [FRONTEND UPDATE] Deletando imagens:', Array.from(imagesToDeleteSet));
          for (const imageId of imagesToDeleteSet) {
            try {
              await productsApi.deleteImage(selectedProduct.id, imageId);
              console.log(`✅ [FRONTEND UPDATE] Imagem ${imageId} deletada com sucesso`);
            } catch (error: any) {
              console.error(`❌ [FRONTEND UPDATE] Erro ao deletar imagem ${imageId}:`, error);
              // Continuar mesmo se uma falhar
            }
          }
        }
        
        // Se há uma nova imagem, fazer o upload (compatibilidade)
        console.log('🖼️ [FRONTEND UPDATE] Passo 9: Verificando imagens para upload...');
        if (imageFile) {
          console.log('📷 [FRONTEND UPDATE] Fazendo upload de nova imagem (compatibilidade)...');
          console.log('📷 [FRONTEND UPDATE] Detalhes da imagem:', {
            name: imageFile.name,
            size: imageFile.size,
            type: imageFile.type
          });
          await productsApi.uploadImage(selectedProduct.id, imageFile);
          console.log('✅ [FRONTEND UPDATE] Imagem atualizada com sucesso');
        }
        // Upload de múltiplas imagens por tipo
        if (imageFilesRoupa && (imageFilesRoupa as File[]).length > 0) {
          console.log('🖼️ [FRONTEND UPDATE] Enviando imagens ROUPA...', (imageFilesRoupa as File[]).length);
          console.log('🖼️ [FRONTEND UPDATE] Detalhes das imagens ROUPA:', imageFilesRoupa.map((f: File) => ({
            name: f.name,
            size: f.size,
            type: f.type
          })));
          await productsApi.uploadImages(selectedProduct.id, imageFilesRoupa as File[], 'ROUPA');
          console.log('✅ [FRONTEND UPDATE] Imagens ROUPA enviadas com sucesso');
        }
        if (imageFilesIA && (imageFilesIA as File[]).length > 0) {
          console.log('🤖 [FRONTEND UPDATE] Enviando imagens IA...', (imageFilesIA as File[]).length);
          console.log('🤖 [FRONTEND UPDATE] Detalhes das imagens IA:', imageFilesIA.map((f: File) => ({
            name: f.name,
            size: f.size,
            type: f.type
          })));
          await productsApi.uploadImages(selectedProduct.id, imageFilesIA as File[], 'IA');
          console.log('✅ [FRONTEND UPDATE] Imagens IA enviadas com sucesso');
        }
        
        // Atualizar a lista de produtos
        console.log('🔄 [FRONTEND UPDATE] Passo 9: Invalidando cache de produtos...');
        queryClient.invalidateQueries({ queryKey: ['products'] });
        console.log('✅ [FRONTEND UPDATE] Cache invalidado');
        
        console.log('🔄 [FRONTEND UPDATE] Passo 10: Fechando modal e limpando estado...');
        setShowEditModal(false);
        setSelectedProduct(null);
        console.log('✅ [FRONTEND UPDATE] Modal fechado');
        
        toast.success(isDraft ? 'Rascunho atualizado com sucesso!' : 'Produto atualizado com sucesso!');
        console.log('✅ [FRONTEND UPDATE] ========== ATUALIZAÇÃO CONCLUÍDA COM SUCESSO ==========');
      } catch (error: any) {
        console.error('💥 [FRONTEND UPDATE] ========== ERRO GERAL ==========');
        console.error('💥 [FRONTEND UPDATE] Erro ao atualizar produto:', error);
        console.error('💥 [FRONTEND UPDATE] Tipo do erro:', error?.constructor?.name);
        console.error('💥 [FRONTEND UPDATE] Mensagem:', error?.message);
        console.error('💥 [FRONTEND UPDATE] Stack:', error?.stack);
        console.error('💥 [FRONTEND UPDATE] Resposta do servidor (se houver):', error?.response?.data);
        console.error('💥 [FRONTEND UPDATE] Status HTTP:', error?.response?.status);
        console.error('💥 [FRONTEND UPDATE] URL da requisição:', error?.config?.url);
        console.error('💥 [FRONTEND UPDATE] Método:', error?.config?.method);
        console.error('💥 [FRONTEND UPDATE] Payload enviado:', JSON.stringify(error?.config?.data, null, 2));
        toast.error(error.response?.data?.error || error.response?.data?.message || 'Erro ao atualizar produto');
        console.error('💥 [FRONTEND UPDATE] ========== FIM DO ERRO ==========');
      }
    } else {
      console.error('❌ [FRONTEND UPDATE] Nenhum produto selecionado!');
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

    // Buscar o tamanho pelo ID para obter o objeto completo
    const sizeObj = sizes.find(s => s.id === product.sizeId);
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

  const handleCreateSubcategory = async (data: { name: string; code: string; description?: string; categoryId: string }) => {
    createSubcategoryMutation.mutate(data);
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

  const handleFinishProduction = async (id: string) => {
    console.log('🔘 [FRONTEND DEBUG] Botão Finalizar Processo clicado para produto:', id);
    
    if (window.confirm('Tem certeza que deseja finalizar o processamento deste produto e adicioná-lo ao estoque?')) {
      console.log('🔘 [FRONTEND DEBUG] Usuário confirmou, iniciando processo...');
      try {
        console.log('🚀 [FRONTEND DEBUG] Chamando API finishProduction...');
        const result = await finishProductionMutation.mutateAsync(id);
        console.log('✅ [FRONTEND DEBUG] API retornou sucesso:', result);
      } catch (error: any) {
        console.error('💥 [FRONTEND DEBUG] Erro capturado:', error);
        // Erro já tratado na mutation
      }
    } else {
      console.log('❌ [FRONTEND DEBUG] Usuário cancelou a operação');
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) return { color: 'text-red-600 bg-red-100', text: 'Sem estoque' };
    if (product.stock <= product.minStock) return { color: 'text-yellow-600 bg-yellow-100', text: 'Estoque baixo' };
    return { color: 'text-green-600 bg-green-100', text: 'Em estoque' };
  };

  // Função para verificar se produto está processando
  const isProductProcessing = (product: Product) => {
    const debugInfo = {
      productId: product.id,
      productName: product.name,
      description: product.description,
      hasFinalizadoMark: product.description ? product.description.includes('[FINALIZADO]') : false,
      inFinishedProducts: finishedProducts.has(product.id),
      status: product.status,
      inProduction: product.inProduction,
    };
    
    console.log('🔍 [FRONTEND DEBUG] Verificando se produto está processando:', debugInfo);
    
    // Verificar se foi finalizado no banco (marca na descrição)
    if (product.description && product.description.includes('[FINALIZADO]')) {
      console.log('✅ [FRONTEND DEBUG] Produto NÃO está processando - tem marca [FINALIZADO] no banco');
      return false;
    }
    
    // Se foi finalizado localmente, não está mais processando
    if (finishedProducts.has(product.id)) {
      console.log('✅ [FRONTEND DEBUG] Produto NÃO está processando - está na lista local');
      return false;
    }
    
    // Se tem status definido, usa ele
    if (product.status !== undefined) {
      const isProcessing = product.status === 'PROCESSANDO';
      console.log(`🔍 [FRONTEND DEBUG] Usando campo status: ${product.status} -> processando: ${isProcessing}`);
      return isProcessing;
    }
    
    // Se tem inProduction definido, usa ele
    if (product.inProduction !== undefined) {
      console.log(`🔍 [FRONTEND DEBUG] Usando campo inProduction: ${product.inProduction}`);
      return product.inProduction === true;
    }
    
    // Se não tem nenhum campo definido, considera que está processando
    // (produtos sem migration)
    console.log('🔍 [FRONTEND DEBUG] Produto ESTÁ processando - fallback (sem campos definidos)');
    return true;
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
                  <div className="flex items-center gap-3">
                    {/* Botões de Entrada e Saída */}
                    <button
                      onClick={() => setShowEntryModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                      title="Registrar entrada de estoque"
                    >
                      <ArrowDown className="w-4 h-4" />
                      Entradas
                    </button>
                    <button
                      onClick={() => setShowExitModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                      title="Registrar saída de estoque"
                    >
                      <ArrowUp className="w-4 h-4" />
                      Saídas
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="w-4 h-4" />
                      <span>Catálogo de Produtos</span>
                    </div>
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
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={getImageUrl(product.images[0]?.url)}
                                alt={product.name || 'Produto sem nome'}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  const imageUrl = product.images?.[0]?.url;
                                  const finalUrl = imageUrl ? getImageUrl(imageUrl) : '';
                                  console.error(`❌ [PRODUCT CARD] Erro ao carregar imagem:`, {
                                    productId: product.id,
                                    productName: product.name,
                                    imageUrl,
                                    finalUrl,
                                    apiUrl: import.meta.env.REACT_APP_API_URL || import.meta.env.VITE_API_URL || 'não configurada',
                                    error: e.currentTarget.src,
                                    status: (e.target as HTMLImageElement).complete ? 'complete' : 'loading'
                                  });
                                  // Tentar carregar a imagem novamente com URL alternativa
                                  if (finalUrl && finalUrl !== e.currentTarget.src) {
                                    console.log('🔄 [PRODUCT CARD] Tentando recarregar com URL:', finalUrl);
                                    e.currentTarget.src = finalUrl;
                                  } else {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }
                                }}
                                onLoad={() => {
                                  console.log(`✅ [PRODUCT CARD] Imagem carregada com sucesso:`, {
                                    productId: product.id,
                                    imageUrl: product.images?.[0]?.url,
                                    finalUrl: product.images?.[0]?.url ? getImageUrl(product.images[0].url) : ''
                                  });
                                }}
                              />
                            ) : product.imageUrl ? (
                              <img
                                src={getImageUrl(product.imageUrl)}
                                alt={product.name || 'Produto sem nome'}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center ${(product.images && product.images.length > 0) || product.imageUrl ? 'hidden' : ''}`}>
                              <Package className="w-12 h-12 text-gray-400" />
                            </div>
                            
                            {/* Status Badge */}
                            <div className="absolute top-3 right-3 flex flex-col gap-1">
                              {product.isDraft && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Rascunho
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {product.active ? 'Ativo' : 'Inativo'}
                              </span>
                              {isProductProcessing(product) && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Processando
                                </span>
                              )}

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
                                  R$ {product.price ? product.price.toFixed(2) : '0.00'}
                                </span>
                              </div>
                              
                              <div className="text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-gray-600">Estoque:</span>
                                  <span className={`font-medium ${product.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                                    {product.stock} un
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Loja: <span className="font-semibold text-green-600">{product.stockLoja || 0}</span></span>
                                  <span>Armazém: <span className="font-semibold text-blue-600">{product.stockArmazem || 0}</span></span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Código:</span>
                                <span className="font-mono text-xs text-gray-500">
                                  {product.barcode || 'N/A'}
                                </span>
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="space-y-2 pt-3 border-t border-gray-100">
                              {/* Primeira linha - Ações básicas */}
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowDetailsModal(true);
                                  }}
                                  className="px-2 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Ver
                                </button>
                                
                                <button
                                  onClick={() => {
                                    console.log('✏️ [EDIT CLICK] Produto selecionado para edição:', {
                                      id: product.id,
                                      name: product.name,
                                      imagesCount: product.images?.length || 0,
                                      images: product.images?.map(img => ({ id: img.id, url: img.url, type: img.type })) || [],
                                      hasImages: !!product.images,
                                      isArray: Array.isArray(product.images)
                                    });
                                    setSelectedProduct(product);
                                    setShowEditModal(true);
                                  }}
                                  className="px-2 py-1.5 text-xs bg-yellow-50 text-yellow-600 rounded-md hover:bg-yellow-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Editar
                                </button>
                                
                                <button
                                  onClick={() => handleGenerateCodes(product)}
                                  className="px-2 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                  title="Gerar códigos de barras"
                                >
                                  <Barcode className="w-3 h-3" />
                                  Códigos
                                </button>
                              </div>

                              {/* Segunda linha - Gestão de estoque */}
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowStockModal(true);
                                  }}
                                  className="px-2 py-1.5 text-xs bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                  title="Gerenciar estoque geral"
                                >
                                  <Package className="w-3 h-3" />
                                  Estoque
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowTransferModal(true);
                                  }}
                                  className="px-2 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                  title="Transferir entre localizações"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                  Transfer
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                  title="Excluir produto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Excluir
                                </button>
                              </div>

                              {/* Terceira linha - Ações especiais (apenas se necessário) */}
                              {isProductProcessing(product) && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => handleFinishProduction(product.id)}
                                    className="w-full px-2 py-1.5 text-xs bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors duration-200 flex items-center justify-center gap-1"
                                    title="Finalizar processo"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Finalizar Processo
                                  </button>
                                </div>
                              )}
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
              {productsData?.pagination && productsData.pagination.total > (filters.limit || 20) && (
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
                        disabled={(filters.page || 1) >= Math.ceil((productsData.pagination?.total || 0) / (filters.limit || 20))}
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
          product={undefined}
          categories={categories}
          subcategories={subcategories}
          patterns={patterns}
          sizes={sizes}
          onSubmit={handleCreateProduct}
          onClose={() => setShowCreateModal(false)}
          isLoading={createMutation.isPending}
          setShowCategoryModal={setShowCategoryModal}
          setShowSubcategoryModal={setShowSubcategoryModal}
          setShowPatternModal={setShowPatternModal}
          setSelectedCategoryId={setSelectedCategoryId}
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
          setShowCategoryModal={setShowCategoryModal}
          setShowSubcategoryModal={setShowSubcategoryModal}
          setShowPatternModal={setShowPatternModal}
          setSelectedCategoryId={setSelectedCategoryId}
          onProductUpdate={(updatedProduct) => {
            setSelectedProduct(updatedProduct);
          }}
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

      {showSubcategoryModal && (
        <SubcategoryFormModal
          categoryId={selectedCategoryId}
          onSubmit={handleCreateSubcategory}
          onClose={() => setShowSubcategoryModal(false)}
          isLoading={createSubcategoryMutation.isPending}
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

      {showTransferModal && selectedProduct && (
        <TransferStockModal
          product={selectedProduct}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}

      {/* Entry Stock Modal */}
      {showEntryModal && (
        <EntryStockModal
          onClose={() => setShowEntryModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}

      {/* Exit Stock Modal */}
      {showExitModal && (
        <ExitStockModal
          onClose={() => setShowExitModal(false)}
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
  imageFilesRoupa?: File[];
  imageFilesIA?: File[];
  initialLocation?: 'LOJA' | 'ARMAZEM'; // Nova propriedade para localização inicial
}

interface ProductFormModalProps {
  title: string;
  product?: Product;
  categories: Category[];
  subcategories: Subcategory[];
  patterns: Pattern[];
  sizes: Size[];
  onSubmit: (data: ProductFormData, saveAsDraft?: boolean, imagesToDelete?: Set<string>) => void;
  onClose: () => void;
  isLoading: boolean;
  setShowCategoryModal: (show: boolean) => void;
  setShowSubcategoryModal: (show: boolean) => void;
  setShowPatternModal: (show: boolean) => void;
  setSelectedCategoryId: (id: string) => void;
  onProductUpdate?: (product: Product) => void;
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
  setShowCategoryModal,
  setShowSubcategoryModal,
  setShowPatternModal,
  setSelectedCategoryId,
  onProductUpdate,
}) => {
  const queryClient = useQueryClient();
  
  // Função auxiliar para normalizar URLs para comparação
  const normalizeUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    // Remover protocolo e domínio, manter apenas o caminho
    return url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '/');
  };
  
  // Log quando produto ou imageUrl mudar
  useEffect(() => {
    console.log('🔄 [FORM MODAL] Produto atualizado:', {
      productId: product?.id,
      imageUrl: product?.imageUrl,
      normalizedImageUrl: normalizeUrl(product?.imageUrl),
      hasImages: !!product?.images,
      imagesCount: product?.images?.length || 0,
      images: product?.images?.map(img => ({
        id: img.id,
        url: img.url,
        normalizedUrl: normalizeUrl(img.url)
      })) || []
    });
  }, [product?.id, product?.imageUrl, product?.images]);
  
  console.log('🔧 [FORM MODAL] Inicializando formulário:', {
    title,
    product: product ? {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      sizeId: product.sizeId,
      patternId: product.patternId,
      price: product.price,
      stock: product.stock,
      imagesCount: product.images?.length || 0,
      images: product.images?.map(img => ({ id: img.id, url: img.url, type: img.type })) || []
    } : null,
    sizesCount: sizes.length,
    categoriesCount: categories.length,
    patternsCount: patterns.length,
    subcategoriesCount: subcategories.length
  });

  // Estado para armazenar imagens existentes do produto
  const [existingImagesRoupa, setExistingImagesRoupa] = useState<Array<{ id: string; url: string; type: string }>>([]);
  const [existingImagesIA, setExistingImagesIA] = useState<Array<{ id: string; url: string; type: string }>>([]);
  
  // Estado para rastrear imagens marcadas para exclusão
  const [imagesToDelete, setImagesToDelete] = useState<Set<string>>(new Set());

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
    imageFilesRoupa: [],
    imageFilesIA: [],
  });

  // Carregar imagens existentes quando o produto mudar
  useEffect(() => {
    console.log('🖼️ [FORM MODAL] useEffect - produto mudou:', {
      productId: product?.id,
      hasProduct: !!product,
      hasImages: !!product?.images,
      imagesCount: product?.images?.length || 0,
      images: product?.images?.map(img => ({ id: img.id, url: img.url, type: img.type })) || [],
      productFull: product ? JSON.stringify(product, null, 2).substring(0, 500) : null
    });
    
    // Limpar lista de imagens a deletar quando produto mudar
    setImagesToDelete(new Set());
    
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      const roupaImages = product.images.filter(img => img && img.type === 'ROUPA');
      const iaImages = product.images.filter(img => img && img.type === 'IA');
      
      console.log('🖼️ [FORM MODAL] Filtrando imagens:', {
        total: product.images.length,
        roupa: roupaImages.length,
        ia: iaImages.length,
        allTypes: product.images.map(img => img?.type)
      });
      
      setExistingImagesRoupa(roupaImages);
      setExistingImagesIA(iaImages);
      
      console.log('🖼️ [FORM MODAL] Imagens existentes carregadas:', {
        roupa: roupaImages.length,
        ia: iaImages.length,
        total: product.images.length,
        roupaImages: roupaImages.map(img => ({ id: img.id, url: img.url, type: img.type })),
        iaImages: iaImages.map(img => ({ id: img.id, url: img.url, type: img.type }))
      });
    } else {
      console.log('🖼️ [FORM MODAL] Nenhuma imagem encontrada, limpando estados', {
        hasProduct: !!product,
        hasImages: !!product?.images,
        isArray: Array.isArray(product?.images),
        length: product?.images?.length
      });
      setExistingImagesRoupa([]);
      setExistingImagesIA([]);
    }
  }, [product?.id, product?.images?.length, product?.imageUrl]); // Incluir imageUrl para reagir quando imagem principal mudar

  // Debug apenas quando produto muda
  useEffect(() => {
    console.log('📝 [FORM MODAL] FormData inicial:', formData);
    console.log('🔍 [FORM MODAL] Tamanho encontrado nos sizes:', sizes.find(s => s.id === formData.sizeId));
  }, [product?.id]); // Só executa quando produto mudar

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

    console.log('🔍 [FORM MODAL] Validando formulário:', formData);

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

    if (Object.keys(newErrors).length > 0) {
      console.error('❌ [FORM MODAL] Erros de validação:', newErrors);
    } else {
      console.log('✅ [FORM MODAL] Validação passou');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();
    console.log('📝 [FORM SUBMIT] Iniciando submit:', { 
      saveAsDraft, 
      isEditing: !!product,
      productStatus: product?.status,
      formData: { 
        ...formData, 
        imageFile: formData.imageFile ? 'File exists' : null, 
        imageFilesRoupa: formData.imageFilesRoupa?.length || 0, 
        imageFilesIA: formData.imageFilesIA?.length || 0 
      } 
    });
    
    // Se for salvar como rascunho, não validar nada
    // Se for salvar como produto final, validar todos os campos obrigatórios
    const isValid = saveAsDraft || validateForm();
    
    console.log('✅ [FORM SUBMIT] Validação:', { 
      saveAsDraft, 
      isValid, 
      errors: isValid ? 'Nenhum erro' : errors 
    });
    
    if (isValid) {
      const submitData: ProductFormData = {
        ...formData,
        subcategoryId: formData.subcategoryId || undefined,
        price: formData.price ? normalizePrice(formData.price) : undefined,
        cost: formData.cost ? normalizePrice(formData.cost) : undefined,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        imageFile: formData.imageFile || undefined,
        imageFilesRoupa: formData.imageFilesRoupa || [],
        imageFilesIA: formData.imageFilesIA || [],
        initialLocation: formData.initialLocation || 'LOJA', // Padrão para Loja
        saveAsDraft: saveAsDraft,
      };
      console.log('🚀 [FORM SUBMIT] Chamando onSubmit com dados:', { 
        ...submitData, 
        imageFile: submitData.imageFile ? 'File exists' : null, 
        imageFilesRoupa: submitData.imageFilesRoupa?.length || 0, 
        imageFilesIA: submitData.imageFilesIA?.length || 0,
        saveAsDraft: saveAsDraft
      });
      onSubmit(submitData, saveAsDraft, imagesToDelete);
    } else {
      console.error('❌ [FORM SUBMIT] Validação falhou, não enviando:', errors);
      // Mostrar mensagem de erro para o usuário
      const errorMessages = Object.values(errors);
      if (errorMessages.length > 0) {
        toast.error(`Por favor, preencha os campos obrigatórios: ${errorMessages.join(', ')}`);
      } else {
        toast.error('Por favor, preencha todos os campos obrigatórios');
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
    }
  };

  const handleImagesRoupaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    
    // Validar que todos são Files válidos ANTES de adicionar ao state
    const validFiles: File[] = [];
    files.forEach((file, index) => {
      if (file instanceof File && file.size > 0) {
        validFiles.push(file);
        console.log(`✅ [IMAGES ROUPA] Arquivo ${index + 1} válido:`, {
          name: file.name,
          size: file.size,
          type: file.type
        });
      } else {
        console.error(`❌ [IMAGES ROUPA] Arquivo ${index + 1} inválido:`, {
          isFile: file instanceof File,
          size: file instanceof File ? file.size : undefined,
          type: typeof file
        });
      }
    });
    
    if (validFiles.length === 0 && files.length > 0) {
      toast.error('Nenhum arquivo válido foi selecionado');
      e.target.value = '';
      return;
    }
    
    const currentFiles = formData.imageFilesRoupa || [];
    const totalExisting = existingImagesRoupa.length;
    const totalNew = currentFiles.length + validFiles.length;
    const totalAllowed = 6 - totalExisting; // Espaços disponíveis considerando imagens existentes
    
    if (totalNew > totalAllowed) {
      toast.error(`Máximo de 6 imagens permitidas. Você já tem ${totalExisting} imagem(ns) existente(s). Pode adicionar apenas ${totalAllowed} nova(s).`);
      const limitedNewFiles = validFiles.slice(0, Math.max(0, totalAllowed - currentFiles.length));
      if (limitedNewFiles.length > 0) {
        setFormData(prev => ({ ...prev, imageFilesRoupa: [...currentFiles, ...limitedNewFiles] }));
        toast.success(`${limitedNewFiles.length} imagem(ns) adicionada(s) à categoria ROUPA.`);
      }
      e.target.value = '';
      return;
    }
    
    const totalFiles = [...currentFiles, ...validFiles];
    setFormData(prev => ({ ...prev, imageFilesRoupa: totalFiles }));
    
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} imagem(ns) adicionada(s) à categoria Roupa.`);
    }
    
    // Limpar o input para permitir selecionar os mesmos arquivos novamente
    e.target.value = '';
  };

  const handleImagesIAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    
    // Validar que todos são Files válidos ANTES de adicionar ao state
    const validFiles: File[] = [];
    files.forEach((file, index) => {
      if (file instanceof File && file.size > 0) {
        validFiles.push(file);
        console.log(`✅ [IMAGES IA] Arquivo ${index + 1} válido:`, {
          name: file.name,
          size: file.size,
          type: file.type
        });
      } else {
        console.error(`❌ [IMAGES IA] Arquivo ${index + 1} inválido:`, {
          isFile: file instanceof File,
          size: file instanceof File ? file.size : undefined,
          type: typeof file
        });
      }
    });
    
    if (validFiles.length === 0 && files.length > 0) {
      toast.error('Nenhum arquivo válido foi selecionado');
      e.target.value = '';
      return;
    }
    
    const currentFiles = formData.imageFilesIA || [];
    const totalExisting = existingImagesIA.length;
    const totalNew = currentFiles.length + validFiles.length;
    const totalAllowed = 6 - totalExisting; // Espaços disponíveis considerando imagens existentes
    
    if (totalNew > totalAllowed) {
      toast.error(`Máximo de 6 imagens permitidas. Você já tem ${totalExisting} imagem(ns) existente(s). Pode adicionar apenas ${totalAllowed} nova(s).`);
      const limitedNewFiles = validFiles.slice(0, totalAllowed - currentFiles.length);
      if (limitedNewFiles.length > 0) {
        setFormData(prev => ({ ...prev, imageFilesIA: [...currentFiles, ...limitedNewFiles] }));
        toast.success(`${limitedNewFiles.length} imagem(ns) adicionada(s) à categoria IA.`);
      }
      e.target.value = '';
      return;
    }
    
    const totalFiles = [...currentFiles, ...validFiles];
    const limitedFiles = totalFiles;
    
    setFormData(prev => ({ ...prev, imageFilesIA: limitedFiles }));
    
    if (totalFiles.length > 6) {
      toast.error(`Máximo de 6 imagens permitidas. ${totalFiles.length - 6} imagem(ns) não foram adicionadas.`);
    } else if (validFiles.length > 0) {
      toast.success(`${validFiles.length} imagem(ns) adicionada(s) à categoria IA.`);
    }
    
    // Limpar o input para permitir selecionar os mesmos arquivos novamente
    e.target.value = '';
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estoque Inicial
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
                  Localização Inicial
                </label>
                <select
                  value={formData.initialLocation || 'LOJA'}
                  onChange={(e) => setFormData(prev => ({ ...prev, initialLocation: e.target.value as 'LOJA' | 'ARMAZEM' }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOJA">🏪 Loja</option>
                  <option value="ARMAZEM">🏭 Armazém</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Onde o estoque inicial será adicionado
                </p>
              </div>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                Categoria *
              </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                  title="Criar nova categoria"
                >
                  + Nova
                </button>
              </div>
              <SearchableSelect
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Subcategoria (opcional)
              </label>
                {formData.categoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(formData.categoryId);
                      setShowSubcategoryModal(true);
                    }}
                    className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                    title="Criar nova subcategoria"
                  >
                    + Nova
                  </button>
                )}
              </div>
              <SearchableSelect
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Estampa *
              </label>
                <button
                  type="button"
                  onClick={() => setShowPatternModal(true)}
                  className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                  title="Criar nova estampa"
                >
                  + Nova
                </button>
              </div>
              <SearchableSelect
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
            </div>

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

            <div className="space-y-4">
              {/* Seção de Imagem Principal */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⭐ Imagem Principal
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  A imagem principal será exibida como destaque do produto. Passe o mouse sobre qualquer imagem abaixo para defini-la como principal.
                </p>
                
                {/* Mostrar imagem principal atual */}
                {product?.imageUrl ? (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-2">Imagem principal atual:</p>
                    <div className="relative inline-block">
                      <img
                        src={getImageUrl(product.imageUrl)}
                        alt="Imagem principal"
                        className="w-24 h-24 object-cover rounded border-2 border-yellow-400"
                        key={`main-${product.imageUrl}`}
                        onError={(e) => {
                          console.error('❌ [MAIN IMAGE] Erro ao carregar imagem principal:', product.imageUrl);
                        }}
                        onLoad={() => {
                          console.log('✅ [MAIN IMAGE] Imagem principal carregada:', product.imageUrl);
                        }}
                      />
                      <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs px-1 rounded-bl">
                        Principal
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 italic">Nenhuma imagem principal definida. Clique em uma imagem abaixo para defini-la.</p>
                  </div>
                )}
                
                {/* Mostrar todas as imagens existentes (ROUPA e IA) para escolher como principal */}
                {(existingImagesRoupa.length > 0 || existingImagesIA.length > 0) && (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">
                      Clique em uma imagem abaixo para torná-la principal:
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {/* Imagens ROUPA */}
                      {existingImagesRoupa.map((img) => (
                        <div 
                          key={img.id} 
                          className="relative group cursor-pointer"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (product?.id) {
                              try {
                                console.log('🖼️ [SET MAIN IMAGE] Iniciando:', {
                                  productId: product.id,
                                  imageId: img.id,
                                  currentImageUrl: product.imageUrl,
                                  newImageUrl: img.url
                                });
                                const response = await productsApi.setMainImage(product.id, img.id);
                                console.log('✅ [SET MAIN IMAGE] Resposta:', {
                                  message: response.message,
                                  productImageUrl: response.product?.imageUrl,
                                  productId: response.product?.id
                                });
                                toast.success('Imagem definida como principal!');
                                queryClient.invalidateQueries({ queryKey: ['products'] });
                                // Atualizar o produto no componente pai se callback disponível
                                if (response.product && onProductUpdate) {
                                  console.log('🔄 [SET MAIN IMAGE] Chamando onProductUpdate com:', response.product);
                                  onProductUpdate(response.product);
                                } else {
                                  console.warn('⚠️ [SET MAIN IMAGE] onProductUpdate não disponível ou produto não retornado');
                                }
                              } catch (error: any) {
                                console.error('❌ [SET MAIN IMAGE] Erro:', error);
                                toast.error(error.response?.data?.error || 'Erro ao definir imagem principal');
                              }
                            }
                          }}
                        >
                          <img
                            src={getImageUrl(img.url)}
                            alt="Imagem Roupa"
                            className={`w-full h-20 object-cover rounded border-2 transition-all ${
                              normalizeUrl(product?.imageUrl) === normalizeUrl(img.url)
                                ? 'border-yellow-400 ring-2 ring-yellow-300' 
                                : 'border-blue-300 group-hover:border-yellow-400'
                            }`}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200 flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200">
                              Tornar Principal
                            </div>
                          </div>
                          {normalizeUrl(product?.imageUrl) === normalizeUrl(img.url) && (
                            <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs px-1 rounded-bl z-10">
                              ⭐
                            </span>
                          )}
                        </div>
                      ))}
                      
                      {/* Imagens IA */}
                      {existingImagesIA.map((img) => (
                        <div 
                          key={img.id} 
                          className="relative group cursor-pointer"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (product?.id) {
                              try {
                                console.log('🖼️ [SET MAIN IMAGE] Iniciando:', {
                                  productId: product.id,
                                  imageId: img.id,
                                  currentImageUrl: product.imageUrl,
                                  newImageUrl: img.url
                                });
                                const response = await productsApi.setMainImage(product.id, img.id);
                                console.log('✅ [SET MAIN IMAGE] Resposta:', {
                                  message: response.message,
                                  productImageUrl: response.product?.imageUrl,
                                  productId: response.product?.id
                                });
                                toast.success('Imagem definida como principal!');
                                queryClient.invalidateQueries({ queryKey: ['products'] });
                                // Atualizar o produto no componente pai se callback disponível
                                if (response.product && onProductUpdate) {
                                  console.log('🔄 [SET MAIN IMAGE] Chamando onProductUpdate com:', response.product);
                                  onProductUpdate(response.product);
                                } else {
                                  console.warn('⚠️ [SET MAIN IMAGE] onProductUpdate não disponível ou produto não retornado');
                                }
                              } catch (error: any) {
                                console.error('❌ [SET MAIN IMAGE] Erro:', error);
                                toast.error(error.response?.data?.error || 'Erro ao definir imagem principal');
                              }
                            }
                          }}
                        >
                          <img
                            src={getImageUrl(img.url)}
                            alt="Imagem IA"
                            className={`w-full h-20 object-cover rounded border-2 transition-all ${
                              normalizeUrl(product?.imageUrl) === normalizeUrl(img.url)
                                ? 'border-yellow-400 ring-2 ring-yellow-300' 
                                : 'border-purple-300 group-hover:border-yellow-400'
                            }`}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200 flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200">
                              Tornar Principal
                            </div>
                          </div>
                          {normalizeUrl(product?.imageUrl) === normalizeUrl(img.url) && (
                            <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs px-1 rounded-bl z-10">
                              ⭐
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Campo de upload para compatibilidade */}
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload de nova imagem principal (opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Compatibilidade com o campo antigo de imagem única</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🖼️ Imagens da Roupa (máximo 6)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Selecionar Imagens da Roupa
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImagesRoupaChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-sm text-gray-600">
                        {(existingImagesRoupa.length + (formData.imageFilesRoupa?.length || 0))}/6 imagens
                      </span>
                    </div>
                    {formData.imageFilesRoupa && formData.imageFilesRoupa.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, imageFilesRoupa: [] }));
                          toast.success('Todas as imagens da categoria Roupa foram removidas');
                        }}
                        className="text-red-600 hover:text-red-800 text-sm underline"
                      >
                        Limpar todas
                      </button>
                    )}
                  </div>
                  
                  {/* Mostrar imagens existentes */}
                  {existingImagesRoupa.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">
                        📸 {existingImagesRoupa.length} imagem(ns) existente(s) na categoria ROUPA
                      </p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {existingImagesRoupa.map((img, index) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={getImageUrl(img.url)}
                              alt={`Imagem Roupa ${index + 1}`}
                              className="w-full h-20 object-cover rounded border-2 border-blue-300"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded transition-all duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  // Adicionar à lista de imagens a serem deletadas
                                  setImagesToDelete(prev => new Set(prev).add(img.id));
                                  // Remover da visualização
                                  setExistingImagesRoupa(prev => prev.filter(i => i.id !== img.id));
                                  toast.success('Imagem será removida ao salvar');
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-all duration-200"
                              >
                                ×
                              </button>
                            </div>
                            <span className="absolute bottom-0 left-0 bg-blue-600 text-white text-xs px-1 rounded-tr">
                              {index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar novas imagens selecionadas */}
                  {formData.imageFilesRoupa && formData.imageFilesRoupa.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">
                        ✅ {formData.imageFilesRoupa.length} nova(s) imagem(ns) selecionada(s) para categoria ROUPA
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {formData.imageFilesRoupa.map((file, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview Roupa ${index + 1}`}
                              className="w-full h-20 object-cover rounded border-2 border-blue-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded transition-all duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newFiles = formData.imageFilesRoupa?.filter((_, i) => i !== index) || [];
                                  setFormData(prev => ({ ...prev, imageFilesRoupa: newFiles }));
                                  toast.success('Imagem removida da categoria Roupa');
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-all duration-200"
                              >
                                ×
                              </button>
                            </div>
                            <span className="absolute bottom-0 left-0 bg-green-600 text-white text-xs px-1 rounded-tr">
                              Nova {index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🤖 Imagens IA (máximo 6)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 cursor-pointer inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Selecionar Imagens IA
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImagesIAChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-sm text-gray-600">
                        {(existingImagesIA.length + (formData.imageFilesIA?.length || 0))}/6 imagens
                      </span>
                    </div>
                    {formData.imageFilesIA && formData.imageFilesIA.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, imageFilesIA: [] }));
                          toast.success('Todas as imagens da categoria IA foram removidas');
                        }}
                        className="text-red-600 hover:text-red-800 text-sm underline"
                      >
                        Limpar todas
                      </button>
                    )}
                  </div>
                  
                  {/* Mostrar imagens existentes */}
                  {existingImagesIA.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">
                        📸 {existingImagesIA.length} imagem(ns) existente(s) na categoria IA
                      </p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {existingImagesIA.map((img, index) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={getImageUrl(img.url)}
                              alt={`Imagem IA ${index + 1}`}
                              className="w-full h-20 object-cover rounded border-2 border-purple-300"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded transition-all duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  // Adicionar à lista de imagens a serem deletadas
                                  setImagesToDelete(prev => new Set(prev).add(img.id));
                                  // Remover da visualização
                                  setExistingImagesIA(prev => prev.filter(i => i.id !== img.id));
                                  toast.success('Imagem será removida ao salvar');
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-all duration-200"
                              >
                                ×
                              </button>
                            </div>
                            <span className="absolute bottom-0 left-0 bg-purple-600 text-white text-xs px-1 rounded-tr">
                              {index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Mostrar novas imagens selecionadas */}
                  {formData.imageFilesIA && formData.imageFilesIA.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">
                        ✅ {formData.imageFilesIA.length} nova(s) imagem(ns) selecionada(s) para categoria IA
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {formData.imageFilesIA.map((file, index) => (
                          <div key={`new-${index}`} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview IA ${index + 1}`}
                              className="w-full h-20 object-cover rounded border-2 border-purple-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded transition-all duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newFiles = formData.imageFilesIA?.filter((_, i) => i !== index) || [];
                                  setFormData(prev => ({ ...prev, imageFilesIA: newFiles }));
                                  toast.success('Imagem removida da categoria IA');
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-all duration-200"
                              >
                                ×
                              </button>
                            </div>
                            <span className="absolute bottom-0 left-0 bg-green-600 text-white text-xs px-1 rounded-tr">
                              Nova {index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
            {/* Botão para salvar como rascunho (apenas na criação ou quando produto já é rascunho) */}
            {(!product || product.isDraft) && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  console.log('📝 [FORM MODAL] Botão Salvar como Rascunho clicado');
                  handleSubmit(e, true);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Salvando...' : 'Salvar como Rascunho'}
              </button>
            )}
            <button
              type="submit"
              onClick={(e) => handleSubmit(e, false)}
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
  const size = sizes.find(s => s.id === product.sizeId);

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
            
            <div className="mb-4 space-y-3">
              {(product.images && product.images.length > 0) ? (
                <div>
                  <p className="text-sm text-gray-700 mb-1">Imagens da Roupa ({product.images.filter(img => img.type === 'ROUPA').length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {product.images.filter(img => img.type === 'ROUPA').map(img => (
                      <img 
                        key={img.id} 
                        src={getImageUrl(img.url)} 
                        alt="Imagem Roupa" 
                        className="w-full h-24 object-cover rounded"
                        onError={(e) => {
                          console.error(`❌ [PRODUCT DETAILS] Erro ao carregar imagem ROUPA:`, {
                            productId: product.id,
                            imageId: img.id,
                            imageUrl: img.url,
                            finalUrl: getImageUrl(img.url)
                          });
                        }}
                        onLoad={() => {
                          console.log(`✅ [PRODUCT DETAILS] Imagem ROUPA carregada:`, {
                            productId: product.id,
                            imageId: img.id,
                            imageUrl: img.url,
                            finalUrl: getImageUrl(img.url)
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {(product.images && product.images.some(img => img.type === 'IA')) ? (
                <div>
                  <p className="text-sm text-gray-700 mb-1">Imagens IA ({product.images.filter(img => img.type === 'IA').length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {product.images.filter(img => img.type === 'IA').map(img => (
                      <img 
                        key={img.id} 
                        src={getImageUrl(img.url)} 
                        alt="Imagem IA" 
                        className="w-full h-24 object-cover rounded"
                        onError={(e) => {
                          console.error(`❌ [PRODUCT DETAILS] Erro ao carregar imagem IA:`, {
                            productId: product.id,
                            imageId: img.id,
                            imageUrl: img.url,
                            finalUrl: getImageUrl(img.url)
                          });
                        }}
                        onLoad={() => {
                          console.log(`✅ [PRODUCT DETAILS] Imagem IA carregada:`, {
                            productId: product.id,
                            imageId: img.id,
                            imageUrl: img.url,
                            finalUrl: getImageUrl(img.url)
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {(!product.images || product.images.length === 0) && product.imageUrl && (
                <img 
                  src={product.imageUrl?.startsWith('http') ? product.imageUrl : `${(import.meta.env.REACT_APP_API_URL || import.meta.env.VITE_API_URL || process.env.REACT_APP_API_URL || '').replace('/api', '')}${product.imageUrl}`}
                  alt={product.name}
                  className="w-full h-48 object-contain rounded-lg"
                />
              )}
            </div>

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
                  <span className="text-sm font-medium text-gray-900">R$ {product.price ? product.price.toFixed(2) : '0.00'}</span>
                </div>
                {product.cost && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Custo:</span>
                    <span className="text-sm font-medium text-gray-900">R$ {product.cost.toFixed(2)}</span>
                  </div>
                )}
                {product.cost && product.price && (
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
                  margin: 1.5mm;
                  padding: 0mm;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  width: 37mm;
                  height: 27mm;
                  font-family: 'Arial', 'Helvetica', sans-serif;
                  font-size: 10px;
                  line-height: 1.1;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  overflow: hidden;
                  background: white;
                  color: black;
                }
                .etiqueta {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  padding: 1mm;
                  gap: 1mm;
                  align-items: center;
                  justify-content: center;
                }
                .qr-section {
                  width: 15mm;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 0.8mm;
                  padding: 0.5mm;
                }
                .qr-code {
                  width: 12mm;
                  height: 12mm;
                  object-fit: contain;
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: pixelated;
                  border: none;
                  display: block;
                  margin: 0 auto;
                }
                .sku-code {
                  font-size: 7px;
                  font-weight: bold;
                  text-align: center;
                  word-break: break-all;
                  line-height: 1.0;
                  width: 100%;
                  margin: 0;
                }
                .info-section {
                  flex: 1;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  min-width: 0;
                  overflow: hidden;
                  padding: 0.5mm;
                  gap: 0.5mm;
                }
                .product-name {
                  font-size: 10px;
                  font-weight: bold;
                  line-height: 1.1;
                  margin-bottom: 0.5mm;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                  hyphens: auto;
                  max-height: 5mm;
                  overflow: hidden;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  text-align: center;
                }
                .product-details {
                  display: flex;
                  flex-direction: column;
                  gap: 0.3mm;
                  min-height: 0;
                  justify-content: center;
                  align-items: center;
                }
                .detail-line {
                  font-size: 7px;
                  line-height: 1.0;
                  font-weight: 500;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                  hyphens: auto;
                  text-align: center;
                  width: 100%;
                }
                .detail-line.subcategory,
                .detail-line.pattern {
                  font-size: 6px;
                  line-height: 0.9;
                }
                .price {
                  font-weight: bold;
                  font-size: 9px;
                  text-align: center;
                  background: #f5f5f5;
                  padding: 0.3mm 0.5mm;
                  border-radius: 0.3mm;
                  margin-top: 0.5mm;
                  border: 1px solid #ddd;
                  white-space: nowrap;
                  width: fit-content;
                  margin-left: auto;
                  margin-right: auto;
                }
                @media print {
                  body { -webkit-print-color-adjust: exact; color-adjust: exact; }
                }
              </style>
            </head>
            <body>
              <div class="etiqueta">
                <div class="qr-section">
                  <img src="${codes.qrcodeUrl}" alt="QR Code" class="qr-code" />
                  <div class="sku-code">${codes.sku}</div>
                </div>
                <div class="info-section">
                  <div class="product-name">${productDetails.name}</div>
                  <div class="product-details">
                    <div class="detail-line">TAM: ${productDetails.size?.name || 'N/A'}</div>
                    <div class="detail-line">CAT: ${productDetails.category?.name || 'N/A'}</div>
                    ${productDetails.subcategory ? `<div class="detail-line subcategory">SUB: ${productDetails.subcategory.name}</div>` : ''}
                    <div class="detail-line pattern">EST: ${productDetails.pattern?.name || 'N/A'}</div>
                  </div>
                  <div class="price">R$ ${productDetails.price ? productDetails.price.toFixed(2).replace('.', ',') : '0,00'}</div>
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
        
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 100);
      }
    } catch (error: any) {
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

// Subcategory Form Modal Component
interface SubcategoryFormModalProps {
  categoryId: string;
  onSubmit: (data: { name: string; code: string; description?: string; categoryId: string }) => void;
  onClose: () => void;
  isLoading: boolean;
}

const SubcategoryFormModal: React.FC<SubcategoryFormModalProps> = ({
  categoryId,
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
    } else if (!/^\d{1,3}$/.test(formData.code)) {
      newErrors.code = 'Código deve ter 1 a 3 dígitos numéricos (ex: 001, 050)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        categoryId
      });
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3); // Apenas números, máximo 3 dígitos
    setFormData(prev => ({ ...prev, code: value }));
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Nova Subcategoria</h2>
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
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: 00"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
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
  const [operation, setOperation] = useState<'add' | 'remove' | 'add-location' | 'remove-location' | 'history'>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [location, setLocation] = useState<'LOJA' | 'ARMAZEM'>('LOJA');
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
      } else if (operation === 'add-location') {
        const result = await productsApi.addStockLocation(product.id, quantity, location, reason);
        toast.success(`Estoque adicionado na ${location}`);
      } else if (operation === 'remove-location') {
        const result = await productsApi.removeStockLocation(product.id, quantity, location, reason);
        toast.success(`Estoque removido da ${location}`);
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
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  <div className="flex justify-between items-center">
                    <span>Total: <span className="font-semibold text-blue-600">{product.stock} un.</span></span>
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span>Loja: <span className="font-semibold text-green-600">{product.stockLoja || 0} un.</span></span>
                    <span>Armazém: <span className="font-semibold text-blue-600">{product.stockArmazem || 0} un.</span></span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {product.category?.name} • {product.pattern?.name} • {product.size?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Abas de operação */}
          <div className="space-y-2 mb-6">
            {/* Operações Gerais */}
            <div className="text-xs font-medium text-gray-700 mb-1">Estoque Geral:</div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setOperation('add')}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                  operation === 'add'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Plus className="w-3 h-3 inline-block mr-1" />
                Adicionar
              </button>
              <button
                onClick={() => setOperation('remove')}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                  operation === 'remove'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Minus className="w-3 h-3 inline-block mr-1" />
                Retirar
              </button>
              <button
                onClick={() => setOperation('history')}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                  operation === 'history'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History className="w-3 h-3 inline-block mr-1" />
                Histórico
              </button>
            </div>

            {/* Operações por Localização */}
            <div className="text-xs font-medium text-gray-700 mb-1">Por Localização:</div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setOperation('add-location')}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                  operation === 'add-location'
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Plus className="w-3 h-3 inline-block mr-1" />
                Entrada
              </button>
              <button
                onClick={() => setOperation('remove-location')}
                className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                  operation === 'remove-location'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Minus className="w-3 h-3 inline-block mr-1" />
                Saída
              </button>
            </div>
          </div>

          {/* Formulário de operação */}
          {operation !== 'history' && (
            <form onSubmit={handleStockOperation} className="space-y-4">
              {/* Campo de localização para operações específicas */}
              {(operation === 'add-location' || operation === 'remove-location') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localização
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value as 'LOJA' | 'ARMAZEM')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="LOJA">Loja ({product.stockLoja || 0} unidades)</option>
                    <option value="ARMAZEM">Armazém ({product.stockArmazem || 0} unidades)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  max={
                    operation === 'remove-location' 
                      ? (location === 'LOJA' ? product.stockLoja : product.stockArmazem)
                      : undefined
                  }
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite a quantidade"
                  required
                />
                {operation === 'remove-location' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo disponível na {location}: {location === 'LOJA' ? product.stockLoja : product.stockArmazem} unidades
                  </p>
                )}
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
                  placeholder={
                    operation === 'add' || operation === 'add-location' 
                      ? 'Ex: Recebimento de fornecedor' 
                      : 'Ex: Produto danificado'
                  }
                  required
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
                    operation === 'add' || operation === 'add-location'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isLoading ? 'Processando...' : 
                    operation === 'add' ? 'Adicionar' :
                    operation === 'remove' ? 'Retirar' :
                    operation === 'add-location' ? `Adicionar na ${location}` :
                    operation === 'remove-location' ? `Retirar da ${location}` : 'Processar'
                  }
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

// Modal de transferência de estoque entre localizações
interface TransferStockModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

const TransferStockModal: React.FC<TransferStockModalProps> = ({ product, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [fromLocation, setFromLocation] = useState<'LOJA' | 'ARMAZEM'>('LOJA');
  const [toLocation, setToLocation] = useState<'LOJA' | 'ARMAZEM'>('ARMAZEM');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (fromLocation === toLocation) {
      toast.error('Localização de origem e destino devem ser diferentes');
      return;
    }

    const fromStock = fromLocation === 'LOJA' ? product.stockLoja : product.stockArmazem;
    if (fromStock < quantity) {
      toast.error(`Estoque insuficiente na ${fromLocation}. Disponível: ${fromStock}`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await productsApi.transferStock(product.id, quantity, fromLocation, toLocation, reason);
      toast.success(result.message);
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao transferir estoque';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Transferir Estoque
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
                <div className="text-sm text-gray-600 mt-1">
                  <div className="flex justify-between">
                    <span>Loja: <span className="font-semibold text-green-600">{product.stockLoja} un.</span></span>
                    <span>Armazém: <span className="font-semibold text-blue-600">{product.stockArmazem} un.</span></span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {product.category?.name} • {product.pattern?.name} • {product.size?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Formulário de transferência */}
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  De
                </label>
                <select
                  value={fromLocation}
                  onChange={(e) => {
                    const newFrom = e.target.value as 'LOJA' | 'ARMAZEM';
                    setFromLocation(newFrom);
                    // Automaticamente ajusta o destino
                    setToLocation(newFrom === 'LOJA' ? 'ARMAZEM' : 'LOJA');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LOJA">Loja ({product.stockLoja} un.)</option>
                  <option value="ARMAZEM">Armazém ({product.stockArmazem} un.)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Para
                </label>
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value as 'LOJA' | 'ARMAZEM')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LOJA" disabled={fromLocation === 'LOJA'}>
                    Loja ({product.stockLoja} un.)
                  </option>
                  <option value="ARMAZEM" disabled={fromLocation === 'ARMAZEM'}>
                    Armazém ({product.stockArmazem} un.)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                max={fromLocation === 'LOJA' ? product.stockLoja : product.stockArmazem}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite a quantidade"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo disponível: {fromLocation === 'LOJA' ? product.stockLoja : product.stockArmazem} unidades
              </p>
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
                placeholder={`Ex: Transferência ${fromLocation} → ${toLocation}`}
                required
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
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Transferindo...' : 'Transferir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Entry Stock Modal Component
interface EntryStockModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EntryStockModal: React.FC<EntryStockModalProps> = ({ onClose, onSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState<'LOJA' | 'ARMAZEM'>('LOJA');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Buscar produtos
  const { data: productsData } = useQuery({
    queryKey: ['products', { search: searchTerm }],
    queryFn: () => productsApi.list({ search: searchTerm, limit: 50 }),
    enabled: searchTerm.length > 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    setIsLoading(true);
    try {
      await productsApi.addStockLocation(selectedProduct.id, qty, location, reason || 'Entrada de estoque');
      toast.success(`Entrada realizada: +${qty} unidades na ${location}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao registrar entrada';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
  };

  const handleQRScan = (data: string) => {
    // Buscar produto pelo QR Code
    setSearchTerm(data);
    setShowScanner(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ArrowDown className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Entrada de Estoque</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Busca de Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Produto
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome ou código do produto..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                QR
              </button>
            </div>

            {/* Lista de produtos encontrados */}
            {searchTerm.length > 2 && productsData?.data && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {productsData.data?.map((product: Product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.category?.name} • {product.pattern?.name} • {product.size?.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      Estoque: Loja {product.stockLoja} | Armazém {product.stockArmazem}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Produto Selecionado */}
          {selectedProduct && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Produto Selecionado:</h3>
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div className="text-sm text-gray-600">
                    {selectedProduct.category?.name} • {selectedProduct.pattern?.name} • {selectedProduct.size?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Estoque atual: Loja {selectedProduct.stockLoja} | Armazém {selectedProduct.stockArmazem}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Localização */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localização
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as 'LOJA' | 'ARMAZEM')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="LOJA">🏪 Loja</option>
                <option value="ARMAZEM">🏭 Armazém</option>
              </select>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Reposição de estoque, compra de fornecedor..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              disabled={isLoading || !selectedProduct}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Registrando...' : 'Registrar Entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Exit Stock Modal Component
interface ExitStockModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ExitStockModal: React.FC<ExitStockModalProps> = ({ onClose, onSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [operation, setOperation] = useState<'REMOVE' | 'TRANSFER'>('REMOVE');
  const [fromLocation, setFromLocation] = useState<'LOJA' | 'ARMAZEM'>('LOJA');
  const [toLocation, setToLocation] = useState<'LOJA' | 'ARMAZEM'>('ARMAZEM');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Buscar produtos
  const { data: productsData } = useQuery({
    queryKey: ['products', { search: searchTerm }],
    queryFn: () => productsApi.list({ search: searchTerm, limit: 50 }),
    enabled: searchTerm.length > 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    // Verificar estoque disponível
    const availableStock = fromLocation === 'LOJA' ? selectedProduct.stockLoja : selectedProduct.stockArmazem;
    if (qty > availableStock) {
      toast.error(`Estoque insuficiente na ${fromLocation}. Disponível: ${availableStock}`);
      return;
    }

    setIsLoading(true);
    try {
      if (operation === 'REMOVE') {
        await productsApi.removeStockLocation(selectedProduct.id, qty, fromLocation, reason || 'Saída de estoque');
        toast.success(`Saída realizada: -${qty} unidades da ${fromLocation}`);
      } else {
        await productsApi.transferStock(selectedProduct.id, qty, fromLocation, toLocation, reason || `Transferência: ${fromLocation} → ${toLocation}`);
        toast.success(`Transferência realizada: ${qty} unidades de ${fromLocation} → ${toLocation}`);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao registrar saída';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
  };

  const handleQRScan = (data: string) => {
    // Buscar produto pelo QR Code
    setSearchTerm(data);
    setShowScanner(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ArrowUp className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Saída de Estoque</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Operação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperation('REMOVE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  operation === 'REMOVE' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🗑️ Remover do Estoque
              </button>
              <button
                type="button"
                onClick={() => setOperation('TRANSFER')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  operation === 'TRANSFER' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔄 Transferir Localização
              </button>
            </div>
          </div>

          {/* Busca de Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Produto
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite o nome ou código do produto..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                QR
              </button>
            </div>

            {/* Lista de produtos encontrados */}
            {searchTerm.length > 2 && productsData?.data && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {productsData.data?.map((product: Product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      {product.category?.name} • {product.pattern?.name} • {product.size?.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      Estoque: Loja {product.stockLoja} | Armazém {product.stockArmazem}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Produto Selecionado */}
          {selectedProduct && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Produto Selecionado:</h3>
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div className="text-sm text-gray-600">
                    {selectedProduct.category?.name} • {selectedProduct.pattern?.name} • {selectedProduct.size?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    Estoque atual: Loja {selectedProduct.stockLoja} | Armazém {selectedProduct.stockArmazem}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                min="1"
                max={selectedProduct ? (fromLocation === 'LOJA' ? selectedProduct.stockLoja : selectedProduct.stockArmazem) : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              {selectedProduct && (
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: {fromLocation === 'LOJA' ? selectedProduct.stockLoja : selectedProduct.stockArmazem} unidades
                </p>
              )}
            </div>

            {/* Localização */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {operation === 'REMOVE' ? 'Localização' : 'De'}
              </label>
              <select
                value={fromLocation}
                onChange={(e) => {
                  const newFromLocation = e.target.value as 'LOJA' | 'ARMAZEM';
                  setFromLocation(newFromLocation);
                  if (operation === 'TRANSFER') {
                    setToLocation(newFromLocation === 'LOJA' ? 'ARMAZEM' : 'LOJA');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="LOJA">🏪 Loja</option>
                <option value="ARMAZEM">🏭 Armazém</option>
              </select>
            </div>
          </div>

          {/* Para (apenas para transferência) */}
          {operation === 'TRANSFER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para
              </label>
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value as 'LOJA' | 'ARMAZEM')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="LOJA">🏪 Loja</option>
                <option value="ARMAZEM">🏭 Armazém</option>
              </select>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={operation === 'REMOVE' ? 'Ex: Venda, avaria, perda...' : 'Ex: Reorganização, demanda...'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
              disabled={isLoading || !selectedProduct}
              className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                operation === 'REMOVE' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isLoading ? 'Processando...' : (operation === 'REMOVE' ? 'Registrar Saída' : 'Transferir')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Products; 