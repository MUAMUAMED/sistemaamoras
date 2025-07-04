import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         chatwootUrl:
 *           type: string
 *         chatwootToken:
 *           type: string
 *         n8nWebhookUrl:
 *           type: string
 *         paymentGateway:
 *           type: string
 *         gatewayConfig:
 *           type: object
 *         companyName:
 *           type: string
 *         companyPhone:
 *           type: string
 *         companyEmail:
 *           type: string
 *         companyAddress:
 *           type: string
 *         saleNumberPrefix:
 *           type: string
 *         nextSaleNumber:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/system-config:
 *   get:
 *     summary: Obter configurações do sistema
 *     tags: [Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configurações do sistema
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemConfig'
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let config = await prisma.systemConfig.findFirst();

    // Se não existir configuração, criar uma padrão
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          companyName: 'Amoras Capital',
          saleNumberPrefix: 'AC',
          nextSaleNumber: 1
        }
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/system-config:
 *   put:
 *     summary: Atualizar configurações do sistema
 *     tags: [Sistema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatwootUrl:
 *                 type: string
 *               chatwootToken:
 *                 type: string
 *               n8nWebhookUrl:
 *                 type: string
 *               paymentGateway:
 *                 type: string
 *               gatewayConfig:
 *                 type: object
 *               companyName:
 *                 type: string
 *               companyPhone:
 *                 type: string
 *               companyEmail:
 *                 type: string
 *               companyAddress:
 *                 type: string
 *               saleNumberPrefix:
 *                 type: string
 *               nextSaleNumber:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Configurações atualizadas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemConfig'
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      chatwootUrl,
      chatwootToken,
      n8nWebhookUrl,
      paymentGateway,
      gatewayConfig,
      companyName,
      companyPhone,
      companyEmail,
      companyAddress,
      saleNumberPrefix,
      nextSaleNumber
    } = req.body;

    // Buscar configuração existente
    let config = await prisma.systemConfig.findFirst();

    if (!config) {
      // Criar nova configuração
      config = await prisma.systemConfig.create({
        data: {
          chatwootUrl,
          chatwootToken,
          n8nWebhookUrl,
          paymentGateway,
          gatewayConfig,
          companyName: companyName || 'Amoras Capital',
          companyPhone,
          companyEmail,
          companyAddress,
          saleNumberPrefix: saleNumberPrefix || 'AC',
          nextSaleNumber: nextSaleNumber || 1
        }
      });
    } else {
      // Atualizar configuração existente
      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          ...(chatwootUrl !== undefined && { chatwootUrl }),
          ...(chatwootToken !== undefined && { chatwootToken }),
          ...(n8nWebhookUrl !== undefined && { n8nWebhookUrl }),
          ...(paymentGateway !== undefined && { paymentGateway }),
          ...(gatewayConfig !== undefined && { gatewayConfig }),
          ...(companyName !== undefined && { companyName }),
          ...(companyPhone !== undefined && { companyPhone }),
          ...(companyEmail !== undefined && { companyEmail }),
          ...(companyAddress !== undefined && { companyAddress }),
          ...(saleNumberPrefix !== undefined && { saleNumberPrefix }),
          ...(nextSaleNumber !== undefined && { nextSaleNumber })
        }
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/system-config/next-sale-number:
 *   post:
 *     summary: Obter próximo número de venda
 *     tags: [Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Próximo número de venda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 saleNumber:
 *                   type: string
 *                 nextNumber:
 *                   type: integer
 */
router.post('/next-sale-number', authenticateToken, async (req, res) => {
  try {
    let config = await prisma.systemConfig.findFirst();

    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          companyName: 'Amoras Capital',
          saleNumberPrefix: 'AC',
          nextSaleNumber: 1
        }
      });
    }

    const saleNumber = `${config.saleNumberPrefix}${config.nextSaleNumber.toString().padStart(4, '0')}`;

    // Incrementar próximo número
    await prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        nextSaleNumber: { increment: 1 }
      }
    });

    res.json({
      saleNumber,
      nextNumber: config.nextSaleNumber + 1
    });
  } catch (error) {
    console.error('Erro ao obter próximo número de venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 