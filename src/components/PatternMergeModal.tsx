import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Crown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Search,
  History,
  QrCode,
  Image as ImageIcon,
  Loader2,
  Check,
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Tag,
  XCircle,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pattern, PatternCluster, PatternRedirect, PatternDismissedPair } from '../types';
import { patternsApi } from '../services/api';
import { getImageUrl, getProductCardImageUrl } from '../utils/imageUrl';

interface PatternImageThumbnailProps {
  url: string;
  patternName: string;
  patternCode?: string;
  productId?: string;
  productName?: string;
  productBarcode?: string | null;
  onPreviewClick: (data: { url: string; patternName: string; patternCode?: string }) => void;
  onReassignClick?: (data: {
    productId: string;
    productName: string;
    productBarcode?: string | null;
    imageUrl: string;
    patternName: string;
    patternCode?: string;
  }) => void;
}

function PatternImageThumbnail({
  url,
  patternName,
  patternCode,
  productId,
  productName,
  productBarcode,
  onPreviewClick,
  onReassignClick,
}: PatternImageThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useRawFallback, setUseRawFallback] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const optimizedUrl = url ? getProductCardImageUrl(url) : '';
  const rawUrl = url ? getImageUrl(url) : '';
  const currentUrl = useRawFallback ? rawUrl : (optimizedUrl || rawUrl);

  if (!currentUrl || hasError) {
    return (
      <div className="w-16 h-16 rounded-xl bg-purple-50 text-purple-400 border border-purple-100 flex items-center justify-center text-xs shrink-0 select-none">
        <ImageIcon className="w-5 h-5 opacity-50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center shrink-0">
      <div
        className="relative shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={() => onPreviewClick({ url, patternName, patternCode })}
          title={`Clique para ampliar foto de ${patternName}`}
          className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden relative block group hover:ring-2 hover:ring-purple-500 hover:border-purple-400 transition-all cursor-zoom-in shadow-2xs"
        >
          {!loaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-gray-400 opacity-40" />
            </div>
          )}
          <img
            src={currentUrl}
            alt={patternName}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (!useRawFallback && rawUrl && rawUrl !== optimizedUrl) {
                setUseRawFallback(true);
              } else {
                setHasError(true);
              }
            }}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Search className="w-4 h-4 text-white drop-shadow-md" />
          </div>
        </button>

        {/* Popover flutuante rápido ao passar o mouse (desktop) */}
        {isHovered && loaded && (
          <div className="hidden sm:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-white rounded-2xl shadow-2xl border border-purple-200 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <div className="w-full h-52 rounded-xl overflow-hidden bg-gray-100 mb-1.5 border border-gray-100">
              <img
                src={currentUrl}
                alt={patternName}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] font-bold text-gray-900 truncate text-center px-1">
              {patternName}
            </p>
            {productName && (
              <p className="text-[10px] text-gray-500 truncate text-center px-1">
                {productName}
              </p>
            )}
            <p className="text-[10px] text-purple-600 font-medium text-center">
              Clique para tela cheia
            </p>
          </div>
        )}
      </div>

      {onReassignClick && productId && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReassignClick({
              productId,
              productName: productName || 'Roupa',
              productBarcode,
              imageUrl: url,
              patternName,
              patternCode,
            });
          }}
          title="Não pertence a esta estampa? Trocar estampa via IA"
          className="mt-1 w-16 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 active:scale-95 border border-purple-200 py-0.5 px-1 rounded-lg transition-all flex items-center justify-center gap-0.5 shadow-2xs cursor-pointer hover:border-purple-300"
        >
          <ArrowLeftRight className="w-2.5 h-2.5 shrink-0 text-purple-600" />
          <span className="truncate">Trocar</span>
        </button>
      )}
    </div>
  );
}

interface ReassignProductModalProps {
  product: {
    productId: string;
    productName: string;
    productBarcode?: string | null;
    imageUrl: string;
    patternName: string;
    patternCode?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

function ReassignProductModal({
  product,
  onClose,
  onSuccess,
}: ReassignProductModalProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPatternName, setNewPatternName] = useState('');
  const [modalPreview, setModalPreview] = useState<{ url: string; name: string; subtitle?: string } | null>(null);

  const queryClient = useQueryClient();

  // Buscar 5 estampas mais parecidas via pgvector
  const {
    data: similarData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['similar-for-product', product.productId],
    queryFn: () => patternsApi.getSimilarForProduct(product.productId),
    staleTime: 1000 * 60 * 3,
  });

  // Mutação para reatribuir o produto
  const reassignMutation = useMutation({
    mutationFn: patternsApi.reassignProduct,
    onSuccess: (res) => {
      toast.success(res.message || 'Roupa transferida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pattern-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao trocar estampa da roupa');
    },
  });

