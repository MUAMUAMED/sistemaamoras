import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     StockMovement:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         productId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [ENTRY, EXIT, ADJUSTMENT, SALE, RETURN, LOSS, TRANSFER]
 *         quantity:
 *           type: integer
 *         reason:
 *           type: string
 *         reference:
 *           type: string
 *         userId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         product:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             barcode:
 *               type: string
 */

/**
 * @swagger
 * /api/stock-movements:
 *   get:
 *     summary: Listar movimentações de estoque
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filtrar por produto
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ENTRY, EXIT, ADJUSTMENT, SALE, RETURN, LOSS, TRANSFER]
 *         description: Filtrar por tipo de movimentação
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Limite por página
 *     responses:
 *       200:
 *         description: Lista de movimentações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 movements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StockMovement'
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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { productId, type, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              barcode: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.stockMovement.count({ where })
    ]);

    res.json({
      data: movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/stock-movements:
 *   post:
 *     summary: Criar nova movimentação de estoque
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - type
 *               - quantity
 *               - reason
 *             properties:
 *               productId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ENTRY, EXIT, ADJUSTMENT, SALE, RETURN, LOSS, TRANSFER]
 *               quantity:
 *                 type: integer
 *               reason:
 *                 type: string
 *               reference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movimentação criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockMovement'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Produto não encontrado
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { productId, type, quantity, reason, reference } = req.body;
    const userId = (req as any).user?.id;

    // Validar dados obrigatórios
    if (!productId || !type || !quantity || !reason) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Iniciar transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar movimentação
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          reason,
          reference,
          userId
        },
        include: {
          product: {
            select: {
              name: true,
              barcode: true
            }
          }
        }
      });

      // Atualizar estoque do produto
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: {
            increment: quantity
          }
        }
      });

      return movement;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/stock-movements/product/{productId}:
 *   get:
 *     summary: Obter histórico de movimentações de um produto
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *         description: Histórico de movimentações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 movements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StockMovement'
 *                 product:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     barcode:
 *                       type: string
 *                     stock:
 *                       type: integer
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Produto não encontrado
 */
router.get('/product/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        name: true,
        barcode: true,
        stock: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.stockMovement.count({ where: { productId } })
    ]);

    res.json({
      data: movements,
      product,
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
 * /api/stock-movements/adjust:
 *   post:
 *     summary: Ajustar estoque de produto
 *     tags: [Estoque]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - newStock
 *               - reason
 *             properties:
 *               productId:
 *                 type: string
 *               newStock:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estoque ajustado
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Produto não encontrado
 */
router.post('/adjust', authenticateToken, async (req, res) => {
  try {
    const { productId, newStock, reason } = req.body;
    const userId = (req as any).user?.id;

    // Validar dados obrigatórios
    if (!productId || newStock === undefined || !reason) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const currentStock = product.stock;
    const difference = newStock - currentStock;

    if (difference === 0) {
      return res.status(400).json({ error: 'Novo estoque é igual ao atual' });
    }

    // Iniciar transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar movimentação
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: 'ADJUSTMENT',
          quantity: difference,
          reason: `Ajuste de estoque: ${reason}`,
          userId
        },
        include: {
          product: {
            select: {
              name: true,
              barcode: true
            }
          }
        }
      });

      // Atualizar estoque do produto
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stock: newStock
        }
      });

      return { movement, product: updatedProduct };
    });

    res.json(result);
  } catch (error) {
    console.error('Erro ao ajustar estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 