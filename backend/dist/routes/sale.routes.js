"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { status, sellerId, startDate, endDate, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = {};
        if (status) {
            where.status = status;
        }
        if (sellerId) {
            where.sellerId = sellerId;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        const [sales, total] = await Promise.all([
            database_1.prisma.sale.findMany({
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
            database_1.prisma.sale.count({ where }),
        ]);
        res.json({
            data: sales,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        return next(error);
    }
    return;
});
router.get('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sale = await database_1.prisma.sale.findUnique({
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
    }
    catch (error) {
        return next(error);
    }
    return;
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        console.log('🛒 [DEBUG] Iniciando criação de venda...');
        console.log('🛒 [DEBUG] Dados recebidos:', JSON.stringify(req.body, null, 2));
        const { leadId, items, paymentMethod, notes, leadName, leadPhone } = req.body;
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
        let validatedLeadId = null;
        if (leadId) {
            console.log('🔍 [DEBUG] Validando leadId:', leadId);
            const lead = await database_1.prisma.lead.findUnique({
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
        const productIds = items.map(item => item.productId);
        console.log('🔍 [DEBUG] Produtos solicitados:', productIds);
        const products = await database_1.prisma.product.findMany({
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
        console.log('📊 [DEBUG] Verificando estoque...');
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product)
                continue;
            console.log(`📦 [DEBUG] ${product.name}: Estoque ${product.stock}, Solicitado ${item.quantity}`);
            if (product.stock < item.quantity) {
                console.log(`❌ [DEBUG] Estoque insuficiente para ${product.name}`);
                return res.status(400).json({
                    error: 'Estoque insuficiente',
                    message: `Produto ${product.name} não tem estoque suficiente. Disponível: ${product.stock}`,
                });
            }
        }
        let total = 0;
        const saleItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
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
        const saleNumber = `V${Date.now()}`;
        console.log('🆔 [DEBUG] Número da venda:', saleNumber);
        console.log('💾 [DEBUG] Criando venda no banco...');
        const sale = await database_1.prisma.sale.create({
            data: {
                saleNumber,
                leadId: validatedLeadId,
                leadName: leadName || null,
                leadPhone: leadPhone || null,
                sellerId: req.user.id,
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
        console.log('📦 [DEBUG] Processando pagamento para atualizar estoque...');
        await processSalePayment(sale.id);
        console.log('📋 [DEBUG] Venda criada com status PAID e estoque atualizado');
        console.log('🎉 [DEBUG] Venda finalizada com sucesso!');
        console.log('📋 [DEBUG] Resumo da venda:');
        console.log(`   - ID: ${sale.id}`);
        console.log(`   - Número: ${sale.saleNumber}`);
        console.log(`   - Total: R$ ${sale.total}`);
        console.log(`   - Status: ${sale.status}`);
        console.log(`   - Pagamento: ${sale.paymentMethod}`);
        console.log(`   - Itens: ${sale.items.length}`);
        return res.status(201).json(sale);
    }
    catch (error) {
        console.error('❌ [DEBUG] Erro na criação da venda:', error);
        console.error('❌ [DEBUG] Stack trace:', error.stack);
        console.error('❌ [DEBUG] Error name:', error.name);
        console.error('❌ [DEBUG] Error code:', error.code);
        console.error('❌ [DEBUG] Error meta:', error.meta);
        return next(error);
    }
    return;
});
router.post('/:id/payment', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { paymentReference, paymentUrl } = req.body;
        const sale = await database_1.prisma.sale.findUnique({
            where: { id },
        });
        if (!sale) {
            return res.status(404).json({
                error: 'Venda não encontrada',
                message: 'A venda solicitada não foi encontrada',
            });
        }
        const updatedSale = await database_1.prisma.sale.update({
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
    }
    catch (error) {
        return next(error);
    }
    return;
});
router.patch('/:id/confirm', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sale = await database_1.prisma.sale.findUnique({
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
        await processSalePayment(id);
        const updatedSale = await database_1.prisma.sale.findUnique({
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
    }
    catch (error) {
        return next(error);
    }
    return;
});
async function processSalePayment(saleId) {
    const sale = await database_1.prisma.sale.findUnique({
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
    await database_1.prisma.sale.update({
        where: { id: saleId },
        data: { status: 'PAID' },
    });
    for (const item of sale.items) {
        await Promise.all([
            database_1.prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            }),
            database_1.prisma.stockMovement.create({
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
    if (sale.lead) {
        await database_1.prisma.lead.update({
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
        await database_1.prisma.interaction.create({
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
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        console.log('🗑️ [DEBUG] Iniciando exclusão de venda...');
        const { id } = req.params;
        console.log(`🗑️ [DEBUG] ID da venda: ${id}`);
        const sale = await database_1.prisma.sale.findUnique({
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
        if (sale.status === 'PAID') {
            console.log('✅ [DEBUG] Venda concluída pode ser excluída');
        }
        else if (sale.status === 'PENDING') {
            console.log('✅ [DEBUG] Venda pendente pode ser excluída');
        }
        else {
            console.log('❌ [DEBUG] Venda com status inválido para exclusão:', sale.status);
            return res.status(400).json({
                error: 'Venda não pode ser excluída',
                message: 'Apenas vendas concluídas ou pendentes podem ser excluídas.',
            });
        }
        console.log('🗑️ [DEBUG] Iniciando exclusão em transação...');
        await database_1.prisma.$transaction(async (tx) => {
            console.log('🗑️ [DEBUG] Excluindo itens da venda...');
            await tx.saleItem.deleteMany({
                where: { saleId: id },
            });
            console.log('🗑️ [DEBUG] Excluindo movimentações de estoque...');
            await tx.stockMovement.deleteMany({
                where: {
                    reason: { contains: `Venda ${id}` },
                },
            });
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
    }
    catch (error) {
        console.error('❌ [DEBUG] Erro na exclusão da venda:', error);
        return next(error);
    }
});
router.patch('/:id/status', auth_1.authenticateToken, async (req, res, next) => {
    try {
        console.log('🔄 [DEBUG] Atualizando status da venda...');
        const { id } = req.params;
        const { status } = req.body;
        console.log(`🔄 [DEBUG] ID da venda: ${id}`);
        console.log(`🔄 [DEBUG] Novo status: ${status}`);
        const statusValidos = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];
        if (!statusValidos.includes(status)) {
            console.log('❌ [DEBUG] Status inválido:', status);
            return res.status(400).json({
                error: 'Status inválido',
                message: 'Status deve ser PENDING, PAID, CANCELLED ou REFUNDED',
            });
        }
        const sale = await database_1.prisma.sale.findUnique({
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
        const updatedSale = await database_1.prisma.sale.update({
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
    }
    catch (error) {
        console.error('❌ [DEBUG] Erro ao atualizar status:', error);
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=sale.routes.js.map