  const handleSelectPattern = (targetPatternId: string) => {
    reassignMutation.mutate({
      productId: product.productId,
      targetPatternId,
    });
  };

  const handleCreateNewPattern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatternName.trim()) {
      toast.error('Informe o nome da nova estampa');
      return;
    }
    reassignMutation.mutate({
      productId: product.productId,
      newPattern: {
        name: newPatternName.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-white to-pink-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg sm:text-xl flex items-center gap-2">
                Trocar Estampa da Roupa
                <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  pgvector IA
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Esta peça pertence a outra estampa? Escolha uma das 5 opções visuais ou crie uma nova.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={reassignMutation.isPending}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Card da Peça Selecionada */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              type="button"
              onClick={() => product.imageUrl && setModalPreview({
                url: product.imageUrl,
                name: product.productName,
                subtitle: product.productBarcode ? `Etiqueta #${product.productBarcode}` : undefined,
              })}
              title="Clique para ampliar a foto"
              className="w-20 h-20 rounded-2xl bg-white border border-gray-200 overflow-hidden shrink-0 shadow-sm relative group cursor-pointer"
            >
              <img
                src={getProductCardImageUrl(product.imageUrl) || getImageUrl(product.imageUrl)}
                alt={product.productName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Search className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                  Peça Selecionada
                </span>
                {product.productBarcode && (
                  <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-semibold">
                    Etiqueta: #{product.productBarcode}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-gray-900 text-base truncate">
                {product.productName}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Estampa atual no sistema:{' '}
                <strong className="text-gray-800">
                  {product.patternName} {product.patternCode ? `(#${product.patternCode})` : ''}
                </strong>
              </p>
            </div>
          </div>

          {/* Banner de Garantia de Bip */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900 mb-0.5">
                Garantia de leitura no leitor do caixa
              </p>
              <p className="leading-relaxed text-[11px] text-emerald-700">
                Ao transferir esta roupa, a estampa é alterada no site comercial e no catálogo. O código anterior ({product.productBarcode ? `código #${product.productBarcode}` : 'etiqueta física já impressa'}) <strong>continuará funcionando perfeitamente ao ser bipado</strong> no leitor do caixa.
              </p>
            </div>
          </div>

          {/* Seção das 5 Estampas Mais Parecidas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h4 className="font-bold text-gray-900 text-sm">
                  Top 5 Estampas (pgvector IA)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Recalcular
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                <p className="text-sm font-semibold text-gray-700">
                  Pesquisando no banco vetorial (pgvector)...
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Comparando as fotos por similaridade visual de cosseno (768 dimensões).
                </p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
                <span>Falha ao carregar sugestões vetoriais.</span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : similarData?.similarPatterns && similarData.similarPatterns.length > 0 ? (
              <div className="space-y-3">
                {/* Banner de status do pgvector */}
                {similarData.similarPatterns.some((c) => c.isVectorMatch) ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      Estampa(s) com correspondência visual direta encontrada(s) no pgvector:
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Nenhuma estampa visualmente semelhante identificada (&gt;40%)</p>
                      <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                        O modelo vetorial analisou as cores e traços da foto, mas nenhuma estampa cadastrada atingiu a similaridade mínima (&gt;40%). As opções abaixo são sugestões do catálogo ativo. Se nenhuma corresponder, crie uma estampa nova abaixo.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {similarData.similarPatterns.map((candidate, idx) => (
                    <div
                      key={candidate.id}
                      className="p-3 bg-white hover:bg-purple-50/50 border border-gray-200 hover:border-purple-300 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => candidate.sampleImageUrl && setModalPreview({
                            url: candidate.sampleImageUrl,
                            name: candidate.name,
                            subtitle: `#${candidate.code}`,
                          })}
                          title="Clique para ampliar a estampa"
                          className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 shadow-2xs relative group/img cursor-pointer"
                        >
                          {candidate.sampleImageUrl ? (
                            <>
                              <img
                                src={getProductCardImageUrl(candidate.sampleImageUrl) || getImageUrl(candidate.sampleImageUrl)}
                                alt={candidate.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Search className="w-4 h-4 text-white drop-shadow-sm" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h5 className="font-bold text-gray-900 text-sm truncate">
                              {candidate.name}
                            </h5>
                            <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-semibold">
                              #{candidate.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {candidate.isVectorMatch ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                {Math.round(candidate.similarity)}% similaridade visual IA
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200">
                                <Tag className="w-3 h-3 text-gray-500" />
                                Sugestão do catálogo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={reassignMutation.isPending}
                        onClick={() => handleSelectPattern(candidate.id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {reassignMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Vincular</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500 text-center">
                Nenhuma estampa semelhante encontrada. Crie uma nova estampa abaixo.
              </div>
            )}
          </div>

          {/* Seção Criar Nova Estampa Rapidamente */}
          <div className="border border-purple-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-2xl p-4 transition-all">
            {!isCreatingNew ? (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h5 className="font-bold text-gray-900 text-sm">
                    Nenhuma das 5 opções é a estampa certa?
                  </h5>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Crie uma nova estampa exclusiva para esta peça rapidamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="px-3.5 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-purple-600" />
                  <span>+ Criar Nova Estampa</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateNewPattern} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-purple-600" />
                    Criar Nova Estampa para esta Peça
                  </h5>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nome da Nova Estampa
                  </label>
                  <input
                    type="text"
                    value={newPatternName}
                    onChange={(e) => setNewPatternName(e.target.value)}
                    placeholder="Ex: Floral Lavanda Suave"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2 bg-white border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl text-sm outline-hidden transition-all"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Um código sequencial de 4 dígitos livre será gerado automaticamente para esta nova estampa.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl font-medium cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={reassignMutation.isPending || !newPatternName.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {reassignMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Criar Estampa e Transferir Roupa</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-400">
            A estampa anterior permanecerá intacta para as demais roupas.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Popup de Visualização da Foto em Alta Resolução */}
      {modalPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setModalPreview(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200 flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{modalPreview.name}</h4>
                {modalPreview.subtitle && (
                  <p className="text-xs text-gray-500 font-mono">{modalPreview.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalPreview(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-gray-950 flex items-center justify-center max-h-[70vh]">
              <img
                src={getProductCardImageUrl(modalPreview.url) || getImageUrl(modalPreview.url)}
                alt={modalPreview.name}
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PatternMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patterns: Pattern[];
}

export const PatternMergeModal: React.FC<PatternMergeModalProps> = ({
  isOpen,
  onClose,
  patterns,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'manual' | 'history' | 'dismissed'>('suggestions');

  // Estado para seleção no grupo sugerido
  // clusterId -> { principalId: string, selectedIds: string[] }
  const [clusterSelections, setClusterSelections] = useState<
    Record<string, { principalId: string; selectedIds: string[] }>
  >({});

  // Estado para unificação manual
  const [manualSearch, setManualSearch] = useState('');
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([]);
  const [manualPrincipalId, setManualPrincipalId] = useState<string | null>(null);

  // Estado do diálogo de confirmação
  const [confirmData, setConfirmData] = useState<{
    principalPattern: Pattern | { id: string; name: string; code: string };
    secondaryPatterns: Array<Pattern | { id: string; name: string; code: string }>;
  } | null>(null);

  // Estado para visualização ampliada / popup da roupa ou estampa
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    patternName: string;
    patternCode?: string;
  } | null>(null);

  // Estado para troca individual de estampa de uma roupa via pgvector
  const [reassigningProduct, setReassigningProduct] = useState<{
    productId: string;
    productName: string;
    productBarcode?: string | null;
    imageUrl: string;
    patternName: string;
    patternCode?: string;
  } | null>(null);

  // Limite de grupos exibidos inicialmente para renderização instantânea sem travamento
  const CLUSTERS_PER_PAGE = 8;
  const [visibleClustersCount, setVisibleClustersCount] = useState(CLUSTERS_PER_PAGE);

  // Queries
  const {
    data: clustersData,
    isLoading: isLoadingClusters,
    refetch: refetchClusters,
  } = useQuery({
    queryKey: ['pattern-clusters'],
    queryFn: () => patternsApi.getClusters(),
    enabled: isOpen,
  });

  const { data: redirects = [], isLoading: isLoadingRedirects } = useQuery({
    queryKey: ['pattern-redirects'],
    queryFn: () => patternsApi.getRedirects(),
    enabled: isOpen && activeTab === 'history',
  });

  // Query de pares ignorados/descartados
  const { data: dismissedData, isLoading: isLoadingDismissed } = useQuery({
    queryKey: ['pattern-dismissed-pairs'],
    queryFn: () => patternsApi.getDismissedPairs(),
    enabled: isOpen,
  });
  const dismissedPairs = dismissedData?.dismissedPairs || [];

  // Mutação para descartar pares
  const dismissMutation = useMutation({
    mutationFn: patternsApi.dismissClusterPair,
    onSuccess: (res) => {
      toast.success(res.message || 'Estampa desvinculada e gravada no sistema!');
      queryClient.invalidateQueries({ queryKey: ['pattern-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['pattern-dismissed-pairs'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao desvincular estampa');
      queryClient.invalidateQueries({ queryKey: ['pattern-clusters'] });
    },
  });

  // Mutação para restaurar par descartado
  const restoreDismissedMutation = useMutation({
    mutationFn: patternsApi.restoreDismissedPair,
    onSuccess: (res) => {
      toast.success(res.message || 'Par restaurado! Poderá ser sugerido novamente.');
      queryClient.invalidateQueries({ queryKey: ['pattern-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['pattern-dismissed-pairs'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao restaurar par');
    },
  });

  const handleDismissPatternFromCluster = (
    cluster: PatternCluster,
    patternToRemove: { id: string; name: string }
  ) => {
    const otherIds = cluster.patterns
      .filter((p) => p.id !== patternToRemove.id)
      .map((p) => p.id);
    if (otherIds.length === 0) return;

    // Atualização otimista do cache do React Query
    queryClient.setQueryData(['pattern-clusters'], (old: any) => {
      if (!old?.clusters) return old;
      const updatedClusters = old.clusters
        .map((c: PatternCluster) => {
          if (c.id !== cluster.id) return c;
          const remaining = c.patterns.filter((p) => p.id !== patternToRemove.id);
          if (remaining.length < 2) return null; // Grupo desfeito
          const nextPrincipal =
            c.suggestedPrincipalId === patternToRemove.id
              ? remaining[0].id
              : c.suggestedPrincipalId;
          return {
            ...c,
            suggestedPrincipalId: nextPrincipal,
            patterns: remaining,
          };
        })
        .filter(Boolean);

      return {
        ...old,
        clusters: updatedClusters,
        totalDuplicatesFound: updatedClusters.reduce(
          (acc: number, c: any) => acc + c.patterns.length,
          0
        ),
      };
    });

    dismissMutation.mutate({
      patternId: patternToRemove.id,
      otherPatternIds: otherIds,
      reason: `Separada manualmente da sugestão: ${cluster.title}`,
    });
  };

  const handleDismissEntireCluster = (cluster: PatternCluster) => {
    if (cluster.patterns.length < 2) return;

    // Atualização otimista
    queryClient.setQueryData(['pattern-clusters'], (old: any) => {
      if (!old?.clusters) return old;
      const updatedClusters = old.clusters.filter((c: PatternCluster) => c.id !== cluster.id);
      return {
        ...old,
        clusters: updatedClusters,
        totalDuplicatesFound: updatedClusters.reduce(
          (acc: number, c: any) => acc + c.patterns.length,
          0
        ),
      };
    });

    dismissMutation.mutate({
      patternIds: cluster.patterns.map((p) => p.id),
      reason: `Grupo "${cluster.title}" descartado por completo`,
    });
  };

  // Mutação para executar a unificação
  const mergeMutation = useMutation({
    mutationFn: patternsApi.merge,
    onSuccess: (data) => {
      toast.success(data.message || 'Estampas unificadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
      queryClient.invalidateQueries({ queryKey: ['pattern-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['pattern-redirects'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setConfirmData(null);
      setManualSelectedIds([]);
      setManualPrincipalId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao unificar estampas');
    },
  });

  if (!isOpen) return null;

  const clusters = clustersData?.clusters || [];

  // Helper para obter configuração de um cluster
  const getClusterConfig = (cluster: PatternCluster) => {
    const existing = clusterSelections[cluster.id];
    if (existing) return existing;

    const initialPrincipal = cluster.suggestedPrincipalId || cluster.patterns[0]?.id;
    return {
      principalId: initialPrincipal,
      selectedIds: cluster.patterns.map((p) => p.id),
    };
  };

  const handleSelectPrincipal = (clusterId: string, patternId: string) => {
    const current = clusterSelections[clusterId] || {
      principalId: patternId,
      selectedIds: [],
    };
    // Garantir que a estampa principal esteja inclusa na lista
    const newSelected = current.selectedIds.includes(patternId)
      ? current.selectedIds
      : [...current.selectedIds, patternId];

    setClusterSelections((prev) => ({
      ...prev,
      [clusterId]: {
        principalId: patternId,
        selectedIds: newSelected,
      },
    }));
  };

  const handleTogglePatternInCluster = (clusterId: string, patternId: string, isPrincipal: boolean) => {
    if (isPrincipal) return; // Não pode desmarcar a principal
    const current = clusterSelections[clusterId] || {
      principalId: '',
      selectedIds: [],
    };

    const isSelected = current.selectedIds.includes(patternId);
    const newSelected = isSelected
      ? current.selectedIds.filter((id) => id !== patternId)
      : [...current.selectedIds, patternId];

    setClusterSelections((prev) => ({
      ...prev,
      [clusterId]: {
        ...current,
        selectedIds: newSelected,
      },
    }));
  };

  const handlePrepareClusterMerge = (cluster: PatternCluster) => {
    const config = getClusterConfig(cluster);
    const principal = cluster.patterns.find((p) => p.id === config.principalId);
    if (!principal) {
      toast.error('Selecione uma estampa principal.');
      return;
    }

    const secondaries = cluster.patterns.filter(
      (p) => p.id !== config.principalId && config.selectedIds.includes(p.id)
    );

    if (secondaries.length === 0) {
      toast.error('Selecione ao menos uma estampa secundária para ser unificada.');
      return;
    }

    setConfirmData({
      principalPattern: principal,
      secondaryPatterns: secondaries,
    });
  };

  const handlePrepareManualMerge = () => {
    if (!manualPrincipalId) {
      toast.error('Escolha qual das estampas selecionadas será a Principal.');
      return;
    }

    const principal = patterns.find((p) => p.id === manualPrincipalId);
    if (!principal) return;

    const secondaries = patterns.filter(
      (p) => p.id !== manualPrincipalId && manualSelectedIds.includes(p.id)
    );

    if (secondaries.length === 0) {
      toast.error('Selecione ao menos duas estampas para realizar a unificação.');
      return;
    }

    setConfirmData({
      principalPattern: principal,
      secondaryPatterns: secondaries,
    });
  };

  const handleExecuteMerge = () => {
    if (!confirmData) return;
    mergeMutation.mutate({
      principalPatternId: confirmData.principalPattern.id,
      mergedPatternIds: confirmData.secondaryPatterns.map((p) => p.id),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-fade-in-up">
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                Unificação de Estampas Semelhantes
                <span className="bg-yellow-400 text-purple-950 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  IA & Códigos
                </span>
              </h2>
              <p className="text-purple-100 text-sm mt-0.5">
                Junte estampas repetidas, escolha a <strong>Principal</strong> e mantenha QR Codes e etiquetas físicas funcionando por redirecionamento.
              </p>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'suggestions'
                  ? 'bg-white text-purple-700 shadow-md font-semibold'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Sugestões Automáticas
              {clusters.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-pink-500 text-white font-bold">
                  {clusters.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'manual'
                  ? 'bg-white text-purple-700 shadow-md font-semibold'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Search className="w-4 h-4" />
              Unificação Manual
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-white text-purple-700 shadow-md font-semibold'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <History className="w-4 h-4" />
              Histórico de Redirecionamentos
            </button>

            <button
              onClick={() => setActiveTab('dismissed')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeTab === 'dismissed'
                  ? 'bg-white text-purple-700 shadow-md font-semibold'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Ban className="w-4 h-4" />
              Estampas Descartadas
              {dismissedPairs.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white font-bold">
                  {dismissedPairs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/70">
          {/* ABA 1: SUGESTÕES AUTOMÁTICAS */}
          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              {isLoadingClusters ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-3" />
                  <p className="font-medium text-gray-700">Analisando similaridade de nomes e fotos vetoriais...</p>
                  <p className="text-xs text-gray-400 mt-1">Comparando embeddings de fotos e variações de texto.</p>
                </div>
              ) : clusters.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-sm">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma estampa duplicada detectada!</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Todas as suas estampas ativas possuem nomes e características visuais bem diferenciadas.
                  </p>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow transition-all"
                  >
                    <Search className="w-4 h-4" />
                    Fazer unificação manual de estampas
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Encontramos <strong>{clusters.length} grupo(s)</strong> de estampas que são muito parecidas. Escolha a <strong>Principal 👑</strong> de cada grupo e confirme a unificação.
                    </p>
                    <button
                      onClick={() => refetchClusters()}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold underline"
                    >
                      Atualizar análise
                    </button>
                  </div>

                  {clusters.slice(0, visibleClustersCount).map((cluster) => {
                    const config = getClusterConfig(cluster);

                    return (
                      <div
                        key={cluster.id}
                        className="bg-white rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                      >
                        {/* Header do Cluster */}
                        <div className="bg-gradient-to-r from-purple-50 via-white to-pink-50 px-6 py-3.5 border-b border-purple-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="bg-purple-600 text-white text-xs px-2.5 py-1 rounded-full font-bold">
                              {cluster.patterns.length} estampas
                            </span>
                            <h4 className="font-bold text-gray-900 text-base">{cluster.title}</h4>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              {cluster.primaryReason}
                            </span>
                            <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-bold">
                              {cluster.averageSimilarity}% similaridade
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDismissEntireCluster(cluster)}
                              title="Descartar sugestão deste grupo por completo (não agrupar nenhuma destas estampas)"
                              className="text-xs text-gray-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-red-200 font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ml-1"
                            >
                              <X className="w-3.5 h-3.5 text-gray-400" />
                              <span>Descartar grupo</span>
                            </button>
                          </div>
                        </div>

                        {/* Cards de Estampas no Grupo */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {cluster.patterns.map((p) => {
                            const isPrincipal = config.principalId === p.id;
                            const isSelected = config.selectedIds.includes(p.id);

                            return (
                              <div
                                key={p.id}
                                className={`rounded-2xl border-2 p-4 transition-all relative flex flex-col justify-between ${
                                  isPrincipal
                                    ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-400/30'
                                    : isSelected
                                    ? 'border-gray-300 bg-white hover:border-purple-300'
                                    : 'border-gray-200 bg-gray-50 opacity-60'
                                }`}
                              >
                                {isPrincipal && (
                                  <div className="absolute -top-3 left-4 bg-purple-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow flex items-center gap-1">
                                    <Crown className="w-3.5 h-3.5 text-yellow-300" />
                                    ESTAMPA PRINCIPAL
                                  </div>
                                )}

                                <div>
                                  {/* Fotos de Amostra das Roupas com essa Estampa */}
                                  <div className="mb-3">
                                    <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      Fotos de peças com esta estampa:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {p.sampleProducts && p.sampleProducts.length > 0 ? (
                                        p.sampleProducts.map((sp) => (
                                          <PatternImageThumbnail
                                            key={sp.id}
                                            url={sp.imageUrl}
                                            patternName={p.name}
                                            patternCode={p.code}
                                            productId={sp.id}
                                            productName={sp.name}
                                            productBarcode={sp.barcode}
                                            onPreviewClick={(data) => setPreviewImage(data)}
                                            onReassignClick={(data) => setReassigningProduct(data)}
                                          />
                                        ))
                                      ) : p.sampleImages && p.sampleImages.length > 0 ? (
                                        p.sampleImages.map((imgUrl, idx) => (
                                          <PatternImageThumbnail
                                            key={idx}
                                            url={imgUrl}
                                            patternName={p.name}
                                            patternCode={p.code}
                                            onPreviewClick={(data) => setPreviewImage(data)}
                                          />
                                        ))
                                      ) : (
                                        <div className="w-full h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400 italic">
                                          Sem fotos de roupas associadas
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Nome e Código */}
                                  <h5 className="font-bold text-gray-900 text-base leading-tight mb-1">
                                    {p.name}
                                  </h5>

                                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-semibold">
                                      Código: #{p.code}
                                    </span>
                                    <span>•</span>
                                    <span className="font-semibold text-purple-700">
                                      {p.productsCount} produto(s)
                                    </span>
                                  </div>
                                </div>

                                {/* Botão para Definir como Principal, Checkbox e Botão Tirar da Unificação */}
                                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 mt-2">
                                  {isPrincipal ? (
                                    <span className="text-xs text-purple-700 font-bold flex items-center gap-1">
                                      <Check className="w-4 h-4" />
                                      Definida como Principal
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectPrincipal(cluster.id, p.id)}
                                      className="text-xs bg-white border border-purple-300 text-purple-700 hover:bg-purple-600 hover:text-white px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                      Tornar Principal
                                    </button>
                                  )}

                                  <div className="flex items-center gap-2">
                                    {!isPrincipal && (
                                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() =>
                                            handleTogglePatternInCluster(cluster.id, p.id, isPrincipal)
                                          }
                                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300 cursor-pointer"
                                        />
                                        <span>Mesclar</span>
                                      </label>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDismissPatternFromCluster(cluster, p)}
                                      title="Não pertence a este grupo? Tirar da unificação e nunca mais sugerir juntas"
                                      className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 hover:border-red-300 py-1 px-2.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                                      <span>Tirar da unificação</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Ações do Cluster */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                          <div className="text-xs text-gray-500 flex items-center gap-1.5">
                            <QrCode className="w-4 h-4 text-purple-600" />
                            <span>
                              Ao unificar, os códigos antigos serão redirecionados automaticamente para a estampa principal.
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePrepareClusterMerge(cluster)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                          >
                            <Layers className="w-4 h-4" />
                            Unificar Este Grupo
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Paginação de Grupos para abertura instantânea sem travamento */}
                  {clusters.length > visibleClustersCount && (
                    <div className="text-center py-6 bg-purple-50/60 rounded-2xl border border-dashed border-purple-200">
                      <p className="text-xs text-gray-600 mb-2.5">
                        Exibindo <strong>{Math.min(visibleClustersCount, clusters.length)}</strong> de <strong>{clusters.length}</strong> grupos de estampas sugeridos
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setVisibleClustersCount((prev) => Math.min(clusters.length, prev + CLUSTERS_PER_PAGE))}
                          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Carregar mais 8 grupos (+{Math.min(CLUSTERS_PER_PAGE, clusters.length - visibleClustersCount)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibleClustersCount(clusters.length)}
                          className="px-4 py-2.5 bg-white hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200 transition-all cursor-pointer"
                        >
                          Mostrar todos ({clusters.length} grupos)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: UNIFICAÇÃO MANUAL */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Unificação Manual Livre</p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Pesquise e selecione duas ou mais estampas do sistema para juntar. Depois, marque qual delas será a <strong>Principal 👑</strong>. Todas as outras estampas terão seus produtos migrados e seus códigos antigos redirecionados.
                  </p>
                </div>
              </div>

              {/* Barra de Busca */}
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código da estampa..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none shadow-2xs"
                />
              </div>

              {/* Lista Selecionada */}
              {manualSelectedIds.length > 0 && (
                <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Estampas Selecionadas para Unificação ({manualSelectedIds.length})
                    </h4>
                    <span className="text-xs text-purple-700">
                      Escolha a <strong>Estampa Principal 👑</strong> abaixo:
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {manualSelectedIds.map((id) => {
                      const p = patterns.find((item) => item.id === id);
                      if (!p) return null;
                      const isPrincipal = manualPrincipalId === id;

                      return (
                        <div
                          key={id}
                          onClick={() => setManualPrincipalId(id)}
                          className={`cursor-pointer rounded-xl p-3 border-2 transition-all relative ${
                            isPrincipal
                              ? 'border-purple-600 bg-white shadow-md ring-2 ring-purple-300'
                              : 'border-gray-200 bg-white/80 hover:border-purple-300'
                          }`}
                        >
                          {isPrincipal && (
                            <div className="absolute -top-2.5 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                              <Crown className="w-3 h-3 text-yellow-300" />
                              PRINCIPAL
                            </div>
                          )}
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                              <p className="text-xs font-mono text-gray-500">Código: #{p.code}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setManualSelectedIds((prev) => prev.filter((item) => item !== id));
                                if (manualPrincipalId === id) setManualPrincipalId(null);
                              }}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={manualSelectedIds.length < 2 || !manualPrincipalId}
                      onClick={handlePrepareManualMerge}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow transition-all flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      Unificar Estampas Selecionadas
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Todas as Estampas Disponíveis */}
              <div>
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Selecione as estampas para agrupar:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {patterns
                    .filter((p) => p.active)
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
                        p.code.includes(manualSearch)
                    )
                    .map((p) => {
                      const isSelected = manualSelectedIds.includes(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isSelected) {
                              setManualSelectedIds((prev) => prev.filter((id) => id !== p.id));
                              if (manualPrincipalId === p.id) setManualPrincipalId(null);
                            } else {
                              const next = [...manualSelectedIds, p.id];
                              setManualSelectedIds(next);
                              if (!manualPrincipalId) setManualPrincipalId(p.id);
                            }
                          }}
                          className={`cursor-pointer rounded-xl p-3 border text-left transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold'
                              : 'border-gray-200 bg-white hover:border-gray-300 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm truncate">{p.name}</p>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 text-purple-600 rounded border-gray-300"
                            />
                          </div>
                          <p className="text-xs font-mono text-gray-500 mt-1">Código: #{p.code}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: HISTÓRICO DE REDIRECIONAMENTOS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Redirecionamentos Ativos de Estampas</h4>
                  <p className="text-xs text-gray-500">
                    Sempre que um QR Code ou código de barras antigo for bipado, o sistema o encaminhará para a estampa principal correspondente.
                  </p>
                </div>
              </div>

              {isLoadingRedirects ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : redirects.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Nenhum redirecionamento registrado ainda.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Ao unificar estampas, os vínculos anteriores aparecerão nesta tabela.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold">
                      <tr>
                        <th className="px-6 py-3 text-left">Código Antigo (Impresso)</th>
                        <th className="px-6 py-3 text-left">Estampa Anterior</th>
                        <th className="px-6 py-3 text-center"></th>
                        <th className="px-6 py-3 text-left">Código Novo</th>
                        <th className="px-6 py-3 text-left">Estampa Principal</th>
                        <th className="px-6 py-3 text-right">Data Unificação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {redirects.map((r: PatternRedirect) => (
                        <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-6 py-3 font-mono font-bold text-gray-700">
                            #{r.sourcePatternCode}
                          </td>
                          <td className="px-6 py-3 text-gray-600 line-through">
                            {r.sourcePatternName}
                          </td>
                          <td className="px-6 py-3 text-center text-purple-600">
                            <ArrowRight className="w-4 h-4 mx-auto" />
                          </td>
                          <td className="px-6 py-3 font-mono font-bold text-purple-700 bg-purple-50/50">
                            #{r.targetPatternCode}
                          </td>
                          <td className="px-6 py-3 font-semibold text-gray-900">
                            {r.targetPatternName}
                          </td>
                          <td className="px-6 py-3 text-right text-xs text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 4: ESTAMPAS DESCARTADAS / IGNORADAS */}
          {activeTab === 'dismissed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Estampas Descartadas da Unificação</h4>
                  <p className="text-xs text-gray-500">
                    Pares de estampas que você marcou que não têm a ver uma com a outra. O algoritmo nunca mais as sugerirá juntas.
                  </p>
                </div>
              </div>

              {isLoadingDismissed ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : dismissedPairs.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                  <Ban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Nenhum par de estampas descartado até o momento.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Quando você clicar em "Tirar da unificação" ou "Descartar grupo", as restrições aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold">
                      <tr>
                        <th className="px-6 py-3 text-left">Estampa 1</th>
                        <th className="px-6 py-3 text-center"></th>
                        <th className="px-6 py-3 text-left">Estampa 2</th>
                        <th className="px-6 py-3 text-left">Motivo / Origem</th>
                        <th className="px-6 py-3 text-left">Data</th>
                        <th className="px-6 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dismissedPairs.map((dp: PatternDismissedPair) => (
                        <tr key={dp.id} className="hover:bg-red-50/20 transition-colors">
                          <td className="px-6 py-3 font-semibold text-gray-800">
                            {dp.name1}{' '}
                            <span className="font-mono text-xs text-gray-400 font-normal">
                              (#{dp.code1})
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center text-red-500 font-bold">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                              ≠ Não Unificar
                            </span>
                          </td>
                          <td className="px-6 py-3 font-semibold text-gray-800">
                            {dp.name2}{' '}
                            <span className="font-mono text-xs text-gray-400 font-normal">
                              (#{dp.code2})
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500">
                            {dp.reason || 'Descartado manualmente'}
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-400">
                            {new Date(dp.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => restoreDismissedMutation.mutate(dp.id)}
                              disabled={restoreDismissedMutation.isPending}
                              title="Restaurar par: voltar a permitir sugestão de unificação"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurar</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Redirecionamento automático garantido para o PDV e estoque.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE UNIFICAÇÃO */}
      {confirmData && (
        <div className="fixed inset-0 z-60 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-purple-100 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-yellow-100 text-yellow-700 p-3 rounded-2xl">
                <Crown className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Unificação de Estampas</h3>
                <p className="text-xs text-gray-500">Revise as alterações antes de aplicar</p>
              </div>
            </div>

            <div className="space-y-4 my-4">
              {/* Estampa Principal */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block mb-1">
                  👑 Estampa que será a Principal:
                </span>
                <p className="font-bold text-gray-900 text-base">{confirmData.principalPattern.name}</p>
                <p className="text-xs font-mono text-purple-700">Código Oficial: #{confirmData.principalPattern.code}</p>
              </div>

              {/* Estampas que serão unificadas */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  🔄 Estampas que serão incorporadas ({confirmData.secondaryPatterns.length}):
                </span>
                <ul className="divide-y divide-gray-100 text-xs text-gray-700">
                  {confirmData.secondaryPatterns.map((p) => (
                    <li key={p.id} className="py-1.5 flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-mono text-gray-400">#{p.code}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Aviso sobre QR Codes e Etiquetas */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3.5 text-xs text-green-900 flex items-start gap-2.5">
                <QrCode className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
                <p>
                  <strong>Etiquetas Físicas e QR Codes Preservados:</strong> As roupas já etiquetadas continuarão funcionando normalmente quando bipadas. O sistema direcionará o código antigo para esta nova estampa principal.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                disabled={mergeMutation.isPending}
                onClick={() => setConfirmData(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={mergeMutation.isPending}
                onClick={handleExecuteMerge}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2"
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Unificando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar e Unificar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP DE VISUALIZAÇÃO AMPLIADA DA ROUPA / ESTAMPA */}
      {previewImage && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md sm:max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 to-pink-50/70">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-gray-900 text-base leading-tight">
                    {previewImage.patternName}
                  </h4>
                  {previewImage.patternCode && (
                    <span className="text-xs font-mono text-gray-500">
                      Código da estampa: #{previewImage.patternCode}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Fechar visualização"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagem Ampliada com carregamento imediato (WebP otimizado) */}
            <div className="p-4 sm:p-6 bg-slate-50 flex items-center justify-center">
              <div className="max-h-[65vh] w-full flex items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-inner">
                <img
                  src={getProductCardImageUrl(previewImage.url) || getImageUrl(previewImage.url)}
                  alt={previewImage.patternName}
                  loading="eager"
                  decoding="async"
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-2xl"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Foto otimizada em alta velocidade (WebP).</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Trocar Estampa de Roupa Individual (pgvector) */}
      {reassigningProduct && (
        <ReassignProductModal
          product={reassigningProduct}
          onClose={() => setReassigningProduct(null)}
          onSuccess={() => {
            setReassigningProduct(null);
            refetchClusters();
          }}
        />
      )}
    </div>
  );
};

export default PatternMergeModal;
