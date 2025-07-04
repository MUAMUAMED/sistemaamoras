import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import * as Joi from 'joi';

const router = Router();
const prisma = new PrismaClient();

// Schema de validação para leads
const leadSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  email: Joi.string().email().optional(),
  channel: Joi.string().max(50).optional(),
  source: Joi.string().max(100).optional(),
  assignedToId: Joi.string().uuid().optional(),
  notes: Joi.string().max(1000).optional(),
  leadScore: Joi.number().min(0).max(100).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
});

// Schema para atualização de status
const statusUpdateSchema = Joi.object({
  status: Joi.string().valid(
    'NEW_LEAD', 
    'IN_SERVICE', 
    'INTERESTED', 
    'NEGOTIATING', 
    'SALE_COMPLETED', 
    'COLD_LEAD', 
    'NO_RESPONSE', 
    'REACTIVATE'
  ).required(),
  notes: Joi.string().max(500).optional(),
});

// Schema para interações
const interactionSchema = Joi.object({
  type: Joi.string().valid('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'NOTE', 'TASK', 'STATUS_CHANGE').required(),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(5).max(1000).required(),
  outcome: Joi.string().max(500).optional(),
  nextAction: Joi.string().max(500).optional(),
  scheduledAt: Joi.date().optional(),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Lead:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - phone
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         status:
 *           type: string
 *           enum: [NEW_LEAD, IN_SERVICE, INTERESTED, NEGOTIATING, SALE_COMPLETED, COLD_LEAD, NO_RESPONSE, REACTIVATE]
 *         channel:
 *           type: string
 *         source:
 *           type: string
 *         assignedToId:
 *           type: string
 *           format: uuid
 *         leadScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         notes:
 *           type: string
 *         lastInteraction:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: Listar leads com filtros
 *     tags: [CRM - Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Itens por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NEW_LEAD, IN_SERVICE, INTERESTED, NEGOTIATING, SALE_COMPLETED, COLD_LEAD, NO_RESPONSE, REACTIVATE]
 *         description: Filtrar por status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome, email ou telefone
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por responsável
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *         description: Filtrar por canal
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Score mínimo
 *       - in: query
 *         name: maxScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Score máximo
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filtrar por tags (separadas por vírgula)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastInteraction, leadScore, name]
 *         description: Campo para ordenação
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Direção da ordenação
 *     responses:
 *       200:
 *         description: Lista de leads
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lead'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      assignedTo,
      channel,
      minScore,
      maxScore,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: any = {};

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
        where.leadScore.gte = parseInt(minScore as string);
      }
      if (maxScore !== undefined) {
        where.leadScore.lte = parseInt(maxScore as string);
      }
    }

    if (tags) {
      const tagList = (tags as string).split(',').map(tag => tag.trim());
      where.tags = {
        hasSome: tagList
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }

    // Ordenação
    const orderBy: any = {};
    if (sortBy === 'createdAt' || sortBy === 'lastInteraction' || sortBy === 'leadScore' || sortBy === 'name') {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
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
      prisma.lead.count({ where }),
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
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/leads/pipeline:
 *   get:
 *     summary: Métricas do pipeline de leads
 *     tags: [CRM - Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas do pipeline
 */
router.get('/pipeline', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pipeline = await prisma.lead.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      _avg: {
        leadScore: true,
      },
    });

    const totalLeads = await prisma.lead.count();
    const conversions = await prisma.lead.count({
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
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/leads/dashboard:
 *   get:
 *     summary: Dashboard de leads com métricas
 *     tags: [CRM - Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas do dashboard
 */
router.get('/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      newLeadsToday,
      newLeadsThisWeek,
      newLeadsThisMonth,
      hotLeads,
      coldLeads,
      conversions,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: {
          createdAt: { gte: startOfToday }
        }
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: startOfWeek }
        }
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.lead.count({
        where: {
          leadScore: { gte: 80 }
        }
      }),
      prisma.lead.count({
        where: {
          OR: [
            { status: 'COLD_LEAD' },
            { status: 'NO_RESPONSE' }
          ]
        }
      }),
      prisma.lead.count({
        where: {
          status: 'SALE_COMPLETED'
        }
      }),
    ]);

    const conversionRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;

    // Top performers simples - buscar usuários e contar leads convertidos manualmente
    const topPerformers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
      },
      take: 5
    });

    // Para cada usuário, contar leads convertidos
    const topPerformersWithCounts = await Promise.all(
      topPerformers.map(async (user) => {
        const conversions = await prisma.lead.count({
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
      })
    );

    // Ordenar por conversões
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
  } catch (error) {
    return next(error);
  }
});

// Buscar lead por ID (rota existente atualizada)
router.get('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
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
  } catch (error) {
    return next(error);
  }
});

