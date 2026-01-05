"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const Joi = __importStar(require("joi"));
const router = (0, express_1.Router)();
const leadSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().min(8).max(20).required(),
    email: Joi.string().email().optional(),
    channel: Joi.string().max(50).optional(),
    source: Joi.string().max(100).optional(),
    assignedToId: Joi.string().uuid().optional(),
    notes: Joi.string().max(1000).optional(),
    leadScore: Joi.number().min(0).max(100).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
});
const statusUpdateSchema = Joi.object({
    status: Joi.string().valid('NEW_LEAD', 'IN_SERVICE', 'INTERESTED', 'NEGOTIATING', 'SALE_COMPLETED', 'COLD_LEAD', 'NO_RESPONSE', 'REACTIVATE').required(),
    notes: Joi.string().max(500).optional(),
});
const interactionSchema = Joi.object({
    type: Joi.string().valid('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'NOTE', 'TASK', 'STATUS_CHANGE').required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(5).max(1000).required(),
    outcome: Joi.string().max(500).optional(),
    nextAction: Joi.string().max(500).optional(),
    scheduledAt: Joi.date().optional(),
});
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, search, assignedTo, channel, minScore, maxScore, tags, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (assignedTo) {
            where.assignedToId = assignedTo;
        }
        if (channel) {
            where.channel = channel;
        }
        if (minScore !== undefined || maxScore !== undefined) {
            where.leadScore = {};
            if (minScore !== undefined) {
                where.leadScore.gte = parseInt(minScore);
            }
            if (maxScore !== undefined) {
                where.leadScore.lte = parseInt(maxScore);
            }
        }
        if (tags) {
            const tagList = tags.split(',').map(tag => tag.trim());
            where.tags = {
                hasSome: tagList
            };
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }
        const orderBy = {};
        if (sortBy === 'createdAt' || sortBy === 'lastInteraction' || sortBy === 'leadScore' || sortBy === 'name') {
            orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const [leads, total] = await Promise.all([
            database_1.prisma.lead.findMany({
                where,
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    _count: {
                        select: {
                            interactions: true,
                            sales: true,
                        },
                    },
                },
                orderBy,
                skip: offset,
                take: limitNum,
            }),
            database_1.prisma.lead.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limitNum);
        return res.json({
            data: leads,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: totalPages,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/pipeline', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const pipeline = await database_1.prisma.lead.groupBy({
            by: ['status'],
            _count: {
                id: true,
            },
            _avg: {
                leadScore: true,
            },
        });
        const totalLeads = await database_1.prisma.lead.count();
        const conversions = await database_1.prisma.lead.count({
            where: { status: 'SALE_COMPLETED' }
        });
        const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
        return res.json({
            pipeline: pipeline.map(item => ({
                status: item.status,
                count: item._count.id,
                averageScore: Math.round(item._avg.leadScore || 0),
            })),
            totals: {
                totalLeads,
                conversions,
                conversionRate: Math.round(conversionRate * 100) / 100,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/dashboard', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [totalLeads, newLeadsToday, newLeadsThisWeek, newLeadsThisMonth, hotLeads, coldLeads, conversions,] = await Promise.all([
            database_1.prisma.lead.count(),
            database_1.prisma.lead.count({
                where: {
                    createdAt: { gte: startOfToday }
                }
            }),
            database_1.prisma.lead.count({
                where: {
                    createdAt: { gte: startOfWeek }
                }
            }),
            database_1.prisma.lead.count({
                where: {
                    createdAt: { gte: startOfMonth }
                }
            }),
            database_1.prisma.lead.count({
                where: {
                    leadScore: { gte: 80 }
                }
            }),
            database_1.prisma.lead.count({
                where: {
                    OR: [
                        { status: 'COLD_LEAD' },
                        { status: 'NO_RESPONSE' }
                    ]
                }
            }),
            database_1.prisma.lead.count({
                where: {
                    status: 'SALE_COMPLETED'
                }
            }),
        ]);
        const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
        const topPerformers = await database_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
            },
            take: 5
        });
        const topPerformersWithCounts = await Promise.all(topPerformers.map(async (user) => {
            const conversions = await database_1.prisma.lead.count({
                where: {
                    assignedToId: user.id,
                    status: 'SALE_COMPLETED'
                }
            });
            return {
                id: user.id,
                name: user.name,
                conversions
            };
        }));
        topPerformersWithCounts.sort((a, b) => b.conversions - a.conversions);
        return res.json({
            totalLeads,
            newLeadsToday,
            newLeadsThisWeek,
            newLeadsThisMonth,
            hotLeads,
            coldLeads,
            conversions,
            conversionRate: Math.round(conversionRate * 100) / 100,
            topPerformers: topPerformersWithCounts
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                interactions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 20
                },
                sales: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        price: true,
                                        barcode: true
                                    }
                                },
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
            },
        });
        if (!lead) {
            return res.status(404).json({
                error: 'Lead não encontrado',
                message: 'O lead solicitado não foi encontrado',
            });
        }
        return res.json(lead);
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        console.log('[DEBUG] Iniciando criação de lead...');
        console.log('[DEBUG] Dados recebidos:', JSON.stringify(req.body, null, 2));
        console.log('[DEBUG] Usuário:', req.user?.name);
        const { name, phone, email, channel, source, assignedToId, notes, leadScore = 50, tags = [] } = req.body;
        console.log('[DEBUG] Validando dados obrigatórios...');
        const { error } = leadSchema.validate({ name, phone, email, channel, source, assignedToId, notes, leadScore, tags });
        if (error) {
            console.log('[DEBUG] Erro de validação:', error.details);
            return res.status(400).json({
                error: 'Dados inválidos',
                message: error.details.map(detail => detail.message).join(', '),
            });
        }
        console.log('[DEBUG] Verificando telefone duplicado...');
        const existingLead = await database_1.prisma.lead.findUnique({
            where: { phone },
        });
        if (existingLead) {
            console.log('[DEBUG] Telefone já existe:', phone);
            return res.status(409).json({
                error: 'Telefone já existe',
                message: 'Já existe um lead com este telefone',
            });
        }
        console.log('[DEBUG] Criando lead no banco...');
        const lead = await database_1.prisma.lead.create({
            data: {
                name,
                phone,
                email,
                channel: channel || 'Manual',
                source,
                assignedToId: assignedToId || req.user.id,
                notes,
                leadScore,
                tags: Array.isArray(tags) ? tags.join(',') : tags || null
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        console.log('[DEBUG] Lead criado com sucesso:', lead.id);
        console.log('[DEBUG] Criando interação inicial...');
        await database_1.prisma.interaction.create({
            data: {
                leadId: lead.id,
                userId: req.user.id,
                type: 'NOTE',
                title: 'Lead criado',
                description: `Lead criado manualmente por ${req.user.name}. Canal: ${channel || 'Manual'}${source ? `, Origem: ${source}` : ''}`,
            },
        });
        console.log('[DEBUG] Interação criada com sucesso');
        console.log('[DEBUG] Retornando lead criado');
        return res.status(201).json(lead);
    }
    catch (error) {
        console.error('[ERROR] Erro ao criar lead:', error);
        return next(error);
    }
});
router.put('/:id/score', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { score, reason } = req.body;
        if (score === undefined || score < 0 || score > 100) {
            return res.status(400).json({
                error: 'Score inválido',
                message: 'O score deve estar entre 0 e 100',
            });
        }
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
            select: { leadScore: true, name: true }
        });
        if (!lead) {
            return res.status(404).json({
                error: 'Lead não encontrado',
                message: 'O lead solicitado não foi encontrado',
            });
        }
        const oldScore = lead.leadScore;
        const updatedLead = await database_1.prisma.lead.update({
            where: { id },
            data: {
                leadScore: score,
                lastInteraction: new Date(),
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        await database_1.prisma.interaction.create({
            data: {
                leadId: id,
                userId: req.user.id,
                type: 'NOTE',
                title: 'Score atualizado',
                description: `Score alterado de ${oldScore} para ${score} por ${req.user.name}${reason ? `. Motivo: ${reason}` : ''}`,
            },
        });
        return res.json(updatedLead);
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id/tags', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { tags } = req.body;
        if (!Array.isArray(tags)) {
            return res.status(400).json({
                error: 'Tags inválidas',
                message: 'Tags deve ser um array de strings',
            });
        }
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
            select: { tags: true, name: true }
        });
        if (!lead) {
            return res.status(404).json({
                error: 'Lead não encontrado',
                message: 'O lead solicitado não foi encontrado',
            });
        }
        const updatedLead = await database_1.prisma.lead.update({
            where: { id },
            data: {
                tags: tags,
                lastInteraction: new Date(),
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        await database_1.prisma.interaction.create({
            data: {
                leadId: id,
                userId: req.user.id,
                type: 'NOTE',
                title: 'Tags atualizadas',
                description: `Tags atualizadas por ${req.user.name}. Novas tags: ${tags.join(', ')}`,
            },
        });
        return res.json(updatedLead);
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, email, status, assignedToId, notes, source, leadScore, tags } = req.body;
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
        });
        if (!lead) {
            return res.status(404).json({
                error: 'Lead não encontrado',
                message: 'O lead solicitado não foi encontrado',
            });
        }
        const statusChanged = status && status !== lead.status;
        const oldStatus = lead.status;
        const updatedLead = await database_1.prisma.lead.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(email && { email }),
                ...(status && { status }),
                ...(assignedToId && { assignedToId }),
                ...(notes && { notes }),
                ...(source && { source }),
                ...(leadScore !== undefined && { leadScore }),
                ...(tags && { tags: tags.join(',') }),
                lastInteraction: new Date(),
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (statusChanged) {
            await database_1.prisma.interaction.create({
                data: {
                    leadId: id,
                    userId: req.user.id,
                    type: 'STATUS_CHANGE',
                    title: 'Status alterado',
                    description: `Status alterado de ${oldStatus} para ${status} por ${req.user.name}`,
                },
            });
        }
        return res.json(updatedLead);
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id/status', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
            select: { status: true, name: true }
        });
        if (!lead) {
            return res.status(404).json({
                error: 'Lead não encontrado',
                message: 'O lead solicitado não foi encontrado',
            });
        }
        const oldStatus = lead.status;
        const updatedLead = await database_1.prisma.lead.update({
            where: { id },
            data: {
                status,
                lastInteraction: new Date(),
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        await database_1.prisma.interaction.create({
            data: {
                leadId: id,
                userId: req.user.id,
                type: 'STATUS_CHANGE',
                title: 'Status alterado',
                description: `Status alterado de ${oldStatus} para ${status} por ${req.user.name}${notes ? `. Observações: ${notes}` : ''}`,
            },
        });
        return res.json(updatedLead);
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/interactions', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type, title, description, outcome, nextAction, scheduledAt } = req.body;
        if (!type || !title || !description) {
            return res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Tipo, título e descrição são obrigatórios',
            });
        }
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
        });
        if (!lead) {
            return res.status(404).json({
                error: 'Lead não encontrado',
                message: 'O lead solicitado não foi encontrado',
            });
        }
        const interaction = await database_1.prisma.interaction.create({
            data: {
                leadId: id,
                userId: req.user.id,
                type,
                title,
                description,
                outcome,
                nextAction,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            },
        });
        await database_1.prisma.lead.update({
            where: { id },
            data: {
                lastInteraction: new Date(),
            },
        });
        return res.status(201).json(interaction);
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log('[DEBUG] Iniciando exclusão de lead:', id);
        const lead = await database_1.prisma.lead.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        sales: true,
                        interactions: true,
                    },
                },
            },
        });
        if (!lead) {
            console.log('[DEBUG] Lead não encontrado:', id);
            return res.status(404).json({
                error: 'Lead não encontrado',
                message: 'O lead solicitado não foi encontrado',
            });
        }
        console.log('[DEBUG] Lead encontrado:', lead.name);
        console.log('[DEBUG] Vendas vinculadas:', lead._count.sales);
        console.log('[DEBUG] Interações vinculadas:', lead._count.interactions);
        if (lead._count.sales > 0) {
            console.log('[DEBUG] Lead possui vendas, não pode ser excluído');
            return res.status(409).json({
                error: 'Lead possui vendas',
                message: `Este lead possui ${lead._count.sales} venda(s) vinculada(s) e não pode ser excluído.`,
                canForce: false,
            });
        }
        console.log('[DEBUG] Excluindo lead e interações em transação...');
        await database_1.prisma.$transaction(async (tx) => {
            if (lead._count.interactions > 0) {
                console.log('[DEBUG] Excluindo', lead._count.interactions, 'interações...');
                await tx.interaction.deleteMany({
                    where: { leadId: id },
                });
            }
            console.log('[DEBUG] Excluindo lead...');
            await tx.lead.delete({
                where: { id },
            });
        });
        console.log('[DEBUG] Lead excluído com sucesso!');
        return res.status(200).json({
            message: 'Lead excluído com sucesso',
            leadName: lead.name,
        });
    }
    catch (error) {
        console.error('[DEBUG] Erro na exclusão do lead:', error);
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=lead.routes.js.map