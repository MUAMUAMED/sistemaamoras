import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  ShoppingCartIcon,
  QrCodeIcon,
  UsersIcon,
  ChartBarIcon,
  TagIcon,
  FolderIcon,
  SwatchIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';

interface LayoutProps {
  area?: 'erp' | 'crm';
}

const navigationERP = [
  { name: 'Dashboard', href: '/erp/dashboard', icon: HomeIcon },
  { name: 'Produtos', href: '/erp/products', icon: ShoppingBagIcon },
  { name: 'Categorias', href: '/erp/categories', icon: TagIcon },
  { name: 'Subcategorias', href: '/erp/subcategories', icon: FolderIcon },
  { name: 'Estampas', href: '/erp/patterns', icon: SwatchIcon },
  { name: 'Tamanhos', href: '/erp/sizes', icon: ScaleIcon },
  { name: 'Vendas', href: '/erp/sales', icon: ShoppingCartIcon },
  { name: 'Scanner', href: '/erp/scanner', icon: QrCodeIcon },
  { name: 'Configurações', href: '/erp/settings', icon: CogIcon },
];

const navigationCRM = [
  { name: 'Dashboard', href: '/crm/dashboard', icon: HomeIcon },
  { name: 'Leads', href: '/crm/leads', icon: UserGroupIcon },
  { name: 'Kanban', href: '/crm/kanban', icon: UsersIcon },
  { name: 'Vendas', href: '/crm/sales', icon: CurrencyDollarIcon },
  { name: 'Configurações', href: '/crm/settings', icon: CogIcon },
];

const navigationDefault = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
];

export default function Layout({ area }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  let navigation = navigationDefault;
  if (area === 'erp') navigation = navigationERP;
  if (area === 'crm') navigation = navigationCRM;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Link to="/dashboard" className="text-xl font-bold text-primary-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500">
                Amoras Capital
              </Link>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const current = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      current
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={`${
                        current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-4 flex-shrink-0 h-6 w-6`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <Link to="/dashboard" className="text-xl font-bold text-primary-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500">
                  Amoras Capital
                </Link>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const current = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        current
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                    >
                      <item.icon
                        className={`${
                          current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-3 flex-shrink-0 h-6 w-6`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-medium text-gray-900 capitalize">
                  {location.pathname.split('/')[1] || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Olá, <span className="font-medium">{user?.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-outline text-sm"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 