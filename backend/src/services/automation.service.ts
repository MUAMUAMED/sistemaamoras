import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export class AutomationService {
  // Processar venda completa - atualizar lead e reduzir estoque
  static async handleSaleCompleted(saleId: string) {
    try {
      const sale = await prisma.sale.findUnique({
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
        logger.error(`🔥 Venda não encontrada: ${saleId}`);
        return;
      }

      // Se a venda tem leadId, atualizar status do lead
      if (sale.leadId) {
        await prisma.lead.update({
          where: { id: sale.leadId },
          data: {
            status: 'SALE_COMPLETED',
            lastInteraction: new Date()
          }
        });

        // Criar interação automática
        await prisma.interaction.create({
          data: {
            leadId: sale.leadId,
            userId: sale.sellerId,
            type: 'NOTE',
            title: 'Venda realizada',
            description: `Venda #${sale.saleNumber} concluída automaticamente. Valor: R$ ${sale.total.toFixed(2)}`
          }
        });

        logger.info(`✅ Lead ${sale.leadId} atualizado para SALE_COMPLETED após venda ${saleId}`);
      }

      // Reduzir estoque dos produtos
      for (const item of sale.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });

        // Criar movimentação de estoque
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            description: `Venda #${sale.saleNumber}`,
            userId: sale.sellerId
          }
        });

        logger.info(`📦 Estoque reduzido: ${item.product.name} (-${item.quantity})`);
      }

      logger.info(`🎯 Automação processada para venda ${saleId}`);
    } catch (error) {
      logger.error(`❌ Erro na automação de venda: ${error}`);
    }
  }

  // Atualizar score do lead baseado em ações
  static async updateLeadScore(leadId: string, action: string, increase: number = 10) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { leadScore: true, name: true }
      });

      if (!lead) {
        logger.error(`🔥 Lead não encontrado: ${leadId}`);
        return;
      }

      const newScore = Math.min(100, Math.max(0, lead.leadScore + increase));

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          leadScore: newScore,
          lastInteraction: new Date()
        }
      });

      logger.info(`📈 Score do lead ${lead.name} atualizado: ${lead.leadScore} → ${newScore} (${action})`);
    } catch (error) {
      logger.error(`❌ Erro ao atualizar score: ${error}`);
    }
  }

  // Criar interação automática
  static async createAutomaticInteraction(leadId: string, type: string, title: string, description: string, userId?: string) {
    try {
      // Se não tiver userId, buscar o responsável pelo lead
      let interactionUserId = userId;
      if (!interactionUserId) {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { assignedToId: true }
        });
        interactionUserId = lead?.assignedToId || 'system';
      }

      await prisma.interaction.create({
        data: {
          leadId,
          userId: interactionUserId,
          type: type as any,
          title,
          description
        }
      });

      logger.info(`💬 Interação automática criada: ${title} para lead ${leadId}`);
    } catch (error) {
      logger.error(`❌ Erro ao criar interação: ${error}`);
    }
  }

  // Reativar leads frios após período de inatividade
  static async reactivateColdLeads() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const coldLeads = await prisma.lead.findMany({
        where: {
          status: 'COLD_LEAD',
          lastInteraction: {
            lte: thirtyDaysAgo
          }
        }
      });

      for (const lead of coldLeads) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'REACTIVATE',
            lastInteraction: new Date()
          }
        });

        await this.createAutomaticInteraction(
          lead.id,
          'NOTE',
          'Lead reativado automaticamente',
          'Lead foi reativado após 30 dias de inatividade como COLD_LEAD'
        );
      }

      logger.info(`🔄 ${coldLeads.length} leads frios reativados`);
      return coldLeads.length;
    } catch (error) {
      logger.error(`❌ Erro ao reativar leads: ${error}`);
      return 0;
    }
  }

  // Detectar leads abandonados (sem resposta há 7 dias)
  static async detectAbandonedLeads() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const abandonedLeads = await prisma.lead.findMany({
        where: {
          status: 'IN_SERVICE',
          lastInteraction: {
            lte: sevenDaysAgo
          }
        }
      });

      for (const lead of abandonedLeads) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'NO_RESPONSE',
            lastInteraction: new Date()
          }
        });

        await this.createAutomaticInteraction(
          lead.id,
          'NOTE',
          'Lead marcado como sem resposta',
          'Lead automaticamente marcado como NO_RESPONSE após 7 dias sem interação'
        );
      }

      logger.info(`📵 ${abandonedLeads.length} leads marcados como abandonados`);
      return abandonedLeads.length;
    } catch (error) {
      logger.error(`❌ Erro ao detectar leads abandonados: ${error}`);
      return 0;
    }
  }

  // Verificar produtos com estoque baixo (removido minStock do schema)
  static async checkLowStockProducts() {
    try {
      const lowStockProducts = await prisma.product.findMany({
        where: {
          stock: {
            lte: 5 // Definindo 5 como limite baixo padrão
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
        logger.warn(`⚠️ Produto com estoque baixo: ${product.name} (${product.stock} unidades)`);
      }

      return lowStockProducts;
    } catch (error) {
      logger.error(`❌ Erro ao verificar estoque: ${error}`);
      return [];
    }
  }

  // Atualizar estoque após venda
  static async updateStockAfterSale(saleId: string) {
    try {
      const sale = await prisma.sale.findUnique({
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
        logger.error(`🔥 Venda não encontrada: ${saleId}`);
        return;
      }

      for (const item of sale.items) {
        // Atualizar estoque
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });

        // Criar movimentação
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            description: `Venda #${sale.saleNumber}`,
            userId: sale.sellerId
          }
        });
      }

      logger.info(`📦 Estoque atualizado para venda ${saleId}`);
    } catch (error) {
      logger.error(`❌ Erro ao atualizar estoque: ${error}`);
    }
  }

  // Processar pagamento aprovado
  static async processPaymentApproved(saleId: string) {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          items: true
        }
      });

      if (!sale) {
        logger.error(`🔥 Venda não encontrada: ${saleId}`);
        return;
      }

      // Atualizar status da venda
      await prisma.sale.update({
        where: { id: saleId },
        data: {
          status: 'PAID'
        }
      });

      // Processar automações de venda completa
      await this.handleSaleCompleted(saleId);

      logger.info(`💰 Pagamento aprovado para venda ${saleId}`);
    } catch (error) {
      logger.error(`❌ Erro ao processar pagamento: ${error}`);
    }
  }

  // Executar todas as automações programadas
  static async scheduleAutomations() {
    try {
      logger.info('🤖 Iniciando automações programadas...');

      await this.reactivateColdLeads();
      await this.detectAbandonedLeads();
      await this.checkLowStockProducts();

      logger.info('✅ Automações programadas concluídas');
    } catch (error) {
      logger.error(`❌ Erro nas automações programadas: ${error}`);
    }
  }
}

// Executar automações a cada hora
setInterval(async () => {
  await AutomationService.scheduleAutomations();
}, 60 * 60 * 1000); // 1 hora

export default AutomationService; 