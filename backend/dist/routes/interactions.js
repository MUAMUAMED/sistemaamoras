"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { leadId, type, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (leadId)
            where.leadId = leadId;
        if (type)
            where.type = type;
        const [interactions, total] = await Promise.all([
            database_1.prisma.interaction.findMany({
                where,
                include: {
                    lead: {
                        select: {
                            name: true,
                            phone: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            database_1.prisma.interaction.count({ where })
        ]);
        res.json({
            interactions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Erro ao listar interações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { leadId, type, title, description, outcome, nextAction, scheduledAt } = req.body;
        const userId = req.user?.id;
        if (!leadId || !type || !title || !description) {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }
        const lead = await database_1.prisma.lead.findUnique({
            where: { id: leadId }
        });
        if (!lead) {
            return res.status(404).json({ error: 'Lead não encontrado' });
        }
        const interaction = await database_1.prisma.interaction.create({
            data: {
                leadId,
                userId,
                type,
                title,
                description,
                outcome,
                nextAction,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null
            },
            include: {
                lead: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });
        await database_1.prisma.lead.update({
            where: { id: leadId },
            data: {
                lastInteraction: new Date()
            }
        });
        return res.status(201).json(interaction);
    }
    catch (error) {
        console.error('Erro ao criar interação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const interaction = await database_1.prisma.interaction.findUnique({
            where: { id },
            include: {
                lead: {
                    select: {
                        name: true,
                        phone: true,
                        email: true
                    }
                }
            }
        });
        if (!interaction) {
            return res.status(404).json({ error: 'Interação não encontrada' });
        }
        return res.json(interaction);
    }
    catch (error) {
        console.error('Erro ao buscar interação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, title, description, outcome, nextAction, scheduledAt } = req.body;
        const existingInteraction = await database_1.prisma.interaction.findUnique({
            where: { id }
        });
        if (!existingInteraction) {
            return res.status(404).json({ error: 'Interação não encontrada' });
        }
        const interaction = await database_1.prisma.interaction.update({
            where: { id },
            data: {
                ...(type && { type }),
                ...(title && { title }),
                ...(description && { description }),
                ...(outcome && { outcome }),
                ...(nextAction && { nextAction }),
                ...(scheduledAt && { scheduledAt: new Date(scheduledAt) })
            },
            include: {
                lead: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });
        return res.json(interaction);
    }
    catch (error) {
        console.error('Erro ao atualizar interação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/lead/:leadId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { leadId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const lead = await database_1.prisma.lead.findUnique({
            where: { id: leadId },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                status: true
            }
        });
        if (!lead) {
            return res.status(404).json({ error: 'Lead não encontrado' });
        }
        const [interactions, total] = await Promise.all([
            database_1.prisma.interaction.findMany({
                where: { leadId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            database_1.prisma.interaction.count({ where: { leadId } })
        ]);
        return res.json({
            interactions,
            lead,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Erro ao obter histórico:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/scheduled', auth_1.authenticateToken, async (req, res) => {
    try {
        const { date, userId } = req.query;
        const where = {
            scheduledAt: {
                not: null
            }
        };
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            where.scheduledAt = {
                gte: startDate,
                lt: endDate
            };
        }
        if (userId) {
            where.userId = userId;
        }
        const interactions = await database_1.prisma.interaction.findMany({
            where,
            include: {
                lead: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            },
            orderBy: { scheduledAt: 'asc' }
        });
        return res.json(interactions);
    }
    catch (error) {
        console.error('Erro ao obter interações agendadas:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
exports.default = router;
//# sourceMappingURL=interactions.js.map