import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import AutomationService from '../services/automation.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Processar automação específica
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { type, saleId, leadId, action, value } = req.body;

    switch (type) {
      case 'sale_completed':
        if (!saleId) {
          return res.status(400).json({ error: 'saleId é obrigatório para automação de venda' });
        }
        await AutomationService.handleSaleCompleted(saleId);
        break;

      case 'payment_approved':
        if (!saleId) {
          return res.status(400).json({ error: 'saleId é obrigatório para automação de pagamento' });
        }
        await AutomationService.processPaymentApproved(saleId);
        break;

      case 'lead_score_update':
        if (!leadId || !action) {
          return res.status(400).json({ error: 'leadId e action são obrigatórios para atualização de score' });
        }
        await AutomationService.updateLeadScore(leadId, action, value);
        break;
      case 'all_scheduled':
        await AutomationService.processScheduledAutomations();
        break;

      default:
        return res.status(400).json({ error: 'Tipo de automação não suportado' });
    }

    res.json({ message: 'Automação processada com sucesso' });
  } catch (error) {
    console.error('Erro ao processar automação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar score de um lead
router.post('/lead-score', authenticateToken, async (req, res) => {
  try {
    const { leadId, action, value } = req.body;
    
    if (!leadId || !action) {
      return res.status(400).json({ error: 'leadId e action são obrigatórios' });
    }
    
    await AutomationService.updateLeadScore(leadId, action, value);
    res.json({ message: 'Score do lead atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar score do lead:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar interação automática
router.post('/interaction', authenticateToken, async (req, res) => {
  try {
    const { leadId, type, title, description, outcome } = req.body;
    
    if (!leadId || !type || !title || !description) {
      return res.status(400).json({ error: 'leadId, type, title e description são obrigatórios' });
    }
    
    await AutomationService.createAutomaticInteraction(leadId, type, title, description, outcome);
    res.json({ message: 'Interação automática criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar interação automática:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reativar leads frios
router.post('/reactivate-cold-leads', authenticateToken, async (req, res) => {
  try {
    await AutomationService.reactivateColdLeads();
    res.json({ message: 'Leads frios reativados com sucesso' });
  } catch (error) {
    console.error('Erro ao reativar leads frios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Detectar leads abandonados
router.post('/detect-abandoned-leads', authenticateToken, async (req, res) => {
  try {
    await AutomationService.detectAbandonedLeads();
    res.json({ message: 'Leads abandonados detectados e atualizados' });
  } catch (error) {
    console.error('Erro ao detectar leads abandonados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Detectar produtos com estoque baixo
router.get('/low-stock-products', authenticateToken, async (req, res) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        active: true,
        stock: {
          lte: 5, // Produtos com estoque <= 5
        },
      },
      include: {
        category: true,
        pattern: true,
      },
    });

    res.json(lowStockProducts);
  } catch (error) {
    console.error('Erro ao buscar produtos com estoque baixo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas das automações
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const stats = await Promise.all([
      // Leads reativados nos últimos 30 dias
      prisma.lead.count({
        where: {
          status: 'REACTIVATE',
          updatedAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // Leads com status "Sem Resposta" nos últimos 30 dias
      prisma.lead.count({
        where: {
          status: 'NO_RESPONSE',
          updatedAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),

      // Vendas concluídas nos últimos 30 dias
      prisma.sale.count({
        where: {
          status: 'PAID',
          updatedAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),

      // Interações automáticas criadas nos últimos 30 dias
      prisma.interaction.count({
        where: {
          outcome: {
            in: ['sale_completed', 'reactivated_automatically', 'no_response_detected'],
          },
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),

      // Produtos com estoque baixo
      prisma.product.count({
        where: {
          active: true,
          stock: {
            lte: 5,
          },
        },
      }),
    ]);

    res.json({
      leadsReactivated: stats[0],
      leadsNoResponse: stats[1],
      salesCompleted: stats[2],
      automaticInteractions: stats[3],
      lowStockProducts: stats[4],
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de automações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar tags de um lead
router.put('/lead-tags/:leadId', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ error: 'Tag é obrigatória' });
    }

    await AutomationService.updateLeadTags(leadId, tag);
    res.json({ message: 'Tags do lead atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar tags do lead:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 