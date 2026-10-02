import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CogIcon, UserIcon, KeyIcon, BellIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { whatsappReportApi } from '../services/api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const { user } = useAuthStore();

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: UserIcon },
    { id: 'security', name: 'Segurança', icon: KeyIcon },
    { id: 'notifications', name: 'Notificações', icon: BellIcon },
    { id: 'whatsapp', name: 'Relatórios WhatsApp', icon: BellIcon },
    { id: 'system', name: 'Sistema', icon: CogIcon },
  ];

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  const reportConfigQuery = useQuery({ queryKey: ['whatsapp-report-config'], queryFn: whatsappReportApi.getConfig });
  const reportStatusQuery = useQuery({
    queryKey: ['whatsapp-report-status'], queryFn: whatsappReportApi.getStatus,
    refetchInterval: activeTab === 'whatsapp' ? 3000 : false,
  });
  const groupsQuery = useQuery({
    queryKey: ['whatsapp-report-groups'], queryFn: whatsappReportApi.getGroups,
    enabled: activeTab === 'whatsapp' && Boolean(reportStatusQuery.data?.connected),
  });
  const saveReportConfig = useMutation({
    mutationFn: whatsappReportApi.updateConfig,
    onSuccess: () => { reportConfigQuery.refetch(); toast.success('Configuração do relatório salva'); },
    onError: () => toast.error('Não foi possível salvar a configuração do WhatsApp.'),
  });
  const connectWhatsapp = useMutation({
    mutationFn: whatsappReportApi.connect,
    onSuccess: () => { reportStatusQuery.refetch(); toast.success('QR Code solicitado. Leia-o no WhatsApp do número da Amoras.'); },
    onError: () => toast.error('Não foi possível iniciar a conexão do WhatsApp.'),
  });
  const requestPairingCode = useMutation({
    mutationFn: whatsappReportApi.requestPairingCode,
    onSuccess: (data) => {
      setPairingCode(data.pairingCode);
      toast.success('Código de vinculação gerado. Digite-o no WhatsApp.');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Não foi possível gerar o código de vinculação.'),
  });
  const sendTest = useMutation({
    mutationFn: whatsappReportApi.sendTest,
    onSuccess: () => toast.success('Relatório de teste enviado ao grupo.'),
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Não foi possível enviar o teste.'),
  });

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

          {activeTab === 'whatsapp' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Relatório diário no WhatsApp</h3>
                <p className="text-sm text-gray-500">O resumo das vendas será enviado todos os dias às 18h, no horário de Brasília.</p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Conexão do número da Amoras</h4>
                    <p className="text-sm text-gray-500">
                      {reportStatusQuery.data?.connected ? 'WhatsApp conectado e pronto para enviar.' : 'Conecte o número que participa do grupo de relatórios.'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reportStatusQuery.data?.connected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {reportStatusQuery.data?.connected ? 'Conectado' : reportStatusQuery.data?.waitingForQr ? 'Aguardando QR' : 'Desconectado'}
                  </span>
                </div>
                {!reportStatusQuery.data?.connected && (
                  <div className="mt-4 space-y-4">
                    <button type="button" className="btn-primary" onClick={() => connectWhatsapp.mutate()} disabled={connectWhatsapp.isPending || requestPairingCode.isPending}>
                      {connectWhatsapp.isPending ? 'Gerando QR Code...' : 'Conectar por QR Code'}
                    </button>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-800">Ou conectar por número de telefone</p>
                      <p className="mt-1 text-xs text-gray-500">Digite com DDI e DDD, sem espaços. Ex.: 5561999999999.</p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          className="input-field flex-1"
                          inputMode="tel"
                          placeholder="5561999999999"
                          value={pairingPhone}
                          onChange={(event) => setPairingPhone(event.target.value)}
                        />
                        <button type="button" className="btn-outline" disabled={!pairingPhone.trim() || requestPairingCode.isPending || connectWhatsapp.isPending} onClick={() => requestPairingCode.mutate(pairingPhone)}>
                          {requestPairingCode.isPending ? 'Gerando...' : 'Gerar código'}
                        </button>
                      </div>
                      {pairingCode && (
                        <div className="mt-3 rounded border border-primary-200 bg-white p-3 text-center">
                          <p className="text-xs text-gray-500">No WhatsApp: Dispositivos conectados → Conectar dispositivo → Conectar com número de telefone.</p>
                          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-primary-700">{pairingCode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {reportStatusQuery.data?.qrCodeDataUrl && (
                  <div className="mt-4 rounded border bg-white p-4 text-center">
                    <p className="mb-3 text-sm text-gray-600">No WhatsApp: Dispositivos conectados → Conectar dispositivo.</p>
                    <img src={reportStatusQuery.data.qrCodeDataUrl} alt="QR Code para conectar WhatsApp" className="mx-auto h-64 w-64" />
                  </div>
                )}
                {reportStatusQuery.data?.lastError && <p className="mt-3 text-sm text-red-600">{reportStatusQuery.data.lastError}</p>}
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Grupo que receberá o relatório</label>
                  <select
                    className="input-field mt-1"
                    value={reportConfigQuery.data?.groupJid || ''}
                    disabled={!reportStatusQuery.data?.connected || groupsQuery.isLoading}
                    onChange={(event) => {
                      const group = groupsQuery.data?.find((item) => item.jid === event.target.value);
                      saveReportConfig.mutate({ groupJid: group?.jid || null, groupName: group?.name || null });
                    }}
                  >
                    <option value="">{reportStatusQuery.data?.connected ? 'Selecione o grupo' : 'Conecte o WhatsApp primeiro'}</option>
                    {groupsQuery.data?.map((group) => <option key={group.jid} value={group.jid}>{group.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Escolha “Relatórios Amoras Capital” após conectar o número ao grupo.</p>
                </div>

                <label className="flex items-center gap-3 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                    checked={Boolean(reportConfigQuery.data?.enabled)}
                    disabled={!reportConfigQuery.data?.groupJid || saveReportConfig.isPending}
                    onChange={(event) => saveReportConfig.mutate({ enabled: event.target.checked })}
                  />
                  Ativar envio automático todos os dias às 18h
                </label>

                <button type="button" className="btn-outline" disabled={!reportStatusQuery.data?.connected || !reportConfigQuery.data?.groupJid || sendTest.isPending} onClick={() => sendTest.mutate()}>
                  {sendTest.isPending ? 'Enviando...' : 'Enviar relatório de teste'}
                </button>
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
