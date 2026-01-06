import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

async function main() {
  console.log('🌱 Iniciando seed do banco SQLite...');

  // Limpar dados existentes
  await prisma.webhookLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.product.deleteMany();
  await prisma.size.deleteMany();
  await prisma.pattern.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemConfig.deleteMany();

  console.log('🗑️ Dados limpos');

  // Criar usuários
  const adminPassword = await bcrypt.hash('admin123', 10);
  const attendantPassword = await bcrypt.hash('atendente123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@amorascapital.com',
      password: adminPassword,
      role: 'ADMIN',
      active: true,
    },
  });

  const attendant = await prisma.user.create({
    data: {
      name: 'Atendente',
      email: 'atendente@amorascapital.com',
      password: attendantPassword,
      role: 'ATTENDANT',
      active: true,
    },
  });

  console.log('👥 Usuários criados');

  // Criar categorias
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Vestidos',
        code: '50',
        description: 'Vestidos femininos',
        active: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Blusas',
        code: '51',
        description: 'Blusas femininas',
        active: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Calças',
        code: '52',
        description: 'Calças femininas',
        active: true,
      },
    }),
  ]);

  console.log('📂 Categorias criadas');

  // Criar estampas
  const patterns = await Promise.all([
    prisma.pattern.create({
      data: {
        name: 'Azul Marinho',
        code: '0032',
        description: 'Azul marinho sólido',
        active: true,
      },
    }),
    prisma.pattern.create({
      data: {
        name: 'Preto',
        code: '0001',
        description: 'Preto sólido',
        active: true,
      },
    }),
    prisma.pattern.create({
      data: {
        name: 'Branco',
        code: '0002',
        description: 'Branco sólido',
        active: true,
      },
    }),
  ]);

  console.log('🎨 Estampas criadas');

  // Criar tamanhos
  const sizes = await Promise.all([
    prisma.size.create({
      data: {
        name: 'P',
        code: '01',
        active: true,
      },
    }),
    prisma.size.create({
      data: {
        name: 'M',
        code: '02',
        active: true,
      },
    }),
    prisma.size.create({
      data: {
        name: 'G',
        code: '03',
        active: true,
      },
    }),
    prisma.size.create({
      data: {
        name: 'GG',
        code: '04',
        active: true,
      },
    }),
  ]);

  console.log('📏 Tamanhos criados');

  // Criar produtos
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Vestido Azul Marinho M',
        categoryId: categories[0].id, // Vestidos
        sizeId: sizes[1].id, // M
        patternId: patterns[0].id, // Azul Marinho
        price: 89.90,
        stock: 10,
        minStock: 5,
        barcode: '7891234567890',
        description: 'Vestido elegante azul marinho',
        active: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Blusa Preta P',
        categoryId: categories[1].id, // Blusas
        sizeId: sizes[0].id, // P
        patternId: patterns[1].id, // Preto
        price: 45.90,
        stock: 15,
        minStock: 3,
        barcode: '7891234567891',
        description: 'Blusa básica preta',
        active: true,
      },
    }),
  ]);

  console.log('👕 Produtos criados');

  // Criar leads
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: 'Maria Silva',
        phone: '11999887766',
        email: 'maria@email.com',
        channel: 'WhatsApp',
        source: 'Instagram',
        status: 'NEW_LEAD',
        assignedToId: attendant.id,
        notes: 'Interessada em vestidos',
        leadScore: 75,
        tags: ['interessada', 'vestidos', 'instagram'],
        totalPurchases: 0,
        purchaseCount: 0,
      },
    }),
    prisma.lead.create({
      data: {
        name: 'João Santos',
        phone: '11988776655',
        email: 'joao@email.com',
        channel: 'Site',
        source: 'Google Ads',
        status: 'INTERESTED',
        assignedToId: admin.id,
        notes: 'Cliente recorrente',
        leadScore: 90,
        tags: ['recorrente', 'site', 'google'],
        totalPurchases: 250.00,
        purchaseCount: 3,
      },
    }),
  ]);

  console.log('👤 Leads criados');

  // Criar interações
  await Promise.all([
    prisma.interaction.create({
      data: {
        leadId: leads[0].id,
        userId: attendant.id,
        type: 'WHATSAPP',
        title: 'Primeiro contato',
        description: 'Cliente interessada em vestidos azuis',
        outcome: 'Aguardando resposta',
        nextAction: 'Enviar catálogo',
      },
    }),
    prisma.interaction.create({
      data: {
        leadId: leads[1].id,
        userId: admin.id,
        type: 'CALL',
        title: 'Follow-up',
        description: 'Cliente confirmou interesse em nova coleção',
        outcome: 'Agendou visita',
        nextAction: 'Preparar produtos',
      },
    }),
  ]);

  console.log('💬 Interações criadas');

  // Criar configurações do sistema
  await prisma.systemConfig.create({
    data: {
      companyName: 'Amoras Capital',
      companyPhone: '11999887766',
      companyEmail: 'contato@amorascapital.com',
      companyAddress: 'Rua das Flores, 123 - São Paulo/SP',
      saleNumberPrefix: 'VDA',
      nextSaleNumber: 1,
    },
  });

  console.log('⚙️ Configurações criadas');

  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('🔐 Credenciais de acesso:');
  console.log('Admin: admin@amorascapital.com / admin123');
  console.log('Atendente: atendente@amorascapital.com / atendente123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 