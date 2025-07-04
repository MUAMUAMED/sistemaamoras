import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBagIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  QrCodeIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { dashboardService } from '../services/api';

export default function ERPDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getMetrics,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Produtos Ativos',
      value: stats?.totalProducts || 0,
      icon: ShoppingBagIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/erp/products'
    },
    {
      title: 'Vendas do Mês',
      value: stats?.totalSales || 0,
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/erp/sales'
    },
    {
      title: 'Faturamento do Mês',
      value: stats?.revenueThisMonth ? `R$ ${stats.revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/erp/sales'
    },
    {
      title: 'Scanner',
      value: 'Ativo',
      icon: QrCodeIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/erp/scanner'
    },
  ];

  const quickActions = [
    {
      name: 'Novo Produto',
      description: 'Cadastrar novo produto no sistema',
      icon: ShoppingBagIcon,
      href: '/erp/products',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100'
    },
    {
      name: 'Nova Venda',
      description: 'Registrar nova venda',
      icon: CurrencyDollarIcon,
      href: '/erp/sales',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100'
    },
    {
      name: 'Scanner',
      description: 'Acessar scanner de código de barras',
      icon: QrCodeIcon,
      href: '/erp/scanner',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100'
    },
    {
      name: 'Configurações',
      description: 'Configurações do sistema ERP',
      icon: BuildingOfficeIcon,
      href: '/erp/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard ERP</h1>
            <p className="text-gray-600">Sistema de Gestão Empresarial</p>
          </div>
        </div>
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-2" />
          <span className="text-lg font-semibold text-blue-600">ERP</span>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div 
            key={index} 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(card.href)}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <div
              key={action.name}
              onClick={() => navigate(action.href)}
              className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer transition-all duration-200 ${action.hoverColor} hover:shadow-md`}
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${action.bgColor}`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">{action.name}</h3>
              </div>
              <p className="text-gray-600 text-sm">{action.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vendas Recentes */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendas Recentes</h2>
        {stats?.recentSales && stats.recentSales.length > 0 ? (
          <div className="space-y-4">
            {stats.recentSales.map((sale: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">Venda #{sale.saleNumber || sale.id}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString('pt-BR')} - {sale.leadName || 'Cliente não identificado'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{sale.paymentMethod || 'Não informado'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Nenhuma venda recente encontrada</p>
        )}
      </div>

      {/* Estatísticas do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total de Produtos:</span>
              <span className="font-semibold">{stats?.totalProducts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estoque Baixo:</span>
              <span className="font-semibold text-orange-600">{stats?.lowStockProducts || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Vendas do Mês:</span>
              <span className="font-semibold">{stats?.totalSales || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Faturamento:</span>
              <span className="font-semibold text-green-600">
                R$ {(stats?.revenueThisMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ticket Médio:</span>
              <span className="font-semibold">
                R$ {stats?.totalSales && stats?.revenueThisMonth ? 
                  (stats.revenueThisMonth / stats.totalSales).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 
                  '0,00'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistema</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold text-green-600">Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Versão:</span>
              <span className="font-semibold">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Última Atualização:</span>
              <span className="font-semibold">Hoje</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 