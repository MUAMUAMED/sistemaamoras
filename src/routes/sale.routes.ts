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
      data: sales,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    return next(error);
  }
  return;
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

    return res.json(sale);
  } catch (error) {
    return next(error);
  }
  return;
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
    console.log('🛒 [DEBUG] Iniciando criação de venda...');
    console.log('🛒 [DEBUG] Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const { leadId, items, paymentMethod, notes, leadName, leadPhone } = req.body;

    // Validações básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('❌ [DEBUG] Erro: Itens obrigatórios não fornecidos');
      return res.status(400).json({
        error: 'Itens obrigatórios',
        message: 'Pelo menos um item deve ser informado',
      });
    }

    if (!paymentMethod) {
      console.log('❌ [DEBUG] Erro: Método de pagamento não fornecido');
      return res.status(400).json({
        error: 'Método de pagamento obrigatório',
        message: 'Informe o método de pagamento',
      });
    }

    console.log('✅ [DEBUG] Validações básicas passaram');

    // Validar leadId se fornecido
    let validatedLeadId: string | null = null;
    if (leadId) {
      console.log('🔍 [DEBUG] Validando leadId:', leadId);
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });
      if (!lead) {
        console.log('❌ [DEBUG] Lead não encontrado:', leadId);
        return res.status(400).json({
          error: 'Lead inválido',
          message: 'O lead informado não foi encontrado',
        });
      }
      validatedLeadId = leadId;
      console.log('✅ [DEBUG] Lead validado:', lead.name);
    }

    // Verificar se produtos existem e têm estoque
    const productIds = items.map(item => item.productId);
    console.log('🔍 [DEBUG] Produtos solicitados:', productIds);
    
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
    });

    console.log('📦 [DEBUG] Produtos encontrados:', products.length, 'de', productIds.length);

    if (products.length !== productIds.length) {
      console.log('❌ [DEBUG] Produtos não encontrados');
      return res.status(400).json({
        error: 'Produtos inválidos',
        message: 'Um ou mais produtos não foram encontrados',
      });
    }

    // Verificar estoque
    console.log('📊 [DEBUG] Verificando estoque...');
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      console.log(`📦 [DEBUG] ${product.name}: Estoque ${product.stock}, Solicitado ${item.quantity}`);
      if (product.stock < item.quantity) {
        console.log(`❌ [DEBUG] Estoque insuficiente para ${product.name}`);
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
      
      console.log(`💰 [DEBUG] ${product.name}: ${item.quantity}x R$ ${product.price} = R$ ${itemTotal}`);
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        total: itemTotal,
      };
    });

    console.log(`💰 [DEBUG] Total da venda: R$ ${total}`);

    // Gerar número da venda
    const saleNumber = `V${Date.now()}`;
    console.log('🆔 [DEBUG] Número da venda:', saleNumber);

    // Criar venda
    console.log('💾 [DEBUG] Criando venda no banco...');
    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        leadId: validatedLeadId,
        leadName: leadName || null,
        leadPhone: leadPhone || null,
        sellerId: req.user!.id,
        subtotal: total,
        total,
        status: 'PAID',
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

    console.log('✅ [DEBUG] Venda criada com sucesso:', sale.id);

    // Processar pagamento para atualizar estoque e movimentações
    console.log('📦 [DEBUG] Processando pagamento para atualizar estoque...');
    await processSalePayment(sale.id);

    // Nota: Todas as vendas são criadas com status PAID (concluídas)
    // Podem ser excluídas mesmo sendo concluídas
    console.log('📋 [DEBUG] Venda criada com status PAID e estoque atualizado');

    // Log de sucesso
    console.log('🎉 [DEBUG] Venda finalizada com sucesso!');
    console.log('📋 [DEBUG] Resumo da venda:');
    console.log(`   - ID: ${sale.id}`);
    console.log(`   - Número: ${sale.saleNumber}`);
    console.log(`   - Total: R$ ${sale.total}`);
    console.log(`   - Status: ${sale.status}`);
    console.log(`   - Pagamento: ${sale.paymentMethod}`);
    console.log(`   - Itens: ${sale.items.length}`);

    return res.status(201).json(sale);
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro na criação da venda:', error);
    console.error('❌ [DEBUG] Stack trace:', error.stack);
    console.error('❌ [DEBUG] Error name:', error.name);
    console.error('❌ [DEBUG] Error code:', error.code);
    console.error('❌ [DEBUG] Error meta:', error.meta);
    return next(error);
  }
  return;
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

    return res.json(updatedSale);
  } catch (error) {
    return next(error);
  }
  return;
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

    return res.json(updatedSale);
  } catch (error) {
    return next(error);
  }
  return;
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
          userId: sale.sellerId,
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

