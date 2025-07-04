import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CogIcon, UserIcon, KeyIcon, BellIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuthStore();

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: UserIcon },
    { id: 'security', name: 'Segurança', icon: KeyIcon },
    { id: 'notifications', name: 'Notificações', icon: BellIcon },
    { id: 'system', name: 'Sistema', icon: CogIcon },
  ];

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie suas preferências e configurações do sistema</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Informações do Perfil</h3>
                <p className="text-sm text-gray-500">Atualize suas informações pessoais</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    defaultValue={user?.name || ''}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Função</label>
                  <input
                    type="text"
                    defaultValue={user?.role || ''}
                    className="input-field"
                    disabled
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Segurança</h3>
                <p className="text-sm text-gray-500">Gerencie sua senha e configurações de segurança</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Senha Atual</label>
                  <input
                    type="password"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                  <input
                    type="password"
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    className="input-field"
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Autenticação de Dois Fatores</h4>
                    <p className="text-sm text-gray-500">Adicione uma camada extra de segurança</p>
                  </div>
                  <button className="btn-outline">
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Notificações</h3>
                <p className="text-sm text-gray-500">Configure suas preferências de notificação</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Novos Leads</h4>
                    <p className="text-sm text-gray-500">Receba notificações quando novos leads chegarem</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    defaultChecked
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Vendas Concluídas</h4>
                    <p className="text-sm text-gray-500">Receba notificações quando vendas forem concluídas</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    defaultChecked
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Estoque Baixo</h4>
                    <p className="text-sm text-gray-500">Receba alertas quando produtos estiverem com estoque baixo</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    defaultChecked
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Notificações por Email</h4>
                    <p className="text-sm text-gray-500">Receba notificações por email</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Configurações do Sistema</h3>
                <p className="text-sm text-gray-500">Configure parâmetros gerais do sistema</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fuso Horário</label>
                  <select className="input-field">
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Idioma</label>
                  <select className="input-field">
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Moeda</label>
                  <select className="input-field">
                    <option value="BRL">Real (R$)</option>
                    <option value="USD">Dólar ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Integrações</h4>
                    <p className="text-sm text-gray-500">Configure integrações com serviços externos</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">Chatwoot</h5>
                        <p className="text-sm text-gray-500">Integração com atendimento</p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Conectado
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">Mercado Pago</h5>
                        <p className="text-sm text-gray-500">Gateway de pagamento</p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Desconectado
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">n8n</h5>
                        <p className="text-sm text-gray-500">Automação de workflows</p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Conectado
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6 border-t">
            <button
              onClick={handleSave}
              className="btn-primary"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 