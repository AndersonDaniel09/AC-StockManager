const prisma = require('../config/prisma');

function resolveBranchFilter(user, requestedBranchId) {
  if (user?.role === 'ADMIN') {
    if (!requestedBranchId) return {};
    return { branchId: Number(requestedBranchId) };
  }
  if (!user?.branchId) return {};
  return { branchId: user.branchId };
}

async function getAll(user, requestedBranchId) {
  return prisma.product.findMany({
    where: resolveBranchFilter(user, requestedBranchId),
    include: { category: true, branch: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

async function getByCategory(categoryId, user, requestedBranchId) {
  return prisma.product.findMany({
    where: { categoryId, ...resolveBranchFilter(user, requestedBranchId) },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

async function getOne(id, user, requestedBranchId) {
  return prisma.product.findFirst({
    where: { id, ...resolveBranchFilter(user, requestedBranchId) },
    include: { category: true, branch: { select: { id: true, name: true } } },
  });
}

async function create(data, user) {
  const branchId = user?.role === 'ADMIN'
    ? (data.branchId ? Number(data.branchId) : null)
    : (user?.branchId ?? null);

  if (!branchId) {
    throw new Error('Debe seleccionar una sede para crear el producto');
  }

  return prisma.product.create({
    data: {
      name: data.name,
      imageUrl: data.imageUrl,
      price: data.price,
      stock: data.stock,
      categoryId: data.categoryId,
      branchId,
    }
  });
}

async function update(id, data, user) {
  const branchFilter = resolveBranchFilter(user, data.branchId);
  const existing = await prisma.product.findFirst({ where: { id, ...branchFilter } });
  if (!existing) throw new Error('Producto no encontrado en la sede seleccionada');

  const branchId = user?.role === 'ADMIN'
    ? (data.branchId ? Number(data.branchId) : existing.branchId)
    : (user?.branchId ?? existing.branchId);

  return prisma.product.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      imageUrl: data.imageUrl,
      price: data.price,
      stock: data.stock,
      categoryId: data.categoryId,
      branchId,
    }
  });
}

async function remove(id, user, requestedBranchId) {
  const existing = await prisma.product.findFirst({
    where: { id, ...resolveBranchFilter(user, requestedBranchId) },
  });
  if (!existing) throw new Error('Producto no encontrado en la sede seleccionada');
  return prisma.product.delete({ where: { id: existing.id } });
}

async function getLowStock(user, requestedBranchId, threshold = 3) {
  const maxStock = Number(threshold) || 3;
  const products = await prisma.product.findMany({
    where: {
      ...resolveBranchFilter(user, requestedBranchId),
      stock: { lte: maxStock },
    },
    include: {
      category: { select: { name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: [{ stock: 'asc' }, { name: 'asc' }],
  });

  return {
    threshold: maxStock,
    count: products.length,
    items: products,
  };
}

module.exports = { getAll, getByCategory, getOne, create, update, remove, getLowStock };
