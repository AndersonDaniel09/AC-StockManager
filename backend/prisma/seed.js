const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existing) {
    console.log('⚠️  El usuario admin ya existe. No se hizo nada.');
    return;
  }

  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      username: 'admin',
      password: hashed,
      role: 'ADMIN',
      canAddProducts: true,
      canSell: true,
      canEditProducts: true,
    },
  });

  console.log('✅ Usuario admin creado:');
  console.log(`   Usuario:    ${admin.username}`);
  console.log(`   Contraseña: admin123`);
  console.log(`   ⚡ Cambia la contraseña después de entrar por primera vez.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
