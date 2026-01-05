"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const barcode_service_1 = require("../services/barcode.service");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.post('/generate', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sizeId, categoryId, subcategoryId, patternId } = req.body;
        if (!sizeId || !categoryId || !patternId) {
            return res.status(400).json({ error: 'sizeId, categoryId e patternId são obrigatórios' });
        }
        const codes = await barcode_service_1.BarcodeService.generateProductCodes({
            sizeId,
            categoryId,
            subcategoryId,
            patternId
        });
        return res.json(codes);
    }
    catch (error) {
        console.error('Erro ao gerar códigos:', error);
        if (error instanceof Error && error.message.includes('não encontrados')) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/scan', auth_1.authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Código é obrigatório' });
        }
        const product = await barcode_service_1.BarcodeService.findProductByCode(code);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        const isValid = code.length === 13 ? barcode_service_1.BarcodeService.validateBarcode(code) : true;
        return res.json({
            product,
            isValid
        });
    }
    catch (error) {
        console.error('Erro ao escanear código:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/validate', auth_1.authenticateToken, async (req, res) => {
    try {
        const { barcode } = req.body;
        if (!barcode) {
            return res.status(400).json({ error: 'Código de barras é obrigatório' });
        }
        const isValid = barcode_service_1.BarcodeService.validateBarcode(barcode);
        const checkDigit = barcode.length === 13 ? barcode.slice(12) : null;
        return res.json({
            isValid,
            checkDigit
        });
    }
    catch (error) {
        console.error('Erro ao validar código:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/parse-sku', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sku } = req.body;
        if (!sku) {
            return res.status(400).json({ error: 'SKU é obrigatório' });
        }
        const skuInfo = barcode_service_1.BarcodeService.parseSkuInfo(sku);
        if (!skuInfo) {
            return res.status(400).json({ error: 'SKU inválido. Deve ter 8 dígitos no formato TTCCEEEE' });
        }
        const [size, category, pattern] = await Promise.all([
            database_1.prisma.size.findFirst({ where: { code: skuInfo.sizeCode } }),
            database_1.prisma.category.findFirst({ where: { code: skuInfo.categoryCode } }),
            database_1.prisma.pattern.findFirst({ where: { code: skuInfo.patternCode } })
        ]);
        return res.json({
            skuInfo,
            details: {
                size,
                category,
                pattern
            }
        });
    }
    catch (error) {
        console.error('Erro ao analisar SKU:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.post('/generate-sale-qr', auth_1.authenticateToken, async (req, res) => {
    try {
        const { saleId } = req.body;
        if (!saleId) {
            return res.status(400).json({ error: 'ID da venda é obrigatório' });
        }
        const sale = await database_1.prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                items: true,
                lead: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });
        if (!sale) {
            return res.status(404).json({ error: 'Venda não encontrada' });
        }
        const qrcodeUrl = await barcode_service_1.BarcodeService.generateSaleQRCode(sale);
        return res.json({ qrcodeUrl });
    }
    catch (error) {
        console.error('Erro ao gerar QR Code da venda:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/test', auth_1.authenticateToken, async (req, res) => {
    try {
        const [size, category, pattern] = await Promise.all([
            database_1.prisma.size.findFirst({ where: { active: true } }),
            database_1.prisma.category.findFirst({ where: { active: true } }),
            database_1.prisma.pattern.findFirst({ where: { active: true } })
        ]);
        if (!size || !category || !pattern) {
            return res.status(404).json({
                error: 'Dados de exemplo não encontrados',
                message: 'Certifique-se de que existem tamanhos, categorias e estampas cadastrados'
            });
        }
        const codes = await barcode_service_1.BarcodeService.generateProductCodes({
            sizeId: size.id,
            categoryId: category.id,
            patternId: pattern.id
        });
        return res.json({
            codes,
            example: {
                size: { id: size.id, name: size.name, code: size.code },
                category: { id: category.id, name: category.name, code: category.code },
                pattern: { id: pattern.id, name: pattern.name, code: pattern.code }
            }
        });
    }
    catch (error) {
        console.error('Erro ao gerar códigos de teste:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/codes', auth_1.authenticateToken, async (req, res) => {
    try {
        const [sizes, categories, patterns] = await Promise.all([
            database_1.prisma.size.findMany({
                where: { active: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' }
            }),
            database_1.prisma.category.findMany({
                where: { active: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' }
            }),
            database_1.prisma.pattern.findMany({
                where: { active: true },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' }
            })
        ]);
        res.json({
            sizes,
            categories,
            patterns,
            format: {
                description: 'Formato do código: TTCCEEEE',
                explanation: {
                    TT: 'Tamanho (2 dígitos)',
                    CC: 'Categoria (2 dígitos)',
                    EEEE: 'Estampa (4 dígitos)'
                },
                example: {
                    size: 'M (05)',
                    category: 'Vestido (50)',
                    pattern: 'Azul Marinho (0032)',
                    result: '05500032'
                }
            }
        });
    }
    catch (error) {
        console.error('Erro ao listar códigos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
router.get('/validate-codes', auth_1.authenticateToken, async (req, res) => {
    try {
        const [sizes, categories, patterns] = await Promise.all([
            database_1.prisma.size.findMany({ select: { id: true, name: true, code: true } }),
            database_1.prisma.category.findMany({ select: { id: true, name: true, code: true } }),
            database_1.prisma.pattern.findMany({ select: { id: true, name: true, code: true } })
        ]);
        const report = {
            valid: [],
            invalid: [],
            corrected: []
        };
        sizes.forEach(size => {
            const cleanCode = size.code.replace(/\D/g, '');
            if (/^\d{1,2}$/.test(cleanCode)) {
                report.valid.push({ type: 'size', ...size, code: cleanCode.padStart(2, '0') });
            }
            else {
                report.invalid.push({ type: 'size', ...size, issue: 'Código deve ter 1-2 dígitos numéricos' });
            }
        });
        categories.forEach(category => {
            const cleanCode = category.code.replace(/\D/g, '');
            if (/^\d{1,2}$/.test(cleanCode)) {
                report.valid.push({ type: 'category', ...category, code: cleanCode.padStart(2, '0') });
            }
            else {
                report.invalid.push({ type: 'category', ...category, issue: 'Código deve ter 1-2 dígitos numéricos' });
            }
        });
        patterns.forEach(pattern => {
            const cleanCode = pattern.code.replace(/\D/g, '');
            if (/^\d{1,4}$/.test(cleanCode)) {
                report.valid.push({ type: 'pattern', ...pattern, code: cleanCode.padStart(4, '0') });
            }
            else {
                report.invalid.push({ type: 'pattern', ...pattern, issue: 'Código deve ter 1-4 dígitos numéricos' });
            }
        });
        res.json({
            ...report,
            summary: {
                total: sizes.length + categories.length + patterns.length,
                valid: report.valid.length,
                invalid: report.invalid.length,
                corrected: report.corrected.length
            },
            recommendations: report.invalid.length > 0 ? [
                'Corrija os códigos inválidos para garantir compatibilidade com o sistema de códigos de barras',
                'Use apenas números nos códigos',
                'Tamanhos: máximo 2 dígitos',
                'Categorias: máximo 2 dígitos',
                'Estampas: máximo 4 dígitos'
            ] : ['Todos os códigos estão válidos!']
        });
    }
    catch (error) {
        console.error('Erro ao validar códigos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
});
exports.default = router;
//# sourceMappingURL=barcode.js.map