"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { productId, type, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (productId)
            where.productId = productId;
        if (type)
            where.type = type;
        const [movements, total] = await Promise.all([
            database_1.prisma.stockMovement.findMany({
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
            database_1.prisma.stockMovement.count({ where })
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
    }
    catch (error) {
        console.error('Erro ao listar movimentações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { productId, type, quantity, reason, reference } = req.body;
        const userId = req.user?.id;
        if (!productId || !type || !quantity || !reason) {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }
        const product = await database_1.prisma.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        const result = await database_1.prisma.$transaction(async (tx) => {
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
        return res.status(201).json(result);
    }
    catch (error) {
        console.error('Erro ao criar movimentação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/product/:productId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const product = await database_1.prisma.product.findUnique({
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
            database_1.prisma.stockMovement.findMany({
                where: { productId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            database_1.prisma.stockMovement.count({ where: { productId } })
        ]);
        return res.json({
            data: movements,
            product,
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
router.post('/adjust', auth_1.authenticateToken, async (req, res) => {
    try {
        const { productId, newStock, reason } = req.body;
        const userId = req.user?.id;
        if (!productId || newStock === undefined || !reason) {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }
        const product = await database_1.prisma.product.findUnique({
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
        const result = await database_1.prisma.$transaction(async (tx) => {
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
            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: {
                    stock: newStock
                }
            });
            return { movement, product: updatedProduct };
        });
        return res.json(result);
    }
    catch (error) {
        console.error('Erro ao ajustar estoque:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
exports.default = router;
//# sourceMappingURL=stock-movements.js.map