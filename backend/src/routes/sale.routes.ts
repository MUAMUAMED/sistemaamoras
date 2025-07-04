import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Listar vendas
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, CANCELED, REFUNDED]
 *         description: Filtrar por status
 *       - in: query
 *         name: sellerId
 *         schema:
 *           type: string
 *         description: Filtrar por vendedor
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final
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
 *         description: Lista de vendas
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, sellerId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  category: true,
                  pattern: true,
                  size: true,
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      sales,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     summary: Buscar venda por ID
 *     tags: [Sales]
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
 *         description: Venda encontrada
 *       404:
 *         description: Venda não encontrada
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        lead: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                pattern: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({
        error: 'Venda não encontrada',
        message: 'A venda solicitada não foi encontrada',
      });
    }

    res.json(sale);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Criar nova venda
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - paymentMethod
 *             properties:
 *               leadId:
 *                 type: string
 *                 description: ID do cliente (opcional)
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, PIX, CREDIT_CARD, DEBIT_CARD, BANK_SLIP]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Venda criada com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { leadId, items, paymentMethod, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Itens obrigatórios',
        message: 'Pelo menos um item deve ser informado',
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        error: 'Método de pagamento obrigatório',
        message: 'Informe o método de pagamento',
      });
    }

    // Validar leadId se fornecido
    let validatedLeadId: string | null = null;
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });
      if (!lead) {
        return res.status(400).json({
          error: 'Lead inválido',
          message: 'O lead informado não foi encontrado',
        });
      }
      validatedLeadId = leadId;
    }

    // Verificar se produtos existem e têm estoque
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        error: 'Produtos inválidos',
        message: 'Um ou mais produtos não foram encontrados',
      });
    }

    // Verificar estoque
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: 'Estoque insuficiente',
          message: `Produto ${product.name} não tem estoque suficiente. Disponível: ${product.stock}`,
        });
      }
    }

    // Calcular total
    let total = 0;
    const saleItems = items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const itemTotal = product.price * item.quantity;
      total += itemTotal;
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        total: itemTotal,
      };
    });

    // Gerar número da venda
    const saleNumber = `V${Date.now()}`;

    // Criar venda
    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        leadId: validatedLeadId,
        sellerId: req.user!.id,
        subtotal: total,
        total,
        status: paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
        paymentMethod,
        notes,
        items: {
          create: saleItems,
        },
      },
      include: {
        lead: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                pattern: true,
              },
            },
          },
        },
      },
    });

    // Se pagamento foi em dinheiro, processar imediatamente
    if (paymentMethod === 'CASH') {
      await processSalePayment(sale.id);
    }

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/sales/{id}/payment:
 *   post:
 *     summary: Processar pagamento da venda
 *     tags: [Sales]
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
 *               paymentReference:
 *                 type: string
 *                 description: Referência do pagamento (ID do gateway)
 *               paymentUrl:
 *                 type: string
 *                 description: URL de pagamento
 *     responses:
 *       200:
 *         description: Pagamento processado com sucesso
 *       404:
 *         description: Venda não encontrada
 */
router.post('/:id/payment', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentReference, paymentUrl } = req.body;

    const sale = await prisma.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      return res.status(404).json({
        error: 'Venda não encontrada',
        message: 'A venda solicitada não foi encontrada',
      });
    }

    // Atualizar venda com dados do pagamento
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        paymentReference,
        paymentUrl,
      },
      include: {
        lead: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(updatedSale);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/sales/{id}/confirm:
 *   patch:
 *     summary: Confirmar pagamento da venda
 *     tags: [Sales]
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
 *         description: Pagamento confirmado com sucesso
 *       404:
 *         description: Venda não encontrada
 */
router.patch('/:id/confirm', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({
        error: 'Venda não encontrada',
        message: 'A venda solicitada não foi encontrada',
      });
    }

    if (sale.status === 'PAID') {
      return res.status(400).json({
        error: 'Venda já confirmada',
        message: 'Esta venda já foi confirmada',
      });
    }

    // Processar pagamento
    await processSalePayment(id);

    const updatedSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        lead: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(updatedSale);
  } catch (error) {
    next(error);
  }
});

// Função auxiliar para processar pagamento
async function processSalePayment(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      lead: true,
    },
  });

  if (!sale) {
    throw new Error('Venda não encontrada');
  }

  // Atualizar status da venda
  await prisma.sale.update({
    where: { id: saleId },
    data: { status: 'PAID' },
  });

  // Atualizar estoque dos produtos
  for (const item of sale.items) {
    await Promise.all([
      // Reduzir estoque
      prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      }),
      // Registrar movimentação de estoque
      prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'EXIT',
          quantity: item.quantity,
          reason: `Venda ${sale.id}`,
        },
      }),
    ]);
  }

  // Atualizar dados do lead se existe
  if (sale.lead) {
    await prisma.lead.update({
      where: { id: sale.lead.id },
      data: {
        status: 'SALE_COMPLETED',
        totalPurchases: {
          increment: sale.total,
        },
        purchaseCount: {
          increment: 1,
        },
        lastInteraction: new Date(),
      },
    });

    // Registrar interação
    await prisma.interaction.create({
      data: {
        leadId: sale.lead.id,
        userId: sale.sellerId,
        type: 'NOTE',
        title: 'Venda Realizada',
        description: `Venda realizada no valor de R$ ${sale.total.toFixed(2)}`,
      },
    });
  }
}

export default router; 