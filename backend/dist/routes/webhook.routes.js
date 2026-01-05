"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const router = (0, express_1.Router)();
router.post('/chatwoot', async (req, res, next) => {
    try {
        const { event, data } = req.body;
        if (event === 'conversation_created') {
            const { contact } = data;
            const existingLead = await database_1.prisma.lead.findUnique({
                where: { phone: contact.phone_number },
            });
            if (!existingLead) {
                const lead = await database_1.prisma.lead.create({
                    data: {
                        name: contact.name || 'Contato WhatsApp',
                        phone: contact.phone_number,
                        email: contact.email,
                        channel: 'WhatsApp',
                        status: 'NEW_LEAD',
                    },
                });
                logger_1.logger.info(`Novo lead criado via Chatwoot: ${lead.name}`);
            }
        }
        return res.status(200).json({ message: 'Webhook processado' });
    }
    catch (error) {
        logger_1.logger.error('Erro no webhook Chatwoot:', error);
        return next(error);
    }
});
router.post('/payment', async (req, res, next) => {
    try {
        const { event, data } = req.body;
        if (event === 'payment.approved') {
            const { external_reference } = data;
            const sale = await database_1.prisma.sale.findFirst({
                where: { paymentReference: external_reference },
            });
            if (sale && sale.status === 'PENDING') {
                await database_1.prisma.sale.update({
                    where: { id: sale.id },
                    data: { status: 'PAID' },
                });
                logger_1.logger.info(`Pagamento confirmado para venda: ${sale.id}`);
            }
        }
        return res.status(200).json({ message: 'Webhook processado' });
    }
    catch (error) {
        logger_1.logger.error('Erro no webhook de pagamento:', error);
        return next(error);
    }
});
router.post('/n8n/create-lead', async (req, res, next) => {
    try {
        const { name, phone, email, channel = 'WhatsApp', source = 'Chatwoot', notes, tags = [] } = req.body;
        if (!name || !phone) {
            return res.status(400).json({
                error: 'Dados obrigatórios',
                message: 'Nome e telefone são obrigatórios',
            });
        }
        const existingLead = await database_1.prisma.lead.findUnique({
            where: { phone },
        });
        if (existingLead) {
            return res.status(200).json({
                message: 'Lead já existe',
                lead: existingLead
            });
        }
        const lead = await database_1.prisma.lead.create({
            data: {
                name,
                phone,
                email,
                channel,
                source,
                status: 'NEW_LEAD',
                notes,
                tags,
                leadScore: 50
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        logger_1.logger.info(`Novo lead criado via n8n: ${lead.name} (${lead.phone})`);
        return res.status(201).json({
            message: 'Lead criado com sucesso',
            lead
        });
    }
    catch (error) {
        logger_1.logger.error('Erro ao criar lead via n8n:', error);
        return res.status(500).json({
            error: 'Erro interno',
            message: 'Erro ao processar lead'
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map