"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { categoryId, active } = req.query;
        const where = {};
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (active !== undefined) {
            where.active = active === 'true';
        }
        else {
            where.active = true;
        }
        const subcategories = await database_1.prisma.subcategory.findMany({
            where,
            include: {
                category: true,
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
            orderBy: [
                { category: { name: 'asc' } },
                { name: 'asc' },
            ],
        });
        res.json(subcategories);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const subcategory = await database_1.prisma.subcategory.findUnique({
            where: { id },
            include: {
                category: true,
                products: {
                    include: {
                        category: true,
                        pattern: true,
                    },
                },
            },
        });
        if (!subcategory) {
            return res.status(404).json({
                error: 'Subcategoria não encontrada',
                message: 'A subcategoria solicitada não foi encontrada',
            });
        }
        return res.json(subcategory);
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { name, code, description, categoryId } = req.body;
        if (!name || !code || !categoryId) {
            return res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Nome, código e categoria são obrigatórios',
            });
        }
        if (!/^\d{2}$/.test(code)) {
            return res.status(400).json({
                error: 'Código inválido',
                message: 'O código deve ter exatamente 2 dígitos numéricos',
            });
        }
        const category = await database_1.prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return res.status(400).json({
                error: 'Categoria não encontrada',
                message: 'A categoria especificada não foi encontrada',
            });
        }
        const existingName = await database_1.prisma.subcategory.findUnique({
            where: {
                categoryId_name: {
                    categoryId,
                    name,
                },
            },
        });
        if (existingName) {
            return res.status(400).json({
                error: 'Nome já existe',
                message: `Já existe uma subcategoria com o nome '${name}' nesta categoria`,
            });
        }
        const existingCode = await database_1.prisma.subcategory.findUnique({
            where: {
                categoryId_code: {
                    categoryId,
                    code,
                },
            },
        });
        if (existingCode) {
            return res.status(400).json({
                error: 'Código já existe',
                message: `Já existe uma subcategoria com o código '${code}' nesta categoria`,
            });
        }
        const subcategory = await database_1.prisma.subcategory.create({
            data: {
                name,
                code,
                description,
                categoryId,
            },
            include: {
                category: true,
            },
        });
        return res.status(201).json(subcategory);
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, code, description, active } = req.body;
        const existingSubcategory = await database_1.prisma.subcategory.findUnique({
            where: { id },
        });
        if (!existingSubcategory) {
            return res.status(404).json({
                error: 'Subcategoria não encontrada',
                message: 'A subcategoria solicitada não foi encontrada',
            });
        }
        if (code && !/^\d{2}$/.test(code)) {
            return res.status(400).json({
                error: 'Código inválido',
                message: 'O código deve ter exatamente 2 dígitos numéricos',
            });
        }
        const updateData = {};
        if (name && name !== existingSubcategory.name) {
            const existingName = await database_1.prisma.subcategory.findUnique({
                where: {
                    categoryId_name: {
                        categoryId: existingSubcategory.categoryId,
                        name,
                    },
                },
            });
            if (existingName) {
                return res.status(400).json({
                    error: 'Nome já existe',
                    message: `Já existe uma subcategoria com o nome '${name}' nesta categoria`,
                });
            }
            updateData.name = name;
        }
        if (code && code !== existingSubcategory.code) {
            const existingCode = await database_1.prisma.subcategory.findUnique({
                where: {
                    categoryId_code: {
                        categoryId: existingSubcategory.categoryId,
                        code,
                    },
                },
            });
            if (existingCode) {
                return res.status(400).json({
                    error: 'Código já existe',
                    message: `Já existe uma subcategoria com o código '${code}' nesta categoria`,
                });
            }
            updateData.code = code;
        }
        if (description !== undefined)
            updateData.description = description;
        if (active !== undefined)
            updateData.active = active;
        const subcategory = await database_1.prisma.subcategory.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
            },
        });
        return res.json(subcategory);
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { force } = req.query;
        const subcategory = await database_1.prisma.subcategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        });
        if (!subcategory) {
            return res.status(404).json({
                error: 'Subcategoria não encontrada',
                message: 'A subcategoria solicitada não foi encontrada',
            });
        }
        if (subcategory._count.products > 0 && force !== 'true') {
            return res.status(400).json({
                error: 'Subcategoria possui produtos',
                message: `Esta subcategoria possui ${subcategory._count.products} produto(s) associado(s). Use force=true para excluir mesmo assim.`,
                productsCount: subcategory._count.products,
            });
        }
        await database_1.prisma.subcategory.delete({
            where: { id },
        });
        return res.json({
            message: 'Subcategoria excluída com sucesso',
            subcategory: subcategory.name,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/category/:categoryId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const subcategories = await database_1.prisma.subcategory.findMany({
            where: {
                categoryId,
                active: true,
            },
            include: {
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
        res.json(subcategories);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=subcategory.routes.js.map