// Criar novo lead (rota existente atualizada)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      name, 
      phone, 
      email, 
      channel, 
      source,
      assignedToId, 
      notes,
      leadScore = 50,
      tags = [] 
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome e telefone são obrigatórios',
      });
    }

    // Verificar se telefone já existe
    const existingLead = await prisma.lead.findUnique({
      where: { phone },
    });

    if (existingLead) {
      return res.status(409).json({
        error: 'Telefone já existe',
        message: 'Já existe um lead com este telefone',
      });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        email,
        channel: channel || 'Manual',
        source,
        assignedToId: assignedToId || req.user!.id,
        notes,
        leadScore,
        tags
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

    // Criar interação inicial
    await prisma.interaction.create({
      data: {
        leadId: lead.id,
        userId: req.user!.id,
        type: 'NOTE',
        title: 'Lead criado',
        description: `Lead criado manualmente por ${req.user!.name}. Canal: ${channel || 'Manual'}${source ? `, Origem: ${source}` : ''}`,
      },
    });

    return res.status(201).json(lead);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/leads/{id}/score:
 *   put:
 *     summary: Atualizar score do lead
 *     tags: [CRM - Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Score atualizado
 */
router.put('/:id/score', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { score, reason } = req.body;

    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({
        error: 'Score inválido',
        message: 'O score deve estar entre 0 e 100',
      });
    }

    const lead = await prisma.lead.findUnique({
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

    const updatedLead = await prisma.lead.update({
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

    // Registrar mudança de score
    await prisma.interaction.create({
      data: {
        leadId: id,
        userId: req.user!.id,
        type: 'NOTE',
        title: 'Score atualizado',
        description: `Score alterado de ${oldScore} para ${score} por ${req.user!.name}${reason ? `. Motivo: ${reason}` : ''}`,
      },
    });

    return res.json(updatedLead);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/leads/{id}/tags:
 *   put:
 *     summary: Atualizar tags do lead
 *     tags: [CRM - Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tags
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags atualizadas
 */
router.put('/:id/tags', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Tags inválidas',
        message: 'Tags deve ser um array de strings',
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { tags: true, name: true }
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado',
        message: 'O lead solicitado não foi encontrado',
      });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        tags,
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

    // Registrar mudança de tags
    await prisma.interaction.create({
      data: {
        leadId: id,
        userId: req.user!.id,
        type: 'NOTE',
        title: 'Tags atualizadas',
        description: `Tags atualizadas por ${req.user!.name}. Novas tags: ${tags.join(', ')}`,
      },
    });

    return res.json(updatedLead);
  } catch (error) {
    return next(error);
  }
});

// Atualizar lead (rota existente melhorada)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, email, status, assignedToId, notes, source, leadScore, tags } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado',
        message: 'O lead solicitado não foi encontrado',
      });
    }

    // Verificar se o status mudou
    const statusChanged = status && status !== lead.status;
    const oldStatus = lead.status;

    const updatedLead = await prisma.lead.update({
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
        ...(tags && { tags }),
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

    // Registrar mudança de status
    if (statusChanged) {
      await prisma.interaction.create({
        data: {
          leadId: id,
          userId: req.user!.id,
          type: 'STATUS_CHANGE',
          title: 'Status alterado',
          description: `Status alterado de ${oldStatus} para ${status} por ${req.user!.name}`,
        },
      });
    }

    return res.json(updatedLead);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/leads/{id}/status:
 *   put:
 *     summary: Atualizar apenas o status do lead
 *     tags: [CRM - Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [NEW_LEAD, IN_SERVICE, INTERESTED, NEGOTIATING, SALE_COMPLETED, COLD_LEAD, NO_RESPONSE, REACTIVATE]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status atualizado
 */
router.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const lead = await prisma.lead.findUnique({
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

    const updatedLead = await prisma.lead.update({
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

    // Registrar mudança de status
    await prisma.interaction.create({
      data: {
        leadId: id,
        userId: req.user!.id,
        type: 'STATUS_CHANGE',
        title: 'Status alterado',
        description: `Status alterado de ${oldStatus} para ${status} por ${req.user!.name}${notes ? `. Observações: ${notes}` : ''}`,
      },
    });

    return res.json(updatedLead);
  } catch (error) {
    return next(error);
  }
});

// Adicionar interação (rota existente melhorada)
router.post('/:id/interactions', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { type, title, description, outcome, nextAction, scheduledAt } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Tipo, título e descrição são obrigatórios',
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(404).json({
        error: 'Lead não encontrado',
        message: 'O lead solicitado não foi encontrado',
      });
    }

    const interaction = await prisma.interaction.create({
      data: {
        leadId: id,
        userId: req.user!.id,
        type,
        title,
        description,
        outcome,
        nextAction,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    // Atualizar última interação
    await prisma.lead.update({
      where: { id },
      data: {
        lastInteraction: new Date(),
      },
    });

    return res.status(201).json(interaction);
  } catch (error) {
    return next(error);
  }
});

export default router; 