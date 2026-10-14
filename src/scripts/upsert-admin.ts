import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

// Uso restrito a um shell administrativo do servidor:
// node dist/scripts/upsert-admin.js "Nome" "email@empresa.com" "senha"
async function main() {
  const [, , name, rawEmail, password] = process.argv;
  const email = rawEmail?.trim().toLowerCase();

  if (!name || !email || !password || password.length < 6) {
    throw new Error('Uso: node dist/scripts/upsert-admin.js "Nome" "email" "senha-com-no-minimo-6-caracteres"');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: name.trim(), password: passwordHash, role: 'ADMIN', active: true },
    create: { name: name.trim(), email, password: passwordHash, role: 'ADMIN', active: true },
    select: { email: true, role: true, active: true },
  });

  console.log(`Conta administrativa ativa: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
