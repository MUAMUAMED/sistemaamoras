import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Scale, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Size } from '../types';
import { sizesApi } from '../services/api';

const Sizes: React.FC = () => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [forceDeleteId, setForceDeleteId] = useState<string | null>(null);
  const [forceDeleteLoading, setForceDeleteLoading] = useState(false);

  // Queries
  const { data: sizes = [], isLoading } = useQuery({
    queryKey: ['sizes'],
    queryFn: () => sizesApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: sizesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
      setShowCreateModal(false);
      toast.success('Tamanho criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar tamanho');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Size> }) =>
      sizesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
      setShowEditModal(false);
      setSelectedSize(null);
      toast.success('Tamanho atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar tamanho');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sizesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
      toast.success('Tamanho excluído com sucesso!');
    },
    onError: (error: any) => {
      if (error?.response?.status === 409 && error?.response?.data?.canForce) {
        setForceDeleteId(selectedSize?.id || null);
      } else {
        toast.error(error.response?.data?.message || 'Erro ao excluir tamanho');
      }
    },
  });

  const handleCreateSize = (data: { name: string; code: string; active: boolean }) => {
    createMutation.mutate(data);
  };

  const handleUpdateSize = (data: Partial<Size>) => {
    if (selectedSize) {
      updateMutation.mutate({ id: selectedSize.id, data });
    }
  };

  const handleDeleteSize = (id: string) => {
    setSelectedSize(sizes.find(s => s.id === id) || null);
    if (window.confirm('Tem certeza que deseja excluir este tamanho?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleForceDelete = async () => {
    if (!forceDeleteId) return;
    setForceDeleteLoading(true);
    try {
      await sizesApi.delete(forceDeleteId, true);
      setForceDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
      toast.success('Tamanho e produtos relacionados excluídos com sucesso!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao excluir tamanho');
    } finally {
      setForceDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-8 rounded-b-3xl shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Tamanhos</h1>
              <p className="text-blue-100 text-lg">Gerencie os tamanhos de produtos</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-50 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Novo Tamanho
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 card-hover animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Tamanhos</p>
                <p className="text-3xl font-bold text-gray-900">
                  {sizes.length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 card-hover animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Tamanhos Ativos</p>
                <p className="text-3xl font-bold text-blue-600">
                  {sizes.filter(s => s.active).length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Scale className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 card-hover animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Tamanhos Inativos</p>
                <p className="text-3xl font-bold text-red-600">
                  {sizes.filter(s => !s.active).length}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Tamanhos */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600">Carregando tamanhos...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header da Tabela */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tamanhos ({sizes.length})
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Scale className="w-4 h-4" />
                    <span>Gerenciamento de Tamanhos</span>
                  </div>
                </div>
              </div>

              {/* Grid de Tamanhos */}
              <div className="p-6">
                {sizes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sizes.map((size) => (
                      <div key={size.id} className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden group card-hover animate-fade-in-up">
                        {/* Status Badge */}
                        <div className="p-4 pb-0">
                          <div className="flex justify-end">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${size.active ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                              {size.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>

                        {/* Informações do Tamanho */}
                        <div className="p-4 pt-2">
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                            {size.name}
                          </h3>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Código:</span>
                              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {size.code}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Criado em:</span>
                              <span className="text-gray-500">
                                {new Date(size.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Atualizado em:</span>
                              <span className="text-gray-500">
                                {new Date(size.updatedAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => {
                                setSelectedSize(size);
                                setShowEditModal(true);
                              }}
                              className="px-3 py-2 text-sm bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors duration-200 flex items-center justify-center gap-1"
                            >
                              <Edit3 className="w-4 h-4" />
                              Editar
                            </button>
                            
                            <button
                              onClick={() => handleDeleteSize(size.id)}
                              className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200 flex items-center justify-center gap-1"
                              title="Excluir tamanho"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Scale className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum tamanho encontrado</h3>
                    <p className="text-gray-600 mb-6">
                      Comece criando seu primeiro tamanho
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Primeiro Tamanho
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modais */}
      {showCreateModal && (
        <SizeFormModal
          title="Novo Tamanho"
          onSubmit={handleCreateSize}
          onClose={() => setShowCreateModal(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {showEditModal && selectedSize && (
        <SizeFormModal
          title="Editar Tamanho"
          size={selectedSize}
          onSubmit={handleUpdateSize}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSize(null);
          }}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Modal de Confirmação de Exclusão Forçada */}
      {forceDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Este tamanho está sendo usado por produtos. Deseja excluir o tamanho e todos os produtos relacionados?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setForceDeleteId(null)}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={forceDeleteLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleForceDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={forceDeleteLoading}
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

// Componente do Modal de Formulário
interface SizeFormModalProps {
  title: string;
  size?: Size;
  onSubmit: (data: { name: string; code: string; active: boolean }) => void;
  onClose: () => void;
  isLoading: boolean;
}

const SizeFormModal: React.FC<SizeFormModalProps> = ({
  title,
  size,
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: size?.name || '',
    code: size?.code || '',
    active: size?.active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    } else if (!/^\d{1,2}$/.test(formData.code)) {
      newErrors.code = 'Código deve ter 1 ou 2 dígitos numéricos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        active: formData.active ?? true
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Tamanho *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: P, M, G, GG"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: 05"
              maxLength={2}
            />
            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
            <p className="text-gray-500 text-sm mt-1">1 ou 2 dígitos numéricos (ex: 05, 10)</p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Tamanho ativo</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : size ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sizes; 