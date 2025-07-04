import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

// Webhook do Chatwoot
router.post('/chatwoot', async (req, res, next) => {
  try {
    const { event, data } = req.body;

    if (event === 'conversation_created') {
      const { contact } = data;
      
      // Verificar se lead já existe
      const existingLead = await prisma.lead.findUnique({
        where: { phone: contact.phone_number },
      });

      if (!existingLead) {
        // Criar novo lead
        const lead = await prisma.lead.create({
          data: {
            name: contact.name || 'Contato WhatsApp',
            phone: contact.phone_number,
            email: contact.email,
            channel: 'WhatsApp',
            status: 'NEW_LEAD',
          },
        });

        logger.info(`Novo lead criado via Chatwoot: ${lead.name}`);
      }
    }

    res.status(200).json({ message: 'Webhook processado' });
  } catch (error) {
    logger.error('Erro no webhook Chatwoot:', error);
    next(error);
  }
});

// Webhook de pagamentos
router.post('/payment', async (req, res, next) => {
  try {
    const { event, data } = req.body;

    if (event === 'payment.approved') {
      const { external_reference } = data;
      
      // Buscar venda pela referência
      const sale = await prisma.sale.findFirst({
        where: { paymentReference: external_reference },
      });

      if (sale && sale.status === 'PENDING') {
        // Atualizar status da venda
        await prisma.sale.update({
          where: { id: sale.id },
          data: { status: 'PAID' },
        });

        logger.info(`Pagamento confirmado para venda: ${sale.id}`);
      }
    }

    res.status(200).json({ message: 'Webhook processado' });
  } catch (error) {
    logger.error('Erro no webhook de pagamento:', error);
    next(error);
  }
});

router.post('/n8n/create-lead', async (req, res, next) => {
  try {
    const { 
      name, 
      phone, 
      email, 
      channel = 'WhatsApp',
      source = 'Chatwoot',
      notes,
      tags = []
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome e telefone são obrigatórios',
      });
    }

    // Verificar se telefone já existe
    const existingLead = await prisma.lead.findUnique({
      where: { phone },
    });

    if (existingLead) {
      return res.status(200).json({
        message: 'Lead já existe',
        lead: existingLead
      });
    }

    // Criar novo lead
    const lead = await prisma.lead.create({
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

    logger.info(`Novo lead criado via n8n: ${lead.name} (${lead.phone})`);

    return res.status(201).json({
      message: 'Lead criado com sucesso',
      lead
    });
  } catch (error) {
    logger.error('Erro ao criar lead via n8n:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao processar lead'
    });
  }
});

export default router; 