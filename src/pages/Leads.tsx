import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, EyeIcon, FunnelIcon, TrashIcon } from '@heroicons/react/24/outline';
import { leadService } from '../services/api';
import { Lead, LeadStatus } from '../types';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'NEW_LEAD', label: 'Novo Lead', color: 'bg-blue-100 text-blue-800' },
  { value: 'IN_SERVICE', label: 'Em Atendimento', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'INTERESTED', label: 'Interessado', color: 'bg-green-100 text-green-800' },
  { value: 'NEGOTIATING', label: 'Negociando', color: 'bg-purple-100 text-purple-800' },
  { value: 'SALE_COMPLETED', label: 'Venda Concluída', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'COLD_LEAD', label: 'Lead Frio', color: 'bg-gray-100 text-gray-800' },
  { value: 'NO_RESPONSE', label: 'Sem Resposta', color: 'bg-red-100 text-red-800' },
  { value: 'REACTIVATE', label: 'Reativar', color: 'bg-orange-100 text-orange-800' },
];

export default function Leads() {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();

  // Estados para novo lead
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', notes: '' });

  // Mutation para criar lead
  const createLeadMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; notes: string }) => {
      console.debug('[DEBUG] Enviando dados para criar lead:', data);
      const result = await leadService.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.notes,
        channel: 'Manual',
        // status: 'NEW_LEAD', // Removido pois não existe em LeadFormData
      });
      console.debug('[DEBUG] Resposta da API ao criar lead:', result);
      return result;
    },
    onSuccess: (data) => {
      toast.success('Lead criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowModal(false);
      setSelectedLead(null);
      setNewLead({ name: '', email: '', phone: '', notes: '' });
      console.debug('[DEBUG] Lead criado com sucesso:', data);
    },
    onError: (error) => {
      toast.error('Erro ao criar lead');
      console.error('[DEBUG] Erro ao criar lead:', error);
    },
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', selectedStatus, searchTerm],
    queryFn: () => leadService.list({ status: selectedStatus, search: searchTerm }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      leadService.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => leadService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead excluído com sucesso!');
    },
    onError: (error: any, id: string) => {
      if (error?.response?.status === 404) {
        toast.error('Lead não encontrado. Removendo da lista...');
        queryClient.setQueryData(['leads', selectedStatus, searchTerm], (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((lead: Lead) => lead.id !== id)
          };
        });
      } else {
        toast.error('Erro ao excluir lead');
      }
    },
  });

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateStatusMutation.mutate({ id: leadId, status: newStatus });
  };

  const filteredLeads = leads?.data?.filter((lead: Lead) => {
    // Filtro para remover leads fakes: id inválido, nome vazio, só números, ou telefone inválido
    const isFakeLead =
      !lead.id ||
      typeof lead.id !== 'string' ||
      lead.id.trim() === '' ||
      !lead.name ||
      /^\d+$/.test(lead.name) ||
      (lead.phone && lead.phone.replace(/\D/g, '').length < 8);
    if (isFakeLead) return false;

    const matchesStatus = !selectedStatus || lead.status === selectedStatus;
    const matchesSearch =
      !searchTerm ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  }) || [];

  const getStatusOption = (status: LeadStatus) => {
    return statusOptions.find(opt => opt.value === status) || statusOptions[0];
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Gerencie seus leads e pipeline de vendas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Novo Lead</span>
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
              placeholder="Nome, email ou telefone..."
              className="input-field"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as LeadStatus | '')}
              className="input-field"
            >
              <option value="">Todos os status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de leads */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Interação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads?.map((lead: Lead) => {
                const statusOption = getStatusOption(lead.status);
                return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.email || 'Email não informado'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${statusOption.color}`}
                        disabled={updateStatusMutation.isPending}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.source || lead.channel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.lastInteraction 
                        ? new Date(lead.lastInteraction).toLocaleDateString('pt-BR')
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja excluir este lead?')) {
                              deleteLeadMutation.mutate(lead.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredLeads?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum lead encontrado</p>
          </div>
        )}
      </div>

      {/* Modal de detalhes/edição */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedLead ? 'Detalhes do Lead' : 'Novo Lead'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    value={selectedLead ? selectedLead.name : newLead.name}
                    onChange={e => selectedLead ? setSelectedLead({ ...selectedLead, name: e.target.value }) : setNewLead({ ...newLead, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={selectedLead ? selectedLead.email : newLead.email}
                    onChange={e => selectedLead ? setSelectedLead({ ...selectedLead, email: e.target.value }) : setNewLead({ ...newLead, email: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    value={selectedLead ? selectedLead.phone : newLead.phone}
                    onChange={e => selectedLead ? setSelectedLead({ ...selectedLead, phone: e.target.value }) : setNewLead({ ...newLead, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <textarea
                    value={selectedLead ? selectedLead.notes : newLead.notes}
                    onChange={e => selectedLead ? setSelectedLead({ ...selectedLead, notes: e.target.value }) : setNewLead({ ...newLead, notes: e.target.value })}
                    className="input-field h-24"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedLead(null);
                  }}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!selectedLead) {
                      // Criação de novo lead
                      createLeadMutation.mutate(newLead);
                    } else {
                      // Aqui você pode implementar a edição se quiser
                    setShowModal(false);
                    setSelectedLead(null);
                    }
                  }}
                  className="btn-primary"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 