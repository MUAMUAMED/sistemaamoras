import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  TagIcon,
  EllipsisVerticalIcon,
  ArrowLeftIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { leadsApi } from '../services/api';
import { Lead, LeadStatus } from '../types';
import toast from 'react-hot-toast';

const statusConfig = {
  NEW_LEAD: {
    title: 'Novos Leads',
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  IN_SERVICE: {
    title: 'Em Atendimento',
    color: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  INTERESTED: {
    title: 'Interessados',
    color: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  NEGOTIATING: {
    title: 'Em Negociação',
    color: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-600'
  },
  SALE_COMPLETED: {
    title: 'Venda Realizada',
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-700',
    bgColor: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  COLD_LEAD: {
    title: 'Leads Frios',
    color: 'bg-gray-50 border-gray-200',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600'
  },
  NO_RESPONSE: {
    title: 'Sem Resposta',
    color: 'bg-red-50 border-red-200',
    textColor: 'text-red-700',
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600'
  },
  REACTIVATE: {
    title: 'Reativar',
    color: 'bg-indigo-50 border-indigo-200',
    textColor: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  }
};

const statusOrder = [
  'NEW_LEAD',
  'IN_SERVICE',
  'INTERESTED',
  'NEGOTIATING',
  'SALE_COMPLETED',
  'COLD_LEAD',
  'NO_RESPONSE',
  'REACTIVATE',
] as LeadStatus[];

export default function Kanban() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: leadsResponse, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.list(),
  });
  const leads = leadsResponse?.data || [];

  const [showModal, setShowModal] = React.useState(false);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // Estado para guardar o update pendente
  const [pendingUpdate, setPendingUpdate] = React.useState<{ id: string; data: Partial<Lead> } | null>(null);

  // Mutation SEM argumento
  const updateLeadMutation = useMutation({
    mutationFn: () => {
      if (!pendingUpdate) return Promise.reject();
      return leadsApi.update(pendingUpdate.id, pendingUpdate.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar lead'),
  });

  // Agrupa os leads por status
  const leadsByStatus: Record<LeadStatus, Lead[]> = React.useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      NEW_LEAD: [], IN_SERVICE: [], INTERESTED: [], NEGOTIATING: [], SALE_COMPLETED: [], COLD_LEAD: [], NO_RESPONSE: [], REACTIVATE: []
    };
    leads.forEach((lead: Lead) => {
      grouped[lead.status]?.push(lead);
    });
    return grouped;
  }, [leads]);

  // Drag and drop handler
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const sourceStatus = source.droppableId as LeadStatus;
    const destStatus = destination.droppableId as LeadStatus;
    if (sourceStatus !== destStatus) {
      setPendingUpdate({ id: draggableId, data: { status: destStatus } });
      updateLeadMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-gray-400">Carregando leads...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/crm/dashboard')}
            className="mr-2 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kanban de Leads</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Visualize e gerencie seus leads em formato kanban</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/crm/leads')}
          className="btn-primary flex items-center px-3 py-1.5 text-xs sm:text-sm"
        >
          <PlusIcon className="h-4 w-4 mr-1" /> Novo Lead
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
        {statusOrder.map((status) => (
          <div
            key={status}
            className={`${statusConfig[status].color} border rounded-lg p-2 text-center`}
          >
            <div className={`${statusConfig[status].textColor} text-xs font-medium mb-0.5`}>{statusConfig[status].title}</div>
            <div className={`${statusConfig[status].textColor} text-lg font-bold`}>{leadsByStatus[status].length}</div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-2 min-w-[700px]">
            {statusOrder.map((status) => (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 flex flex-col rounded-lg border ${statusConfig[status].color} min-w-[220px] max-w-[260px] px-1 py-2 transition-shadow ${snapshot.isDraggingOver ? 'ring-2 ring-primary-400' : ''}`}
                    style={{ minHeight: 400 }}
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className={`font-semibold text-xs ${statusConfig[status].textColor}`}>{statusConfig[status].title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[status].bgColor} ${statusConfig[status].textColor}`}>{leadsByStatus[status].length}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      {leadsByStatus[status].map((lead, idx) => (
                        <Draggable draggableId={lead.id} index={idx} key={lead.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white border border-gray-200 rounded-md shadow-sm px-2 py-1 cursor-pointer hover:shadow-md transition-all text-xs sm:text-sm ${snapshot.isDragging ? 'shadow-lg scale-105' : ''}`}
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowModal(true);
                              }}
                              style={{ minHeight: 60, marginBottom: 2 }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium truncate w-32 sm:w-40" title={lead.name}>{lead.name}</span>
                                <EllipsisVerticalIcon className="h-4 w-4 text-gray-300" />
                              </div>
                              <div className="truncate text-gray-500 flex items-center gap-1">
                                <PhoneIcon className="h-3 w-3" />
                                <span>{lead.phone}</span>
                              </div>
                              {lead.email && (
                                <div className="truncate text-gray-500 flex items-center gap-1">
                                  <EnvelopeIcon className="h-3 w-3" />
                                  <span>{lead.email}</span>
                                </div>
                              )}
                              <div className="truncate text-gray-500 flex items-center gap-1">
                                <UserGroupIcon className="h-3 w-3" />
                                <span>{lead.channel}</span>
                              </div>
                              {Array.isArray(lead.tags) && lead.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <TagIcon className="h-3 w-3" />
                                  {lead.tags.slice(0, 2).map((tag, tagIndex) => (
                                    <span key={tagIndex} className={`${statusConfig[status].bgColor} ${statusConfig[status].textColor} px-1 py-0.5 rounded text-xxs`}>{tag}</span>
                                  ))}
                                  {lead.tags.length > 2 && (
                                    <span className="text-gray-400 text-xxs">+{lead.tags.length - 2}</span>
                                  )}
                                </div>
                              )}
                              <div className="flex justify-between mt-1 text-gray-400 text-xxs">
                                <span>Score:{lead.leadScore}</span>
                                <span>{lead.purchaseCount} compras</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Modal de detalhes/edição */}
      {showModal && selectedLead && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Detalhes do Lead
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    defaultValue={selectedLead?.name || ''}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    defaultValue={selectedLead?.email || ''}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    defaultValue={selectedLead?.phone || ''}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <textarea
                    defaultValue={selectedLead?.notes || ''}
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
                    setShowModal(false);
                    setSelectedLead(null);
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

// Tailwind extra para text-xxs
// Adicione em tailwind.config.js: theme: { extend: { fontSize: { 'xxs': '0.65rem' } } } 