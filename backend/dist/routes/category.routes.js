"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const categories = await database_1.prisma.category.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        });
        return res.json(categories);
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { name, code, description } = req.body;
        if (!name || !code) {
            return res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Nome e código são obrigatórios',
            });
        }
        if (!/^\d{1,2}$/.test(code)) {
            return res.status(400).json({
                error: 'Código inválido',
                message: 'O código deve ter 1 ou 2 dígitos numéricos (ex: 10, 50)',
            });
        }
        const existingCategory = await database_1.prisma.category.findFirst({
            where: {
                OR: [
                    { name },
                    { code }
                ]
            }
        });
        if (existingCategory) {
            return res.status(409).json({
                error: 'Categoria já existe',
                message: existingCategory.name === name
                    ? 'Já existe uma categoria com este nome'
                    : 'Já existe uma categoria com este código'
            });
        }
        const category = await database_1.prisma.category.create({
            data: { name, code, description },
        });
        return res.status(201).json(category);
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { force } = req.query;
        const category = await database_1.prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                        subcategories: true
                    }
                }
            }
        });
        if (!category) {
            return res.status(404).json({
                error: 'Categoria não encontrada',
                message: 'A categoria solicitada não foi encontrada'
            });
        }
        const hasProducts = category._count.products > 0;
        const hasSubcategories = category._count.subcategories > 0;
        if ((hasProducts || hasSubcategories) && force !== 'true') {
            let message = 'Esta categoria não pode ser excluída porque possui:';
            const dependencies = [];
            if (hasProducts) {
                dependencies.push(`${category._count.products} produto(s)`);
            }
            if (hasSubcategories) {
                dependencies.push(`${category._count.subcategories} subcategoria(s)`);
            }
            message += ` ${dependencies.join(' e ')}.`;
            return res.status(409).json({
                error: 'Categoria em uso',
                message: message,
                canForce: true,
                details: {
                    products: category._count.products,
                    subcategories: category._count.subcategories
                }
            });
        }
        if (force === 'true') {
            await database_1.prisma.$transaction(async (tx) => {
                if (hasProducts) {
                    await tx.product.deleteMany({
                        where: { categoryId: id }
                    });
                }
                if (hasSubcategories) {
                    await tx.subcategory.deleteMany({
                        where: { categoryId: id }
                    });
                }
                await tx.category.delete({
                    where: { id }
                });
            });
            return res.status(200).json({
                message: 'Categoria e dependências excluídas com sucesso',
                categoryName: category.name,
                deletedItems: {
                    products: category._count.products,
                    subcategories: category._count.subcategories
                }
            });
        }
        await database_1.prisma.category.delete({
            where: { id }
        });
        return res.status(200).json({
            message: 'Categoria excluída com sucesso',
            categoryName: category.name
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=category.routes.js.map