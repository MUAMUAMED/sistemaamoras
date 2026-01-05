"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const patterns = await database_1.prisma.pattern.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
        });
        return res.json(patterns);
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
        if (!/^\d{1,4}$/.test(code)) {
            return res.status(400).json({
                error: 'Código inválido',
                message: 'O código deve ter 1 a 4 dígitos numéricos (ex: 0001, 0032)',
            });
        }
        const existingPattern = await database_1.prisma.pattern.findFirst({
            where: {
                OR: [
                    { name },
                    { code }
                ]
            }
        });
        if (existingPattern) {
            return res.status(409).json({
                error: 'Estampa já existe',
                message: existingPattern.name === name
                    ? 'Já existe uma estampa com este nome'
                    : 'Já existe uma estampa com este código'
            });
        }
        const pattern = await database_1.prisma.pattern.create({
            data: { name, code, description },
        });
        return res.status(201).json(pattern);
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const pattern = await database_1.prisma.pattern.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        products: true
                    }
                }
            }
        });
        if (!pattern) {
            return res.status(404).json({
                error: 'Estampa não encontrada',
                message: 'A estampa solicitada não foi encontrada'
            });
        }
        if (pattern._count.products > 0) {
            return res.status(409).json({
                error: 'Estampa em uso',
                message: `Esta estampa está sendo usada por ${pattern._count.products} produto(s). Remova os produtos primeiro.`,
                canForce: true
            });
        }
        await database_1.prisma.pattern.delete({
            where: { id }
        });
        return res.status(200).json({
            message: 'Estampa excluída com sucesso',
            patternName: pattern.name
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=pattern.routes.js.map