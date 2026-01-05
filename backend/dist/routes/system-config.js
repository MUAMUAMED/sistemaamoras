"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        let config = await database_1.prisma.systemConfig.findFirst();
        if (!config) {
            config = await database_1.prisma.systemConfig.create({
                data: {
                    companyName: 'Amoras Capital',
                    saleNumberPrefix: 'AC',
                    nextSaleNumber: 1
                }
            });
        }
        return res.json(config);
    }
    catch (error) {
        console.error('Erro ao obter configurações:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.put('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { chatwootUrl, chatwootToken, n8nWebhookUrl, paymentGateway, gatewayConfig, companyName, companyPhone, companyEmail, companyAddress, saleNumberPrefix, nextSaleNumber } = req.body;
        let config = await database_1.prisma.systemConfig.findFirst();
        if (!config) {
            config = await database_1.prisma.systemConfig.create({
                data: {
                    chatwootUrl,
                    chatwootToken,
                    n8nWebhookUrl,
                    paymentGateway,
                    gatewayConfig,
                    companyName: companyName || 'Amoras Capital',
                    companyPhone,
                    companyEmail,
                    companyAddress,
                    saleNumberPrefix: saleNumberPrefix || 'AC',
                    nextSaleNumber: nextSaleNumber || 1
                }
            });
        }
        else {
            config = await database_1.prisma.systemConfig.update({
                where: { id: config.id },
                data: {
                    ...(chatwootUrl !== undefined && { chatwootUrl }),
                    ...(chatwootToken !== undefined && { chatwootToken }),
                    ...(n8nWebhookUrl !== undefined && { n8nWebhookUrl }),
                    ...(paymentGateway !== undefined && { paymentGateway }),
                    ...(gatewayConfig !== undefined && { gatewayConfig }),
                    ...(companyName !== undefined && { companyName }),
                    ...(companyPhone !== undefined && { companyPhone }),
                    ...(companyEmail !== undefined && { companyEmail }),
                    ...(companyAddress !== undefined && { companyAddress }),
                    ...(saleNumberPrefix !== undefined && { saleNumberPrefix }),
                    ...(nextSaleNumber !== undefined && { nextSaleNumber })
                }
            });
        }
        return res.json(config);
    }
    catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
router.post('/next-sale-number', auth_1.authenticateToken, async (req, res) => {
    try {
        let config = await database_1.prisma.systemConfig.findFirst();
        if (!config) {
            config = await database_1.prisma.systemConfig.create({
                data: {
                    companyName: 'Amoras Capital',
                    saleNumberPrefix: 'AC',
                    nextSaleNumber: 1
                }
            });
        }
        const saleNumber = `${config.saleNumberPrefix}${config.nextSaleNumber.toString().padStart(4, '0')}`;
        await database_1.prisma.systemConfig.update({
            where: { id: config.id },
            data: {
                nextSaleNumber: { increment: 1 }
            }
        });
        return res.json({
            saleNumber,
            nextNumber: config.nextSaleNumber + 1
        });
    }
    catch (error) {
        console.error('Erro ao obter próximo número de venda:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=system-config.js.map