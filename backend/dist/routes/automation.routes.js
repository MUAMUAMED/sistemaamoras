"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const automation_service_1 = __importDefault(require("../services/automation.service"));
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.post('/process', auth_1.authenticateToken, async (req, res) => {
    try {
        const { type, saleId, leadId, action, value } = req.body;
        switch (type) {
            case 'sale_completed':
                if (!saleId) {
                    return res.status(400).json({ error: 'saleId é obrigatório para automação de venda' });
                }
                await automation_service_1.default.handleSaleCompleted(saleId);
                break;
            case 'payment_approved':
                if (!saleId) {
                    return res.status(400).json({ error: 'saleId é obrigatório para automação de pagamento' });
                }
                await automation_service_1.default.processPaymentApproved(saleId);
                break;
            case 'lead_score_update':
                if (!leadId || !action) {
                    return res.status(400).json({ error: 'leadId e action são obrigatórios para atualização de score' });
                }
                await automation_service_1.default.updateLeadScore(leadId, action, value);
                break;
            case 'all_scheduled':
                await automation_service_1.default.scheduleAutomations();
                break;
            default:
                return res.status(400).json({ error: 'Tipo de automação não suportado' });
        }
        return res.json({ message: 'Automação processada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao processar automação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/lead-score', auth_1.authenticateToken, async (req, res) => {
    try {
        const { leadId, action, value } = req.body;
        if (!leadId || !action) {
            return res.status(400).json({ error: 'leadId e action são obrigatórios' });
        }
        await automation_service_1.default.updateLeadScore(leadId, action, value);
        return res.json({ message: 'Score do lead atualizado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar score do lead:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/interaction', auth_1.authenticateToken, async (req, res) => {
    try {
        const { leadId, type, title, description, outcome } = req.body;
        if (!leadId || !type || !title || !description) {
            return res.status(400).json({ error: 'leadId, type, title e description são obrigatórios' });
        }
        await automation_service_1.default.createAutomaticInteraction(leadId, type, title, description, outcome);
        return res.json({ message: 'Interação automática criada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao criar interação automática:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/reactivate-cold-leads', auth_1.authenticateToken, async (req, res) => {
    try {
        await automation_service_1.default.reactivateColdLeads();
        return res.json({ message: 'Leads frios reativados com sucesso' });
    }
    catch (error) {
        console.error('Erro ao reativar leads frios:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/detect-abandoned-leads', auth_1.authenticateToken, async (req, res) => {
    try {
        await automation_service_1.default.detectAbandonedLeads();
        return res.json({ message: 'Leads abandonados detectados e atualizados' });
    }
    catch (error) {
        console.error('Erro ao detectar leads abandonados:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/low-stock-products', auth_1.authenticateToken, async (req, res) => {
    try {
        const lowStockProducts = await database_1.prisma.product.findMany({
            where: {
                active: true,
                stock: {
                    lte: 5,
                },
            },
            include: {
                category: true,
                pattern: true,
            },
        });
        return res.json(lowStockProducts);
    }
    catch (error) {
        console.error('Erro ao buscar produtos com estoque baixo:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const stats = await Promise.all([
            database_1.prisma.lead.count({
                where: {
                    status: 'REACTIVATE',
                    updatedAt: {
                        gte: thirtyDaysAgo,
                    },
                },
            }),
            database_1.prisma.lead.count({
                where: {
                    status: 'NO_RESPONSE',
                    updatedAt: {
                        gte: thirtyDaysAgo,
                    },
                },
            }),
            database_1.prisma.sale.count({
                where: {
                    status: 'PAID',
                    updatedAt: {
                        gte: thirtyDaysAgo,
                    },
                },
            }),
            database_1.prisma.interaction.count({
                where: {
                    outcome: {
                        in: ['sale_completed', 'reactivated_automatically', 'no_response_detected'],
                    },
                    createdAt: {
                        gte: thirtyDaysAgo,
                    },
                },
            }),
            database_1.prisma.product.count({
                where: {
                    active: true,
                    stock: {
                        lte: 5,
                    },
                },
            }),
        ]);
        return res.json({
            leadsReactivated: stats[0],
            leadsNoResponse: stats[1],
            salesCompleted: stats[2],
            automaticInteractions: stats[3],
            lowStockProducts: stats[4],
        });
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas de automações:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.put('/lead-tags/:leadId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { leadId } = req.params;
        const { tag } = req.body;
        if (!tag) {
            return res.status(400).json({ error: 'Tag é obrigatória' });
        }
        return res.json({ message: 'Tags do lead atualizadas com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar tags do lead:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
exports.default = router;
//# sourceMappingURL=automation.routes.js.map