/**
 * @swagger
 * /api/sales/{id}:
 *   delete:
 *     summary: Excluir venda
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
 *         description: Venda excluída com sucesso
 *       404:
 *         description: Venda não encontrada
 *       400:
 *         description: Venda não pode ser excluída
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    console.log('🗑️ [DEBUG] Iniciando exclusão de venda...');
    const { id } = req.params;
    console.log(`🗑️ [DEBUG] ID da venda: ${id}`);

    // Buscar a venda com todos os dados relacionados
    const sale = await prisma.sale.findUnique({
      where: { id },
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
      console.log('❌ [DEBUG] Venda não encontrada');
      return res.status(404).json({
        error: 'Venda não encontrada',
        message: 'A venda solicitada não foi encontrada',
      });
    }

    console.log(`🗑️ [DEBUG] Venda encontrada: ${sale.saleNumber} (${sale.status})`);

    // Verificar se a venda pode ser excluída
    // Permitir exclusão de vendas PAID e PENDING
    if (sale.status === 'PAID') {
      console.log('✅ [DEBUG] Venda concluída pode ser excluída');
    } else if (sale.status === 'PENDING') {
      console.log('✅ [DEBUG] Venda pendente pode ser excluída');
    } else {
      console.log('❌ [DEBUG] Venda com status inválido para exclusão:', sale.status);
      return res.status(400).json({
        error: 'Venda não pode ser excluída',
        message: 'Apenas vendas concluídas ou pendentes podem ser excluídas.',
      });
    }

    console.log('🗑️ [DEBUG] Iniciando exclusão em transação...');

    // Excluir venda e itens relacionados em uma transação
    await prisma.$transaction(async (tx) => {
      // 1. Excluir itens da venda
      console.log('🗑️ [DEBUG] Excluindo itens da venda...');
      await tx.saleItem.deleteMany({
        where: { saleId: id },
      });

      // 2. Excluir movimentações de estoque relacionadas
      console.log('🗑️ [DEBUG] Excluindo movimentações de estoque...');
      await tx.stockMovement.deleteMany({
        where: {
          reason: { contains: `Venda ${id}` },
        },
      });

      // 3. Excluir a venda
      console.log('🗑️ [DEBUG] Excluindo venda...');
      await tx.sale.delete({
        where: { id },
      });
    });

    console.log('✅ [DEBUG] Venda excluída com sucesso!');
    console.log(`📋 [DEBUG] Resumo da exclusão:`);
    console.log(`   - ID: ${id}`);
    console.log(`   - Número: ${sale.saleNumber}`);
    console.log(`   - Status: ${sale.status}`);
    console.log(`   - Total: R$ ${sale.total}`);
    console.log(`   - Itens: ${sale.items.length}`);

    return res.status(200).json({
      message: 'Venda excluída com sucesso',
      saleNumber: sale.saleNumber,
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro na exclusão da venda:', error);
    return next(error);
  }
});

/**
 * @swagger
 * /api/sales/{id}/status:
 *   patch:
 *     summary: Atualizar status da venda
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, PAID, CANCELLED, REFUNDED]
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       404:
 *         description: Venda não encontrada
 */
router.patch('/:id/status', authenticateToken, async (req, res, next) => {
  try {
    console.log('🔄 [DEBUG] Atualizando status da venda...');
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 [DEBUG] ID da venda: ${id}`);
    console.log(`🔄 [DEBUG] Novo status: ${status}`);

    // Validar status
    const statusValidos = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];
    if (!statusValidos.includes(status)) {
      console.log('❌ [DEBUG] Status inválido:', status);
      return res.status(400).json({
        error: 'Status inválido',
        message: 'Status deve ser PENDING, PAID, CANCELLED ou REFUNDED',
      });
    }

    // Buscar a venda
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
            product: true,
          },
        },
      },
    });

    if (!sale) {
      console.log('❌ [DEBUG] Venda não encontrada');
      return res.status(404).json({
        error: 'Venda não encontrada',
        message: 'A venda solicitada não foi encontrada',
      });
    }

    console.log(`🔄 [DEBUG] Venda encontrada: ${sale.saleNumber} (${sale.status} -> ${status})`);

    // Atualizar status
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: { status },
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

    console.log('✅ [DEBUG] Status atualizado com sucesso!');
    console.log(`📋 [DEBUG] Venda #${updatedSale.saleNumber}: ${sale.status} -> ${updatedSale.status}`);

    return res.json(updatedSale);
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao atualizar status:', error);
    return next(error);
  }
});

export default router; 