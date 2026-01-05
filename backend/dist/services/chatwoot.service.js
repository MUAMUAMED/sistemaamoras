"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatwootService = void 0;
const database_1 = require("../config/database");
class ChatwootService {
    static async processWebhook(payload) {
        try {
            console.log(`📞 Webhook Chatwoot recebido: ${payload.event}`);
            await database_1.prisma.webhookLog.create({
                data: {
                    source: 'chatwoot',
                    event: payload.event,
                    data: payload,
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
            if (result) {
                await database_1.prisma.webhookLog.updateMany({
                    where: {
                        source: 'chatwoot',
                        processed: false,
                        createdAt: {
                            gte: new Date(Date.now() - 5000)
                        }
                    },
                    data: {
                        processed: true
                    }
                });
            }
            return result;
        }
        catch (error) {
            console.error('❌ Erro ao processar webhook Chatwoot:', error);
            throw error;
        }
    }
    static async handleConversationCreated(payload) {
        if (!payload.conversation?.contact) {
            console.log('⚠️ Conversa sem contato, ignorando...');
            return null;
        }
        const contact = payload.conversation.contact;
        const existingLead = await this.findExistingLead(contact);
        if (existingLead) {
            console.log(`👥 Lead já existe: ${existingLead.name} (${existingLead.phone})`);
            await this.createInteractionForLead(existingLead.id, {
                type: 'WHATSAPP',
                title: 'Nova conversa no Chatwoot',
                description: `Nova conversa iniciada no ${payload.inbox?.name || 'Chatwoot'}`,
                outcome: 'Nova conversa iniciada'
            });
            return { action: 'interaction_created', leadId: existingLead.id };
        }
        const leadData = this.extractLeadDataFromContact(contact, payload);
        const newLead = await this.createLeadFromContact(leadData, payload);
        console.log(`✅ Novo lead criado: ${newLead.name} (${newLead.phone})`);
        return { action: 'lead_created', lead: newLead };
    }
    static async handleMessageCreated(payload) {
        if (!payload.message || !payload.conversation?.contact) {
            return null;
        }
        const contact = payload.conversation.contact;
        const message = payload.message;
        const lead = await this.findExistingLead(contact);
        if (!lead) {
            console.log('⚠️ Mensagem recebida mas lead não encontrado');
            return null;
        }
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
    static async handleContactCreated(payload) {
        if (!payload.contact) {
            return null;
        }
        const contact = payload.contact;
        const existingLead = await this.findExistingLead(contact);
        if (existingLead) {
            console.log(`👥 Contato já existe como lead: ${existingLead.name}`);
            return { action: 'lead_exists', leadId: existingLead.id };
        }
        if (!contact.phone_number && !contact.email) {
            console.log('⚠️ Contato sem telefone nem email, não criando lead');
            return null;
        }
        const leadData = this.extractLeadDataFromContact(contact, payload);
        const newLead = await this.createLeadFromContact(leadData, payload);
        console.log(`✅ Lead criado a partir de contato: ${newLead.name}`);
        return { action: 'lead_created', lead: newLead };
    }
    static async handleConversationStatusChanged(payload) {
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
        const leadStatus = this.mapConversationStatusToLeadStatus(statusChange.to);
        if (leadStatus && leadStatus !== lead.status) {
            await database_1.prisma.lead.update({
                where: { id: lead.id },
                data: {
                    status: leadStatus,
                    lastInteraction: new Date(),
                    updatedAt: new Date()
                }
            });
            console.log(`📊 Status do lead ${lead.name} atualizado para ${leadStatus}`);
        }
        return { action: 'status_updated', leadId: lead.id };
    }
    static async handleAssigneeChanged(payload) {
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
        const assigneeId = assigneeChange.to;
        const assignee = payload.conversation.assignee;
        if (assignee && assigneeId) {
            const user = await database_1.prisma.user.findUnique({
                where: { email: assignee.email }
            });
            if (user) {
                await database_1.prisma.lead.update({
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
    static async findExistingLead(contact) {
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
        return await database_1.prisma.lead.findFirst({
            where: { OR: conditions }
        });
    }
    static extractLeadDataFromContact(contact, payload) {
        const channel = payload.inbox?.channel_type || 'chatwoot';
        const source = `${payload.inbox?.name || 'Chatwoot'} - ${channel}`;
        return {
            name: contact.name || 'Cliente',
            phone: contact.phone_number ? this.cleanPhoneNumber(contact.phone_number) : '',
            email: contact.email,
            channel: this.mapChannelType(channel),
            source: source,
            leadScore: 60,
            tags: ['chatwoot', channel],
            notes: contact.custom_attributes ?
                Object.entries(contact.custom_attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n') : undefined
        };
    }
    static async createLeadFromContact(leadData, payload) {
        const firstUser = await database_1.prisma.user.findFirst({
            where: { active: true },
            orderBy: { createdAt: 'asc' }
        });
        const lead = await database_1.prisma.lead.create({
            data: {
                ...leadData,
                assignedToId: firstUser?.id,
                status: 'NEW_LEAD',
                lastInteraction: new Date()
            }
        });
        await this.createInteractionForLead(lead.id, {
            type: 'NOTE',
            title: 'Lead criado via Chatwoot',
            description: `Lead criado automaticamente a partir de conversa no ${payload.inbox?.name || 'Chatwoot'}`,
            outcome: 'Lead importado do Chatwoot'
        });
        return lead;
    }
    static async createInteractionForLead(leadId, data) {
        const firstUser = await database_1.prisma.user.findFirst({
            where: { active: true }
        });
        if (!firstUser) {
            console.warn('⚠️ Nenhum usuário ativo encontrado para criar interação');
            return null;
        }
        return await database_1.prisma.interaction.create({
            data: {
                leadId,
                userId: firstUser.id,
                type: data.type,
                title: data.title,
                description: data.description,
                outcome: data.outcome
            }
        });
    }
    static cleanPhoneNumber(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('55') && cleaned.length > 11) {
            cleaned = cleaned.substring(2);
        }
        if (cleaned.length === 10 && (cleaned[2] === '9' || cleaned[2] === '8' || cleaned[2] === '7')) {
            cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
        }
        return cleaned;
    }
    static mapChannelType(channelType) {
        const channelMap = {
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
    static mapConversationStatusToLeadStatus(conversationStatus) {
        const statusMap = {
            'open': 'IN_SERVICE',
            'resolved': 'SALE_COMPLETED',
            'pending': 'INTERESTED',
            'snoozed': 'COLD_LEAD'
        };
        return statusMap[conversationStatus] || null;
    }
    static sanitizeMessageContent(content) {
        const cleaned = content.replace(/<[^>]*>/g, '').trim();
        return cleaned.length > 500 ? cleaned.substring(0, 500) + '...' : cleaned;
    }
    static async getWebhookConfig() {
        const config = await database_1.prisma.systemConfig.findFirst();
        if (!config) {
            throw new Error('Configuração do sistema não encontrada');
        }
        const baseUrl = process.env.APP_URL;
        if (!baseUrl) {
            throw new Error('APP_URL não configurado. Configure a variável de ambiente APP_URL com a URL base da aplicação.');
        }
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
    static async validateConfig() {
        try {
            const config = await database_1.prisma.systemConfig.findFirst();
            if (!config?.chatwootUrl || !config?.chatwootToken) {
                return {
                    valid: false,
                    message: 'URL e token do Chatwoot não configurados'
                };
            }
            return {
                valid: true,
                message: 'Configuração do Chatwoot válida'
            };
        }
        catch (error) {
            return {
                valid: false,
                message: `Erro ao validar configuração: ${error}`
            };
        }
    }
}
exports.ChatwootService = ChatwootService;
//# sourceMappingURL=chatwoot.service.js.map