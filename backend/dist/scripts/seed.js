"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
async function main() {
    console.log('🌱 Iniciando seed do banco SQLite...');
    await database_1.prisma.webhookLog.deleteMany();
    await database_1.prisma.stockMovement.deleteMany();
    await database_1.prisma.saleItem.deleteMany();
    await database_1.prisma.sale.deleteMany();
    await database_1.prisma.interaction.deleteMany();
    await database_1.prisma.lead.deleteMany();
    await database_1.prisma.product.deleteMany();
    await database_1.prisma.size.deleteMany();
    await database_1.prisma.pattern.deleteMany();
    await database_1.prisma.category.deleteMany();
    await database_1.prisma.user.deleteMany();
    await database_1.prisma.systemConfig.deleteMany();
    console.log('🗑️ Dados limpos');
    const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
    const attendantPassword = await bcryptjs_1.default.hash('atendente123', 10);
    const admin = await database_1.prisma.user.create({
        data: {
            name: 'Administrador',
            email: 'admin@amorascapital.com',
            password: adminPassword,
            role: 'ADMIN',
            active: true,
        },
    });
    const attendant = await database_1.prisma.user.create({
        data: {
            name: 'Atendente',
            email: 'atendente@amorascapital.com',
            password: attendantPassword,
            role: 'ATTENDANT',
            active: true,
        },
    });
    console.log('👥 Usuários criados');
    const categories = await Promise.all([
        database_1.prisma.category.create({
            data: {
                name: 'Vestidos',
                code: '50',
                description: 'Vestidos femininos',
                active: true,
            },
        }),
        database_1.prisma.category.create({
            data: {
                name: 'Blusas',
                code: '51',
                description: 'Blusas femininas',
                active: true,
            },
        }),
        database_1.prisma.category.create({
            data: {
                name: 'Calças',
                code: '52',
                description: 'Calças femininas',
                active: true,
            },
        }),
    ]);
    console.log('📂 Categorias criadas');
    const patterns = await Promise.all([
        database_1.prisma.pattern.create({
            data: {
                name: 'Azul Marinho',
                code: '0032',
                description: 'Azul marinho sólido',
                active: true,
            },
        }),
        database_1.prisma.pattern.create({
            data: {
                name: 'Preto',
                code: '0001',
                description: 'Preto sólido',
                active: true,
            },
        }),
        database_1.prisma.pattern.create({
            data: {
                name: 'Branco',
                code: '0002',
                description: 'Branco sólido',
                active: true,
            },
        }),
    ]);
    console.log('🎨 Estampas criadas');
    const sizes = await Promise.all([
        database_1.prisma.size.create({
            data: {
                name: 'P',
                code: '01',
                active: true,
            },
        }),
        database_1.prisma.size.create({
            data: {
                name: 'M',
                code: '02',
                active: true,
            },
        }),
        database_1.prisma.size.create({
            data: {
                name: 'G',
                code: '03',
                active: true,
            },
        }),
        database_1.prisma.size.create({
            data: {
                name: 'GG',
                code: '04',
                active: true,
            },
        }),
    ]);
    console.log('📏 Tamanhos criados');
    const products = await Promise.all([
        database_1.prisma.product.create({
            data: {
                name: 'Vestido Azul Marinho M',
                categoryId: categories[0].id,
                sizeId: sizes[1].id,
                patternId: patterns[0].id,
                price: 89.90,
                stock: 10,
                minStock: 5,
                barcode: '7891234567890',
                description: 'Vestido elegante azul marinho',
                active: true,
            },
        }),
        database_1.prisma.product.create({
            data: {
                name: 'Blusa Preta P',
                categoryId: categories[1].id,
                sizeId: sizes[0].id,
                patternId: patterns[1].id,
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
    const leads = await Promise.all([
        database_1.prisma.lead.create({
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
        database_1.prisma.lead.create({
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
    await Promise.all([
        database_1.prisma.interaction.create({
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
        database_1.prisma.interaction.create({
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
    await database_1.prisma.systemConfig.create({
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
    await database_1.prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map