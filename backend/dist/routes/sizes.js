"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { active } = req.query;
        const sizes = await database_1.prisma.size.findMany({
            where: active !== undefined ? { active: active === 'true' } : {},
            orderBy: { name: 'asc' }
        });
        res.json(sizes);
    }
    catch (error) {
        console.error('Erro ao listar tamanhos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const size = await database_1.prisma.size.findUnique({
            where: { id }
        });
        if (!size) {
            return res.status(404).json({ error: 'Tamanho não encontrado' });
        }
        return res.json(size);
    }
    catch (error) {
        console.error('Erro ao buscar tamanho:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, code, active = true } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: 'Nome e código são obrigatórios' });
        }
        if (!/^\d{1,2}$/.test(code)) {
            return res.status(400).json({
                error: 'Código inválido',
                message: 'O código deve ter 1 ou 2 dígitos numéricos (ex: 05, 10)',
            });
        }
        const existingSize = await database_1.prisma.size.findFirst({
            where: {
                OR: [
                    { name },
                    { code }
                ]
            }
        });
        if (existingSize) {
            return res.status(409).json({ error: 'Tamanho ou código já existe' });
        }
        const size = await database_1.prisma.size.create({
            data: {
                name,
                code,
                active
            }
        });
        return res.status(201).json(size);
    }
    catch (error) {
        console.error('Erro ao criar tamanho:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, active } = req.body;
        const existingSize = await database_1.prisma.size.findUnique({
            where: { id }
        });
        if (!existingSize) {
            return res.status(404).json({ error: 'Tamanho não encontrado' });
        }
        if (name || code) {
            const duplicate = await database_1.prisma.size.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        {
                            OR: [
                                name ? { name } : {},
                                code ? { code } : {}
                            ]
                        }
                    ]
                }
            });
            if (duplicate) {
                return res.status(409).json({ error: 'Nome ou código já existe' });
            }
        }
        const size = await database_1.prisma.size.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code && { code }),
                ...(active !== undefined && { active })
            }
        });
        return res.json(size);
    }
    catch (error) {
        console.error('Erro ao atualizar tamanho:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const existingSize = await database_1.prisma.size.findUnique({
            where: { id }
        });
        if (!existingSize) {
            return res.status(404).json({ error: 'Tamanho não encontrado' });
        }
        await database_1.prisma.size.delete({
            where: { id }
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Erro ao deletar tamanho:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=sizes.js.map