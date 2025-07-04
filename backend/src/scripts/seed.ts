import { PrismaClient, LeadStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.webhookLog.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.product.deleteMany();
  await prisma.pattern.deleteMany();
  await prisma.category.deleteMany();
  await prisma.size.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar usuários
  console.log('👥 Criando usuários...');
  
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin Sistema',
      email: 'admin@amorascapital.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN'
    }
  });

  const managerUser = await prisma.user.create({
    data: {
      name: 'Gerente Vendas',
      email: 'gerente@amorascapital.com',
      password: await bcrypt.hash('gerente123', 10),
      role: 'MANAGER'
    }
  });

  const attendantUser = await prisma.user.create({
    data: {
      name: 'Atendente',
      email: 'atendente@amorascapital.com',
      password: await bcrypt.hash('atendente123', 10),
      role: 'ATTENDANT'
    }
  });

  // 2. Criar configuração do sistema
  console.log('⚙️ Criando configuração do sistema...');
  
  await prisma.systemConfig.create({
    data: {
      companyName: 'Amoras Capital',
      companyPhone: '(11) 99999-9999',
      companyEmail: 'contato@amorascapital.com',
      companyAddress: 'Rua das Amoras, 123 - São Paulo/SP',
      saleNumberPrefix: 'AC',
      nextSaleNumber: 1,
      paymentGateway: 'mercadopago'
    }
  });

  // 3. Criar tamanhos
  console.log('📏 Criando tamanhos...');
  
  const sizes = [
    { name: 'PP', code: '01' },
    { name: 'P', code: '02' },
    { name: 'M', code: '03' },
    { name: 'G', code: '04' },
    { name: 'GG', code: '05' },
    { name: 'XG', code: '06' },
    { name: 'XGG', code: '07' }
  ];

  for (const size of sizes) {
    await prisma.size.create({ data: size });
  }

  // 4. Criar categorias
  console.log('📂 Criando categorias...');
  
  const categories = [
    { name: 'Vestidos', code: '10', description: 'Vestidos femininos' },
    { name: 'Blusas', code: '20', description: 'Blusas e camisetas' },
    { name: 'Calças', code: '30', description: 'Calças e leggings' },
    { name: 'Saias', code: '40', description: 'Saias e shorts-saias' },
    { name: 'Conjuntos', code: '50', description: 'Conjuntos femininos' },
    { name: 'Acessórios', code: '60', description: 'Acessórios e bijuterias' }
  ];

  for (const category of categories) {
    await prisma.category.create({ data: category });
  }

  // 5. Criar estampas
  console.log('🎨 Criando estampas...');
  
  const patterns = [
    { name: 'Liso Preto', code: '0001', description: 'Tecido liso na cor preta' },
    { name: 'Liso Branco', code: '0002', description: 'Tecido liso na cor branca' },
    { name: 'Liso Vermelho', code: '0003', description: 'Tecido liso na cor vermelha' },
    { name: 'Liso Azul', code: '0004', description: 'Tecido liso na cor azul' },
    { name: 'Liso Rosa', code: '0005', description: 'Tecido liso na cor rosa' },
    { name: 'Floral Rosa', code: '0010', description: 'Estampa floral em tons de rosa' },
    { name: 'Floral Azul', code: '0011', description: 'Estampa floral em tons de azul' },
    { name: 'Poá Preto', code: '0020', description: 'Estampa de poá preto e branco' },
    { name: 'Listras Marinhas', code: '0030', description: 'Listras azul marinho e branco' },
    { name: 'Animal Print', code: '0040', description: 'Estampa animal print' },
    { name: 'Geométrica', code: '0050', description: 'Estampa geométrica moderna' },
    { name: 'Tropical', code: '0060', description: 'Estampa tropical com folhas' }
  ];

  for (const pattern of patterns) {
    await prisma.pattern.create({ data: pattern });
  }

  // 6. Criar produtos (usando campos atuais do schema)
  console.log('👗 Criando produtos...');
  
  const vestidosCategory = await prisma.category.findFirst({ where: { name: 'Vestidos' } });
  const blusasCategory = await prisma.category.findFirst({ where: { name: 'Blusas' } });
  const calcasCategory = await prisma.category.findFirst({ where: { name: 'Calças' } });
  
  const floralRosaPattern = await prisma.pattern.findFirst({ where: { name: 'Floral Rosa' } });
  const lisoPretoPattern = await prisma.pattern.findFirst({ where: { name: 'Liso Preto' } });
  const lisoAzulPattern = await prisma.pattern.findFirst({ where: { name: 'Liso Azul' } });

  const products = [
    {
      name: 'Vestido Midi Floral Rosa',
      categoryId: vestidosCategory?.id || '',
      size: 'M',
      sizeCode: '03',
      patternId: floralRosaPattern?.id || '',
      price: 89.90,
      stock: 15,
      barcode: '03100010001',
      description: 'Vestido midi com estampa floral rosa, perfeito para ocasiões especiais'
    },
    {
      name: 'Blusa Básica Preta',
      categoryId: blusasCategory?.id || '',
      size: 'P',
      sizeCode: '02',
      patternId: lisoPretoPattern?.id || '',
      price: 39.90,
      stock: 25,
      barcode: '02200001002',
      description: 'Blusa básica preta, essencial no guarda-roupa feminino'
    },
    {
      name: 'Calça Jeans Azul',
      categoryId: calcasCategory?.id || '',
      size: 'G',
      sizeCode: '04',
      patternId: lisoAzulPattern?.id || '',
      price: 79.90,
      stock: 20,
      barcode: '04300004003',
      description: 'Calça jeans azul clássica, modelagem skinny'
    }
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  // 7. Criar leads
  console.log('🎯 Criando leads...');
  
  const leads = [
    {
      name: 'Maria Silva',
      phone: '11999999001',
      email: 'maria@email.com',
      channel: 'WhatsApp',
      source: 'Instagram - Post Vestidos',
      status: LeadStatus.INTERESTED,
      assignedToId: attendantUser.id,
      notes: 'Interessada em vestidos para festa',
      leadScore: 75,
      tags: ['vestidos', 'festa', 'instagram']
    },
    {
      name: 'Ana Santos',
      phone: '11999999002',
      email: 'ana@email.com',
      channel: 'Instagram',
      source: 'Stories - Promoção',
      status: LeadStatus.NEGOTIATING,
      assignedToId: attendantUser.id,
      notes: 'Negociando desconto para compra de 3 peças',
      leadScore: 85,
      tags: ['promocao', 'multiplas-pecas']
    },
    {
      name: 'Carla Oliveira',
      phone: '11999999003',
      channel: 'WhatsApp',
      source: 'Indicação - Cliente',
      status: LeadStatus.NEW_LEAD,
      assignedToId: attendantUser.id,
      notes: 'Indicada pela Maria Silva',
      leadScore: 60,
      tags: ['indicacao', 'novo-cliente']
    },
    {
      name: 'Fernanda Costa',
      phone: '11999999004',
      email: 'fernanda@email.com',
      channel: 'Site',
      source: 'Formulário de Contato',
      status: LeadStatus.SALE_COMPLETED,
      assignedToId: attendantUser.id,
      notes: 'Cliente já realizou compra - satisfeita',
      leadScore: 95,
      tags: ['cliente-satisfeito', 'site'],
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
      data: {
        id: 'MP123456789',
        status: 'approved',
        amount: 129.80,
        external_reference: 'AC0001'
      },
      processed: true
    }
  });

  await prisma.webhookLog.create({
    data: {
      source: 'chatwoot',
      event: 'message.created',
      data: {
        conversation_id: 123,
        sender: {
          name: 'Cliente Novo',
          phone: '11999999005'
        },
        message: 'Oi, gostaria de saber sobre os vestidos'
      },
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
  console.log(`👗 Produtos: ${stats.products}`);
  console.log(`🎯 Leads: ${stats.leads}`);
  console.log(`💬 Interações: ${stats.interactions}`);
  console.log(`💰 Vendas: ${stats.sales}`);
  console.log(`📦 Itens vendidos: ${stats.saleItems}`);
  console.log(`📋 Movimentações: ${stats.stockMovements}`);
  console.log(`📝 Logs webhook: ${stats.webhookLogs}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 