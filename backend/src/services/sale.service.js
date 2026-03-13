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
  return prisma.sale.findMany({
    where: resolveBranchFilter(user, requestedBranchId),
    include: {
      branch: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getOne(id, user, requestedBranchId) {
  return prisma.sale.findFirst({
    where: { id, ...resolveBranchFilter(user, requestedBranchId) },
    include: {
      branch: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });
}

async function create(data, sellerId, userContext) {
  // data.items = [{ productId, quantity }]
  return prisma.$transaction(async (tx) => {
    let total = 0;
    const itemsData = [];
    let branchId = null;

    if (userContext?.role === 'ADMIN' && data.branchId) {
      branchId = Number(data.branchId);
    } else {
      const seller = await tx.user.findUnique({ where: { id: sellerId }, select: { branchId: true } });
      branchId = seller?.branchId ?? null;
    }

    for (const item of data.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error(`Producto ${item.productId} no encontrado`);
      if (branchId && product.branchId !== branchId) {
        throw new Error(`El producto "${product.name}" no pertenece a la sede seleccionada`);
      }
      if (!branchId && product.branchId) {
        branchId = product.branchId;
      }
      if (product.stock < item.quantity) throw new Error(`Stock insuficiente para "${product.name}"`);

      total += product.price * item.quantity;
      itemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price });

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: product.stock - item.quantity }
      });
    }

    return tx.sale.create({
      data: {
        total,
        sellerId,
        branchId,
        items: { create: itemsData }
      },
      include: {
        branch: { select: { id: true, name: true } },
        items: { include: { product: true } },
      }
    });
  });
}

module.exports = { getAll, getOne, create };
