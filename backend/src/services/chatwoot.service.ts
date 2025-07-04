import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ChatwootContact {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
  identifier?: string;
  custom_attributes?: Record<string, any>;
  created_at: string;
}

export interface ChatwootConversation {
  id: number;
  account_id: number;
  inbox_id: number;
  status: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  contact: ChatwootContact;
  messages?: ChatwootMessage[];
  meta?: {
    sender?: ChatwootContact;
    assignee?: any;
  };
  created_at: string;
  updated_at: string;
}

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  content_type: 'text' | 'input_email' | 'input_text' | 'form' | 'article' | 'incoming_email';
  created_at: string;
  conversation_id: number;
  sender?: ChatwootContact;
  contact_id?: number;
  inbox_id: number;
  source_id?: string;
  attachments?: Array<{
    id: number;
    message_id: number;
    file_type: string;
    account_id: number;
    file_url: string;
    thumb_url?: string;
  }>;
}

export interface ChatwootWebhookPayload {
  event: string;
  account?: {
    id: number;
    name: string;
  };
  conversation?: ChatwootConversation;
  message?: ChatwootMessage;
  contact?: ChatwootContact;
  inbox?: {
    id: number;
    name: string;
    channel_type: string;
  };
  changed_attributes?: Array<{
    field: string;
    from: any;
    to: any;
  }>;
}

/**
 * Serviço para integração com Chatwoot
 * Processa webhooks e cria leads automaticamente
 */
