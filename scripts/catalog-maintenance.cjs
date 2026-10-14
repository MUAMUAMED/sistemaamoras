// Preview por padrão. --apply exige o hash de uma revisão previamente salva.
const { prisma } = require('../dist/config/database');
const { maintenancePreview, consolidateDuplicateProducts, removeUnusedClassification } = require('../dist/services/catalog-maintenance.service');
const apply = process.argv[2] === '--apply';
const fingerprint = process.argv[3];
if (apply && !/^[a-f0-9]{64}$/.test(fingerprint || '')) throw new Error('Informe o hash do preview salvo.');
async function main() {
  if (!apply) return console.log(JSON.stringify(await maintenancePreview(prisma)));
  const report = await prisma.$transaction(async (tx) => {
    const preview = await maintenancePreview(tx);
    if (preview.fingerprint !== fingerprint) throw new Error('O catálogo mudou desde a revisão. Gere e salve outro preview.');
    const before = await tx.product.aggregate({ _sum: { stock: true, stockLoja: true, stockArmazem: true } });
    const consolidation = await consolidateDuplicateProducts(tx);
    const cleanup = await removeUnusedClassification(tx, preview);
    const after = await tx.product.aggregate({ _sum: { stock: true, stockLoja: true, stockArmazem: true } });
    if (JSON.stringify(before._sum) !== JSON.stringify(after._sum)) throw new Error('A manutenção não pode alterar o estoque total.');
    return { timestamp: new Date().toISOString(), fingerprint, consolidation, cleanup, stockBefore: before._sum, stockAfter: after._sum };
  }, { isolationLevel: 'Serializable', timeout: 60000 });
  console.log(JSON.stringify(report));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
