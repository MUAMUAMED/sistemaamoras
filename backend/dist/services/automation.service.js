"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
class AutomationService {
    static async handleSaleCompleted(saleId) {
        try {
            const sale = await database_1.prisma.sale.findUnique({
                where: { id: saleId },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            if (!sale) {
                logger_1.logger.error(`🔥 Venda não encontrada: ${saleId}`);
                return;
            }
            if (sale.leadId) {
                await database_1.prisma.lead.update({
                    where: { id: sale.leadId },
                    data: {
                        status: 'SALE_COMPLETED',
                        lastInteraction: new Date()
                    }
                });
                await database_1.prisma.interaction.create({
                    data: {
                        leadId: sale.leadId,
                        userId: sale.sellerId,
                        type: 'NOTE',
                        title: 'Venda realizada',
                        description: `Venda #${sale.saleNumber} concluída automaticamente. Valor: R$ ${sale.total.toFixed(2)}`
                    }
                });
                logger_1.logger.info(`✅ Lead ${sale.leadId} atualizado para SALE_COMPLETED após venda ${saleId}`);
            }
            for (const item of sale.items) {
                await database_1.prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
                await database_1.prisma.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: 'EXIT',
                        quantity: item.quantity,
                        reason: 'Automação: Venda realizada',
                        userId: sale.sellerId
                    }
                });
                logger_1.logger.info(`📦 Estoque reduzido: ${item.product.name} (-${item.quantity})`);
            }
            logger_1.logger.info(`🎯 Automação processada para venda ${saleId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro na automação de venda: ${error}`);
        }
    }
    static async updateLeadScore(leadId, action, increase = 10) {
        try {
            const lead = await database_1.prisma.lead.findUnique({
                where: { id: leadId },
                select: { leadScore: true, name: true }
            });
            if (!lead) {
                logger_1.logger.error(`🔥 Lead não encontrado: ${leadId}`);
                return;
            }
            const newScore = Math.min(100, Math.max(0, lead.leadScore + increase));
            await database_1.prisma.lead.update({
                where: { id: leadId },
                data: {
                    leadScore: newScore,
                    lastInteraction: new Date()
                }
            });
            logger_1.logger.info(`📈 Score do lead ${lead.name} atualizado: ${lead.leadScore} → ${newScore} (${action})`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro ao atualizar score: ${error}`);
        }
    }
    static async createAutomaticInteraction(leadId, type, title, description, userId) {
        try {
            let interactionUserId = userId;
            if (!interactionUserId) {
                const lead = await database_1.prisma.lead.findUnique({
                    where: { id: leadId },
                    select: { assignedToId: true }
                });
                interactionUserId = lead?.assignedToId || 'system';
            }
            await database_1.prisma.interaction.create({
                data: {
                    leadId,
                    userId: interactionUserId,
                    type: type,
                    title,
                    description
                }
            });
            logger_1.logger.info(`💬 Interação automática criada: ${title} para lead ${leadId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro ao criar interação: ${error}`);
        }
    }
    static async reactivateColdLeads() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const coldLeads = await database_1.prisma.lead.findMany({
                where: {
                    status: 'COLD_LEAD',
                    lastInteraction: {
                        lte: thirtyDaysAgo
                    }
                }
            });
            for (const lead of coldLeads) {
                await database_1.prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        status: 'REACTIVATE',
                        lastInteraction: new Date()
                    }
                });
                await this.createAutomaticInteraction(lead.id, 'NOTE', 'Lead reativado automaticamente', 'Lead foi reativado após 30 dias de inatividade como COLD_LEAD');
            }
            logger_1.logger.info(`🔄 ${coldLeads.length} leads frios reativados`);
            return coldLeads.length;
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro ao reativar leads: ${error}`);
            return 0;
        }
    }
    static async detectAbandonedLeads() {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const abandonedLeads = await database_1.prisma.lead.findMany({
                where: {
                    status: 'IN_SERVICE',
                    lastInteraction: {
                        lte: sevenDaysAgo
                    }
                }
            });
            for (const lead of abandonedLeads) {
                await database_1.prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        status: 'NO_RESPONSE',
                        lastInteraction: new Date()
                    }
                });
                await this.createAutomaticInteraction(lead.id, 'NOTE', 'Lead marcado como sem resposta', 'Lead automaticamente marcado como NO_RESPONSE após 7 dias sem interação');
            }
            logger_1.logger.info(`📵 ${abandonedLeads.length} leads marcados como abandonados`);
            return abandonedLeads.length;
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro ao detectar leads abandonados: ${error}`);
            return 0;
        }
    }
    static async checkLowStockProducts() {
        try {
            const lowStockProducts = await database_1.prisma.product.findMany({
                where: {
                    stock: {
                        lte: 5
                    },
                    active: true
                },
                select: {
                    id: true,
                    name: true,
                    stock: true,
                    barcode: true
                }
            });
            for (const product of lowStockProducts) {
                logger_1.logger.warn(`⚠️ Produto com estoque baixo: ${product.name} (${product.stock} unidades)`);
            }
            return lowStockProducts;
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro ao verificar estoque: ${error}`);
            return [];
        }
    }
    static async updateStockAfterSale(saleId) {
        try {
            const sale = await database_1.prisma.sale.findUnique({
                where: { id: saleId },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            if (!sale) {
                logger_1.logger.error(`🔥 Venda não encontrada: ${saleId}`);
                return;
            }
            for (const item of sale.items) {
                await database_1.prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
                await database_1.prisma.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: 'EXIT',
                        quantity: item.quantity,
                        reason: 'Automação: Venda realizada',
                        userId: sale.sellerId
                    }
                });
            }
            logger_1.logger.info(`📦 Estoque atualizado para venda ${saleId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro ao atualizar estoque: ${error}`);
        }
    }
    static async processPaymentApproved(saleId) {
        try {
            const sale = await database_1.prisma.sale.findUnique({
                where: { id: saleId },
                include: {
                    items: true
                }
            });
            if (!sale) {
                logger_1.logger.error(`🔥 Venda não encontrada: ${saleId}`);
                return;
            }
            await database_1.prisma.sale.update({
                where: { id: saleId },
                data: {
                    status: 'PAID'
                }
            });
            await this.handleSaleCompleted(saleId);
            logger_1.logger.info(`💰 Pagamento aprovado para venda ${saleId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro ao processar pagamento: ${error}`);
        }
    }
    static async scheduleAutomations() {
        try {
            logger_1.logger.info('🤖 Iniciando automações programadas...');
            await this.reactivateColdLeads();
            await this.detectAbandonedLeads();
            await this.checkLowStockProducts();
            logger_1.logger.info('✅ Automações programadas concluídas');
        }
        catch (error) {
            logger_1.logger.error(`❌ Erro nas automações programadas: ${error}`);
        }
    }
}
exports.AutomationService = AutomationService;
setInterval(async () => {
    await AutomationService.scheduleAutomations();
}, 60 * 60 * 1000);
exports.default = AutomationService;
//# sourceMappingURL=automation.service.js.map