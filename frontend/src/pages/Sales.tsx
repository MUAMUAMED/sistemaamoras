import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, EyeIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { saleService } from '../services/api';
import { Sale } from '../types';
import toast from 'react-hot-toast';

export default function Sales() {
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', searchTerm, statusFilter],
    queryFn: () => saleService.list({ search: searchTerm, status: statusFilter }),
  });

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
                      {sale.leadName || 'Cliente não informado'}
                    </div>
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
                    <button
                      onClick={() => {
                        setSelectedSale(sale);
                        setShowModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
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

      {/* Modal de detalhes */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedSale ? `Venda #${selectedSale.saleNumber}` : 'Nova Venda'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cliente</label>
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Método de Pagamento</label>
                  <select className="input-field">
                    <option value="">Selecione</option>
                    <option value="pix">PIX</option>
                    <option value="card">Cartão</option>
                    <option value="cash">Dinheiro</option>
                    <option value="transfer">Transferência</option>
                  </select>
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
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedSale(null);
                    toast.success('Venda salva com sucesso!');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
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
