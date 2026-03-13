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
  return prisma.credit.findMany({
    where: resolveBranchFilter(user, requestedBranchId),
    include: {
      customer: true,
      branch: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: {
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function getOne(id, user, requestedBranchId) {
  return prisma.credit.findFirst({
    where: { id, ...resolveBranchFilter(user, requestedBranchId) },
    include: {
      customer: true,
      branch: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: {
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      },
    }
  });
}

async function create(data, sellerId, userContext) {
  return prisma.$transaction(async (tx) => {
    const customerId = Number(data.customerId);
    if (!customerId) {
      throw new Error('Debes seleccionar un cliente registrado para fiar');
    }
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

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

      itemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price });

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: product.stock - item.quantity }
      });
    }

    const existingPendingCredit = await tx.credit.findFirst({
      where: {
        customerId,
        branchId,
        status: 'PENDING',
      },
    });

    const noteToAppend = data.note?.trim();

    if (existingPendingCredit) {
      const mergedNote = noteToAppend
        ? [existingPendingCredit.note, `[${new Date().toLocaleString('es-CO')}] ${noteToAppend}`].filter(Boolean).join('\n')
        : existingPendingCredit.note;

      return tx.credit.update({
        where: { id: existingPendingCredit.id },
        data: {
          personName: `${customer.firstName} ${customer.lastName}`,
          note: mergedNote || null,
          items: { create: itemsData },
        },
        include: {
          customer: true,
          branch: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          items: {
            include: { product: true },
            orderBy: { createdAt: 'desc' },
          },
        }
      });
    }

    return tx.credit.create({
      data: {
        personName: `${customer.firstName} ${customer.lastName}`,
        customerId,
        note: noteToAppend || null,
        sellerId,
        branchId,
        items: { create: itemsData }
      },
      include: {
        customer: true,
        branch: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
      }
    });
  });
}

async function updateStatus(id, status) {
  return prisma.credit.update({
    where: { id },
    data: { status },
    include: {
      customer: true,
      branch: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      items: {
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      },
    }
  });
}

module.exports = { getAll, getOne, create, updateStatus };