export class ChatwootService {
  /**
   * Processa webhook do Chatwoot
   */
  static async processWebhook(payload: ChatwootWebhookPayload): Promise<any> {
    try {
      console.log(`📞 Webhook Chatwoot recebido: ${payload.event}`);

      // Log do webhook
      await prisma.webhookLog.create({
        data: {
          source: 'chatwoot',
          event: payload.event,
          data: payload as any,
          processed: false
        }
      });

      let result = null;

      switch (payload.event) {
        case 'conversation_created':
          result = await this.handleConversationCreated(payload);
          break;
        case 'message_created':
          result = await this.handleMessageCreated(payload);
          break;
        case 'contact_created':
          result = await this.handleContactCreated(payload);
          break;
        case 'conversation_status_changed':
          result = await this.handleConversationStatusChanged(payload);
          break;
        case 'assignee_changed':
          result = await this.handleAssigneeChanged(payload);
          break;
        default:
          console.log(`⚠️ Evento não tratado: ${payload.event}`);
          break;
      }

      // Marcar webhook como processado
      if (result) {
        await prisma.webhookLog.updateMany({
          where: {
            source: 'chatwoot',
            processed: false,
            createdAt: {
              gte: new Date(Date.now() - 5000) // Últimos 5 segundos
            }
          },
          data: {
            processed: true
          }
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Erro ao processar webhook Chatwoot:', error);
      throw error;
    }
  }

  /**
   * Manipula criação de nova conversa
   */
  private static async handleConversationCreated(payload: ChatwootWebhookPayload) {
    if (!payload.conversation?.contact) {
      console.log('⚠️ Conversa sem contato, ignorando...');
      return null;
    }

    const contact = payload.conversation.contact;
    
    // Verificar se já existe lead com este telefone/email
    const existingLead = await this.findExistingLead(contact);
    
    if (existingLead) {
      console.log(`👥 Lead já existe: ${existingLead.name} (${existingLead.phone})`);
      
      // Criar interação para lead existente
      await this.createInteractionForLead(existingLead.id, {
        type: 'WHATSAPP',
        title: 'Nova conversa no Chatwoot',
        description: `Nova conversa iniciada no ${payload.inbox?.name || 'Chatwoot'}`,
        outcome: 'Nova conversa iniciada'
      });

      return { action: 'interaction_created', leadId: existingLead.id };
    }

    // Criar novo lead
    const leadData = this.extractLeadDataFromContact(contact, payload);
    const newLead = await this.createLeadFromContact(leadData, payload);
    
    console.log(`✅ Novo lead criado: ${newLead.name} (${newLead.phone})`);
    
    return { action: 'lead_created', lead: newLead };
  }

  /**
   * Manipula criação de nova mensagem
   */
  private static async handleMessageCreated(payload: ChatwootWebhookPayload) {
    if (!payload.message || !payload.conversation?.contact) {
      return null;
    }

    const contact = payload.conversation.contact;
    const message = payload.message;

    // Buscar lead associado
    const lead = await this.findExistingLead(contact);
    
    if (!lead) {
      console.log('⚠️ Mensagem recebida mas lead não encontrado');
      return null;
    }

    // Criar interação apenas para mensagens do cliente (incoming)
    if (message.message_type === 'incoming') {
      await this.createInteractionForLead(lead.id, {
        type: 'WHATSAPP',
        title: 'Mensagem recebida',
        description: this.sanitizeMessageContent(message.content),
        outcome: 'Mensagem do cliente processada'
      });

      console.log(`💬 Interação criada para lead ${lead.name}: ${message.content.substring(0, 50)}...`);
    }

    return { action: 'interaction_created', leadId: lead.id };
  }

  /**
   * Manipula criação de novo contato
   */
  private static async handleContactCreated(payload: ChatwootWebhookPayload) {
    if (!payload.contact) {
      return null;
    }

    const contact = payload.contact;
    
    // Verificar se já existe lead
    const existingLead = await this.findExistingLead(contact);
    
    if (existingLead) {
      console.log(`👥 Contato já existe como lead: ${existingLead.name}`);
      return { action: 'lead_exists', leadId: existingLead.id };
    }

    // Criar lead apenas se o contato tiver telefone ou email
    if (!contact.phone_number && !contact.email) {
      console.log('⚠️ Contato sem telefone nem email, não criando lead');
      return null;
    }

    const leadData = this.extractLeadDataFromContact(contact, payload);
    const newLead = await this.createLeadFromContact(leadData, payload);
    
    console.log(`✅ Lead criado a partir de contato: ${newLead.name}`);
    
    return { action: 'lead_created', lead: newLead };
  }

  /**
   * Manipula mudança de status da conversa
   */
  private static async handleConversationStatusChanged(payload: ChatwootWebhookPayload) {
    if (!payload.conversation?.contact) {
      return null;
    }

    const contact = payload.conversation.contact;
    const lead = await this.findExistingLead(contact);
    
    if (!lead) {
      return null;
    }

    const statusChange = payload.changed_attributes?.find(attr => attr.field === 'status');
    if (!statusChange) {
      return null;
    }

    await this.createInteractionForLead(lead.id, {
      type: 'NOTE',
      title: 'Status da conversa alterado',
      description: `Status alterado de "${statusChange.from}" para "${statusChange.to}" no Chatwoot`,
      outcome: `Conversa ${statusChange.to}`
    });

    // Atualizar status do lead baseado no status da conversa
    const leadStatus = this.mapConversationStatusToLeadStatus(statusChange.to);
    if (leadStatus && leadStatus !== lead.status) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: leadStatus as any,
          lastInteraction: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`📊 Status do lead ${lead.name} atualizado para ${leadStatus}`);
    }

    return { action: 'status_updated', leadId: lead.id };
  }

  /**
   * Manipula mudança de responsável
   */
  private static async handleAssigneeChanged(payload: ChatwootWebhookPayload) {
    if (!payload.conversation?.contact) {
      return null;
    }

    const contact = payload.conversation.contact;
    const lead = await this.findExistingLead(contact);
    
    if (!lead) {
      return null;
    }

    const assigneeChange = payload.changed_attributes?.find(attr => attr.field === 'assignee_id');
    if (!assigneeChange) {
      return null;
    }

    // Buscar usuário correspondente no sistema
    const assigneeId = assigneeChange.to;
    const assignee = payload.conversation.assignee;
    
    if (assignee && assigneeId) {
      // Tentar encontrar usuário por email
      const user = await prisma.user.findUnique({
        where: { email: assignee.email }
      });

      if (user) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { 
            assignedToId: user.id,
            lastInteraction: new Date()
          }
        });

        await this.createInteractionForLead(lead.id, {
          type: 'NOTE',
          title: 'Responsável alterado',
          description: `Lead atribuído para ${assignee.name} (${assignee.email}) via Chatwoot`,
          outcome: `Atribuído para ${assignee.name}`
        });

        console.log(`👤 Lead ${lead.name} atribuído para ${assignee.name}`);
      }
    }

    return { action: 'assignee_updated', leadId: lead.id };
  }

  /**
   * Utilitários
   */
  private static async findExistingLead(contact: ChatwootContact) {
    const conditions = [];
    
    if (contact.phone_number) {
      const cleanPhone = this.cleanPhoneNumber(contact.phone_number);
      conditions.push({ phone: cleanPhone });
    }
    
    if (contact.email) {
      conditions.push({ email: contact.email });
    }

    if (conditions.length === 0) {
      return null;
    }

    return await prisma.lead.findFirst({
      where: { OR: conditions }
    });
  }

  private static extractLeadDataFromContact(contact: ChatwootContact, payload: ChatwootWebhookPayload) {
    const channel = payload.inbox?.channel_type || 'chatwoot';
    const source = `${payload.inbox?.name || 'Chatwoot'} - ${channel}`;
    
    return {
      name: contact.name || 'Cliente',
      phone: contact.phone_number ? this.cleanPhoneNumber(contact.phone_number) : '',
      email: contact.email,
      channel: this.mapChannelType(channel),
      source: source,
      leadScore: 60, // Score padrão para leads do Chatwoot
      tags: ['chatwoot', channel],
      notes: contact.custom_attributes ? 
        Object.entries(contact.custom_attributes)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n') : undefined
    };
  }

  private static async createLeadFromContact(leadData: any, payload: ChatwootWebhookPayload) {
    // Buscar primeiro usuário ativo para atribuir o lead
    const firstUser = await prisma.user.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' }
    });

    const lead = await prisma.lead.create({
      data: {
        ...leadData,
        assignedToId: firstUser?.id,
        status: 'NEW_LEAD',
        lastInteraction: new Date()
      }
    });

    // Criar interação inicial
    await this.createInteractionForLead(lead.id, {
      type: 'NOTE',
      title: 'Lead criado via Chatwoot',
      description: `Lead criado automaticamente a partir de conversa no ${payload.inbox?.name || 'Chatwoot'}`,
      outcome: 'Lead importado do Chatwoot'
    });

    return lead;
  }

  private static async createInteractionForLead(leadId: string, data: {
    type: string;
    title: string;
    description: string;
    outcome?: string;
  }) {
    // Buscar primeiro usuário ativo para criar a interação
    const firstUser = await prisma.user.findFirst({
      where: { active: true }
    });

    if (!firstUser) {
      console.warn('⚠️ Nenhum usuário ativo encontrado para criar interação');
      return null;
    }

    return await prisma.interaction.create({
      data: {
        leadId,
        userId: firstUser.id,
        type: data.type as any,
        title: data.title,
        description: data.description,
        outcome: data.outcome
      }
    });
  }

  private static cleanPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Se começar com 55 (código do Brasil), remove
    if (cleaned.startsWith('55') && cleaned.length > 11) {
      cleaned = cleaned.substring(2);
    }
    
    // Se não tem 11 dígitos, adiciona 9 no início se for celular
    if (cleaned.length === 10 && (cleaned[2] === '9' || cleaned[2] === '8' || cleaned[2] === '7')) {
      cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
    }
    
    return cleaned;
  }

  private static mapChannelType(channelType: string): string {
    const channelMap: Record<string, string> = {
      'Channel::WhatsApp': 'WhatsApp',
      'Channel::FacebookPage': 'Facebook',
      'Channel::Instagram': 'Instagram',
      'Channel::Telegram': 'Telegram',
      'Channel::Line': 'Line',
      'Channel::Sms': 'SMS',
      'Channel::Email': 'Email',
      'Channel::WebWidget': 'Site'
    };
    
    return channelMap[channelType] || 'Chatwoot';
  }

  private static mapConversationStatusToLeadStatus(conversationStatus: string) {
    const statusMap: Record<string, string> = {
      'open': 'IN_SERVICE',
      'resolved': 'SALE_COMPLETED',
      'pending': 'INTERESTED',
      'snoozed': 'COLD_LEAD'
    };
    
    return statusMap[conversationStatus] || null;
  }

  private static sanitizeMessageContent(content: string): string {
    // Remove HTML tags e limita tamanho
    const cleaned = content.replace(/<[^>]*>/g, '').trim();
    return cleaned.length > 500 ? cleaned.substring(0, 500) + '...' : cleaned;
  }

  /**
   * Configurar webhook URL no Chatwoot
   */
  static async getWebhookConfig(): Promise<{ webhook_url: string; events: string[] }> {
    const config = await prisma.systemConfig.findFirst();
    
    if (!config) {
      throw new Error('Configuração do sistema não encontrada');
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    const webhookUrl = `${baseUrl}/api/webhooks/chatwoot`;

    return {
      webhook_url: webhookUrl,
      events: [
        'conversation_created',
        'message_created',
        'contact_created', 
        'conversation_status_changed',
        'assignee_changed'
      ]
    };
  }

  /**
   * Verificar configuração do Chatwoot
   */
  static async validateConfig(): Promise<{ valid: boolean; message: string }> {
    try {
      const config = await prisma.systemConfig.findFirst();
      
      if (!config?.chatwootUrl || !config?.chatwootToken) {
        return {
          valid: false,
          message: 'URL e token do Chatwoot não configurados'
        };
      }

      // Tentar fazer uma requisição simples para validar
      // (implementação básica - pode ser expandida)
      
      return {
        valid: true,
        message: 'Configuração do Chatwoot válida'
      };
    } catch (error) {
      return {
        valid: false,
        message: `Erro ao validar configuração: ${error}`
      };
    }
  }
} 