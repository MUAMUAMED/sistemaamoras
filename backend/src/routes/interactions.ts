import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     Interaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         leadId:
 *           type: string
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [CALL, WHATSAPP, EMAIL, MEETING, NOTE, STATUS_CHANGE, SALE, FOLLOW_UP]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         outcome:
 *           type: string
 *         nextAction:
 *           type: string
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lead:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             phone:
 *               type: string
 */

/**
 * @swagger
 * /api/interactions:
 *   get:
 *     summary: Listar interações
 *     tags: [Interações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leadId
 *         schema:
 *           type: string
 *         description: Filtrar por lead
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CALL, WHATSAPP, EMAIL, MEETING, NOTE, STATUS_CHANGE, SALE, FOLLOW_UP]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de interações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 interactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Interaction'
 *                 pagination:
 *                   type: object
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { leadId, type, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (type) where.type = type;

    const [interactions, total] = await Promise.all([
      prisma.interaction.findMany({
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
      prisma.interaction.count({ where })
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
  } catch (error) {
    console.error('Erro ao listar interações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/interactions:
 *   post:
 *     summary: Criar nova interação
 *     tags: [Interações]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadId
 *               - type
 *               - title
 *               - description
 *             properties:
 *               leadId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [CALL, WHATSAPP, EMAIL, MEETING, NOTE, STATUS_CHANGE, SALE, FOLLOW_UP]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               outcome:
 *                 type: string
 *               nextAction:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Interação criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Lead não encontrado
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { leadId, type, title, description, outcome, nextAction, scheduledAt } = req.body;
    const userId = req.user?.id;

    // Validar dados obrigatórios
    if (!leadId || !type || !title || !description) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // Verificar se o lead existe
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const interaction = await prisma.interaction.create({
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

    // Atualizar última interação do lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        lastInteraction: new Date()
      }
    });

    res.status(201).json(interaction);
  } catch (error) {
    console.error('Erro ao criar interação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/interactions/{id}:
 *   get:
 *     summary: Buscar interação por ID
 *     tags: [Interações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Interação encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       404:
 *         description: Interação não encontrada
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.interaction.findUnique({
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

    res.json(interaction);
  } catch (error) {
    console.error('Erro ao buscar interação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/interactions/{id}:
 *   put:
 *     summary: Atualizar interação
 *     tags: [Interações]
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
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CALL, WHATSAPP, EMAIL, MEETING, NOTE, STATUS_CHANGE, SALE, FOLLOW_UP]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               outcome:
 *                 type: string
 *               nextAction:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Interação atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       404:
 *         description: Interação não encontrada
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description, outcome, nextAction, scheduledAt } = req.body;

    // Verificar se a interação existe
    const existingInteraction = await prisma.interaction.findUnique({
      where: { id }
    });

    if (!existingInteraction) {
      return res.status(404).json({ error: 'Interação não encontrada' });
    }

    const interaction = await prisma.interaction.update({
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

    res.json(interaction);
  } catch (error) {
    console.error('Erro ao atualizar interação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/interactions/lead/{leadId}:
 *   get:
 *     summary: Obter histórico de interações de um lead
 *     tags: [Interações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Histórico de interações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 interactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Interaction'
 *                 lead:
 *                   type: object
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Lead não encontrado
 */
router.get('/lead/:leadId', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Verificar se o lead existe
    const lead = await prisma.lead.findUnique({
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
      prisma.interaction.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.interaction.count({ where: { leadId } })
    ]);

    res.json({
      interactions,
      lead,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erro ao obter histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/interactions/scheduled:
 *   get:
 *     summary: Obter interações agendadas
 *     tags: [Interações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data específica (YYYY-MM-DD)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar por usuário
 *     responses:
 *       200:
 *         description: Interações agendadas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Interaction'
 */
router.get('/scheduled', authenticateToken, async (req, res) => {
  try {
    const { date, userId } = req.query;

    const where: any = {
      scheduledAt: {
        not: null
      }
    };

    if (date) {
      const startDate = new Date(date as string);
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

    const interactions = await prisma.interaction.findMany({
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

    res.json(interactions);
  } catch (error) {
    console.error('Erro ao obter interações agendadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 