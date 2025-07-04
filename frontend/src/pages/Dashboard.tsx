import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  ShoppingBagIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  UsersIcon,
  CogIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const navigate = useNavigate();

  const erpModules = [
    {
      name: 'Produtos',
      description: 'Gerenciar catálogo de produtos, estoque e preços',
      icon: ShoppingBagIcon,
      href: '/erp/products',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100'
    },
    {
      name: 'Vendas',
      description: 'Registrar e acompanhar vendas',
      icon: CurrencyDollarIcon,
      href: '/erp/sales',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100'
    },
    {
      name: 'Scanner',
      description: 'Scanner de código de barras para vendas',
      icon: QrCodeIcon,
      href: '/erp/scanner',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100'
    },
    {
      name: 'Configurações',
      description: 'Configurações do sistema ERP',
      icon: CogIcon,
      href: '/erp/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100'
    }
  ];

  const crmModules = [
    {
      name: 'Leads',
      description: 'Gerenciar leads e oportunidades de venda',
      icon: UserGroupIcon,
      href: '/crm/leads',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hoverColor: 'hover:bg-indigo-100'
    },
    {
      name: 'Kanban',
      description: 'Base de clientes e histórico de compras',
      icon: UsersIcon,
      href: '/crm/kanban',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      hoverColor: 'hover:bg-pink-100'
    },
    {
      name: 'Vendas CRM',
      description: 'Acompanhar vendas e conversões',
      icon: ChartBarIcon,
      href: '/crm/sales',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100'
    },
    {
      name: 'Configurações CRM',
      description: 'Configurações do sistema CRM',
      icon: CogIcon,
      href: '/crm/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      hoverColor: 'hover:bg-gray-100'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel de Administração</h1>
        <p className="text-lg text-gray-600">Selecione a área que deseja acessar</p>
      </div>

      {/* ERP Section */}
      <div>
        <div className="flex items-center mb-6">
          <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Sistema ERP</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Gerencie produtos, estoque, vendas e operações da empresa
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {erpModules.map((module) => (
            <div
              key={module.name}
              onClick={() => navigate(module.href)}
              className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer transition-all duration-200 ${module.hoverColor} hover:shadow-md`}
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${module.bgColor}`}>
                  <module.icon className={`h-6 w-6 ${module.color}`} />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">{module.name}</h3>
              </div>
              <p className="text-gray-600 text-sm">{module.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CRM Section */}
      <div>
        <div className="flex items-center mb-6">
          <UserGroupIcon className="h-8 w-8 text-indigo-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Sistema CRM</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Gerencie relacionamento com clientes, leads e vendas
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {crmModules.map((module) => (
            <div
              key={module.name}
              onClick={() => navigate(module.href)}
              className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer transition-all duration-200 ${module.hoverColor} hover:shadow-md`}
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${module.bgColor}`}>
                  <module.icon className={`h-6 w-6 ${module.color}`} />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">{module.name}</h3>
              </div>
              <p className="text-gray-600 text-sm">{module.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">ERP</div>
            <p className="text-gray-600">Sistema de Gestão Empresarial</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">CRM</div>
            <p className="text-gray-600">Gestão de Relacionamento</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">Integrado</div>
            <p className="text-gray-600">Sistemas Conectados</p>
          </div>
        </div>
      </div>
    </div>
  );
} 