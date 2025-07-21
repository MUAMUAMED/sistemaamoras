import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

type LeadStatus = 'NEW_LEAD' | 'IN_SERVICE' | 'INTERESTED' | 'NEGOTIATING' | 'SALE_COMPLETED' | 'COLD_LEAD' | 'NO_RESPONSE' | 'REACTIVATE';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 1. Criar usuários
  console.log('👥 Criando usuários...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@amorascapital.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@amorascapital.com',
      password: hashedPassword,
      role: 'ADMIN',
      active: true
    }
  });

  const attendantUser = await prisma.user.upsert({
    where: { email: 'atendente@amorascapital.com' },
    update: {},
    create: {
      name: 'Atendente',
      email: 'atendente@amorascapital.com',
      password: hashedPassword,
      role: 'ATTENDANT',
      active: true
    }
  });

  // 2. Criar categorias
  console.log('📂 Criando categorias...');
  
  const vestidosCategory = await prisma.category.upsert({
    where: { code: 'VEST' },
    update: {},
    create: {
      name: 'Vestidos',
      code: 'VEST',
      description: 'Vestidos para todas as ocasiões',
      active: true
    }
  });

  const blusasCategory = await prisma.category.upsert({
    where: { code: 'BLUS' },
    update: {},
    create: {
      name: 'Blusas',
      code: 'BLUS',
      description: 'Blusas e camisetas',
      active: true
    }
  });

  const calcasCategory = await prisma.category.upsert({
    where: { code: 'CALC' },
    update: {},
    create: {
      name: 'Calças',
      code: 'CALC',
      description: 'Calças e bermudas',
      active: true
    }
  });

  // 3. Criar estampas/padrões
  console.log('🎨 Criando estampas...');
  
  const floralPattern = await prisma.pattern.upsert({
    where: { code: 'FLOR' },
    update: {},
    create: {
      name: 'Floral',
      code: 'FLOR',
      description: 'Estampa floral',
      active: true
    }
  });

  const lisoPattern = await prisma.pattern.upsert({
    where: { code: 'LISO' },
    update: {},
    create: {
      name: 'Liso',
      code: 'LISO',
      description: 'Tecido liso',
      active: true
    }
  });

  const geometricoPattern = await prisma.pattern.upsert({
    where: { code: 'GEOM' },
    update: {},
    create: {
      name: 'Geométrico',
      code: 'GEOM',
      description: 'Estampa geométrica',
      active: true
    }
  });

  // 4. Criar tamanhos
  console.log('📏 Criando tamanhos...');
  
  const tamanhoP = await prisma.size.upsert({
    where: { code: 'P' },
    update: {},
    create: {
      name: 'Pequeno',
      code: 'P',
      active: true
    }
  });

  const tamanhoM = await prisma.size.upsert({
    where: { code: 'M' },
    update: {},
    create: {
      name: 'Médio',
      code: 'M',
      active: true
    }
  });

  const tamanhoG = await prisma.size.upsert({
    where: { code: 'G' },
    update: {},
    create: {
      name: 'Grande',
      code: 'G',
      active: true
    }
  });

  // 5. Criar produtos (temporariamente desabilitado para resolver problemas de schema)
  console.log('👕 Criação de produtos desabilitada temporariamente...');

  // 6. Criar leads
  console.log('👤 Criando leads...');
  
  const leads = [
    {
      name: 'Maria Silva',
      phone: '11999999001',
      email: 'maria@email.com',
      channel: 'WHATSAPP',
      source: 'Instagram',
      status: 'NEW_LEAD' as LeadStatus,
      assignedToId: attendantUser.id,
      notes: 'Interessada em vestidos para festa de casamento',
      leadScore: 8,
      tags: 'novo,interessado'
    },
    {
      name: 'Ana Santos',
      phone: '11999999002',
      email: 'ana@email.com',
      channel: 'WHATSAPP',
      source: 'Facebook',
      status: 'NEGOTIATING' as LeadStatus,
      assignedToId: attendantUser.id,
      notes: 'Quer comprar 3 peças e pediu desconto',
      leadScore: 9,
      tags: 'negociando,desconto'
    },
    {
      name: 'Fernanda Costa',
      phone: '11999999003',
      email: 'fernanda@email.com',
      channel: 'WHATSAPP',
      source: 'Site',
      status: 'SALE_COMPLETED' as LeadStatus,
      assignedToId: attendantUser.id,
      notes: 'Cliente satisfeita, primeira compra realizada',
      leadScore: 10,
      tags: 'cliente-satisfeito,site',
      totalPurchases: 159.80,
      purchaseCount: 1
    }
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: lead });
  }

  // 8. Criar interações
  console.log('💬 Criando interações...');
  
  const mariaLead = await prisma.lead.findFirst({ where: { name: 'Maria Silva' } });
  const anaLead = await prisma.lead.findFirst({ where: { name: 'Ana Santos' } });
  
  if (mariaLead) {
    await prisma.interaction.create({
      data: {
        leadId: mariaLead.id,
        userId: attendantUser.id,
        type: 'WHATSAPP',
        title: 'Primeiro contato',
        description: 'Cliente interessada em vestidos para festa de casamento',
        outcome: 'Interesse confirmado',
        nextAction: 'Enviar catálogo de vestidos'
      }
    });

    await prisma.interaction.create({
      data: {
        leadId: mariaLead.id,
        userId: attendantUser.id,
        type: 'FOLLOW_UP',
        title: 'Envio de catálogo',
        description: 'Enviado catálogo com 5 opções de vestidos',
        outcome: 'Cliente gostou de 2 modelos',
        nextAction: 'Agendar experimentação'
      }
    });
  }

  if (anaLead) {
    await prisma.interaction.create({
      data: {
        leadId: anaLead.id,
        userId: attendantUser.id,
        type: 'WHATSAPP',
        title: 'Negociação desconto',
        description: 'Cliente quer comprar 3 peças e pediu desconto',
        outcome: 'Oferecido 10% de desconto',
        nextAction: 'Aguardar resposta da cliente'
      }
    });
  }

  // 9. Criar vendas
  console.log('💰 Criando vendas...');
  
  const fernandaLead = await prisma.lead.findFirst({ where: { name: 'Fernanda Costa' } });
  const vestidoProduct = await prisma.product.findFirst({ where: { name: 'Vestido Midi Floral Rosa' } });
  const blusaProduct = await prisma.product.findFirst({ where: { name: 'Blusa Básica Preta' } });

  if (fernandaLead && vestidoProduct && blusaProduct) {
    const sale = await prisma.sale.create({
      data: {
        saleNumber: 'AC0001',
        leadId: fernandaLead.id,
        sellerId: attendantUser.id,
        subtotal: 129.80,
        discount: 0,
        total: 129.80,
        status: 'PAID',
        paymentMethod: 'PIX',
        paymentReference: 'PIX123456789',
        deliveryMethod: 'DELIVERY',
        deliveryAddress: 'Rua das Flores, 456 - São Paulo/SP',
        deliveryFee: 15.00,
        paidAt: new Date(),
        notes: 'Primeira compra da cliente'
      }
    });

    // Itens da venda
    await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        productId: vestidoProduct.id,
        quantity: 1,
        unitPrice: 89.90,
        total: 89.90
      }
    });

    await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        productId: blusaProduct.id,
        quantity: 1,
        unitPrice: 39.90,
        total: 39.90
      }
    });

    // Movimentações de estoque
    await prisma.stockMovement.create({
      data: {
        productId: vestidoProduct.id,
        type: 'SALE',
        quantity: -1,
        reason: 'Venda realizada',
        reference: sale.id,
        userId: attendantUser.id
      }
    });

    await prisma.stockMovement.create({
      data: {
        productId: blusaProduct.id,
        type: 'SALE',
        quantity: -1,
        reason: 'Venda realizada',
        reference: sale.id,
        userId: attendantUser.id
      }
    });
  }

  // 10. Atualizar estoque dos produtos vendidos
  console.log('📦 Atualizando estoque...');
  
  if (vestidoProduct) {
    await prisma.product.update({
      where: { id: vestidoProduct.id },
      data: { stock: { decrement: 1 } }
    });
  }

  if (blusaProduct) {
    await prisma.product.update({
      where: { id: blusaProduct.id },
      data: { stock: { decrement: 1 } }
    });
  }

  // 11. Criar logs de webhook de exemplo
  console.log('📝 Criando logs de webhook...');
  
  await prisma.webhookLog.create({
    data: {
      source: 'mercadopago',
      event: 'payment.approved',
      data: JSON.stringify({
        id: 'MP123456789',
        status: 'approved',
        amount: 129.80,
        external_reference: 'AC0001'
      }),
      processed: true
    }
  });

  await prisma.webhookLog.create({
    data: {
      source: 'chatwoot',
      event: 'message.created',
      data: JSON.stringify({
        conversation_id: 123,
        sender: {
          name: 'Cliente Novo',
          phone: '11999999005'
        },
        message: 'Oi, gostaria de saber sobre os vestidos'
      }),
      processed: false
    }
  });

  console.log('✅ Seed concluído com sucesso!');
  
  // Estatísticas finais
  const stats = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    patterns: await prisma.pattern.count(),
    sizes: await prisma.size.count(),
    products: await prisma.product.count(),
    leads: await prisma.lead.count(),
    interactions: await prisma.interaction.count(),
    sales: await prisma.sale.count(),
    saleItems: await prisma.saleItem.count(),
    stockMovements: await prisma.stockMovement.count(),
    webhookLogs: await prisma.webhookLog.count()
  };

  console.log('\n📊 Estatísticas do banco:');
  console.log(`👥 Usuários: ${stats.users}`);
  console.log(`📂 Categorias: ${stats.categories}`);
  console.log(`🎨 Estampas: ${stats.patterns}`);
  console.log(`📏 Tamanhos: ${stats.sizes}`);
  console.log(`👕 Produtos: ${stats.products}`);
  console.log(`👤 Leads: ${stats.leads}`);
  console.log(`💬 Interações: ${stats.interactions}`);
  console.log(`💰 Vendas: ${stats.sales}`);
  console.log(`📦 Itens de venda: ${stats.saleItems}`);
  console.log(`📊 Movimentações de estoque: ${stats.stockMovements}`);
  console.log(`📝 Logs de webhook: ${stats.webhookLogs}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 