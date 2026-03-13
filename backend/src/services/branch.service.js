const prisma = require('../config/prisma');

const DEFAULT_BRANCHES = ['Hotel SFR Principal', 'Hotel SFR Segunda sede'];

async function ensureDefaultBranches() {
  const count = await prisma.branch.count();
  if (count > 0) return;

  await prisma.branch.createMany({
    data: DEFAULT_BRANCHES.map((name) => ({ name })),
  });
}

async function getAll() {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function create(data) {
  if (!data.name?.trim()) {
    throw new Error('El nombre de la sede es obligatorio');
  }
  return prisma.branch.create({
    data: { name: data.name.trim() },
  });
}

async function update(id, data) {
  if (!data.name?.trim()) {
    throw new Error('El nombre de la sede es obligatorio');
  }
  return prisma.branch.update({
    where: { id },
    data: { name: data.name.trim() },
  });
}

async function remove(id) {
  const usage = await prisma.$transaction(async (tx) => {
    const users = await tx.user.count({ where: { branchId: id } });
    const products = await tx.product.count({ where: { branchId: id } });
    const sales = await tx.sale.count({ where: { branchId: id } });
    const credits = await tx.credit.count({ where: { branchId: id } });
    return users + products + sales + credits;
  });

  if (usage > 0) {
    throw new Error('No se puede eliminar la sede porque tiene datos relacionados');
  }

  return prisma.branch.delete({ where: { id } });
}

module.exports = { ensureDefaultBranches, getAll, create, update, remove };
