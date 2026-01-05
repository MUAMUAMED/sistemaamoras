import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { dashboardService } from '../services/api';

export default function CRMDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getMetrics,
    staleTime: 60000, // 1 minuto de cache
    refetchOnWindowFocus: false,
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
      title: 'Total de Leads',
      value: stats?.totalLeads || 0,
      icon: UserGroupIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      href: '/crm/leads'
    },
    {
      title: 'Vendas CRM',
      value: stats?.totalSales || 0,
      icon: CurrencyDollarIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/crm/sales'
    },
    {
      title: 'Conversão',
      value: stats?.conversionRate ? `${stats.conversionRate}%` : '0%',
      icon: ChartBarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/crm/sales'
    },
    {
      title: 'Kanban',
      value: 'Visualizar',
      icon: UsersIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/crm/kanban'
    },
  ];

  const quickActions = [
    {
      name: 'Novo Lead',
      description: 'Cadastrar novo lead',
      icon: UserGroupIcon,
      href: '/crm/leads',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hoverColor: 'hover:bg-indigo-100'
    },
    {
      name: 'Kanban',
      description: 'Visualizar leads em kanban',
      icon: UsersIcon,
      href: '/crm/kanban',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100'
    },
    {
      name: 'Nova Venda',
      description: 'Registrar nova venda',
      icon: CurrencyDollarIcon,
      href: '/crm/sales',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100'
    },
    {
      name: 'Configurações',
      description: 'Configurações do CRM',
      icon: CogIcon,
      href: '/crm/settings',
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard CRM</h1>
            <p className="text-gray-600">Gestão de Relacionamento com o Cliente</p>
          </div>
        </div>
        <div className="flex items-center">
          <UserGroupIcon className="h-8 w-8 text-indigo-600 mr-2" />
          <span className="text-lg font-semibold text-indigo-600">CRM</span>
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

      {/* Estatísticas do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total de Leads:</span>
              <span className="font-semibold">{stats?.totalLeads || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conversão:</span>
              <span className="font-semibold text-green-600">{stats?.conversionRate ? `${stats.conversionRate}%` : '0%'}</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Vendas do CRM:</span>
              <span className="font-semibold">{stats?.totalSales || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Faturamento:</span>
              <span className="font-semibold text-orange-600">
                R$ {(stats?.revenueThisMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 