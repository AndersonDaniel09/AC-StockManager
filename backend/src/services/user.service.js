const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

async function getAll() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
      role: true,
      canAddProducts: true,
      canSell: true,
      canEditProducts: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' }
  });
}

async function updatePermissions(id, data) {
  return prisma.user.update({
    where: { id },
    data: {
      canSell: data.canSell,
      canEditProducts: data.canEditProducts,
      canAddProducts: data.canEditProducts,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
      role: true,
      canAddProducts: true,
      canSell: true,
      canEditProducts: true,
    }
  });
}

async function update(id, data) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true, branchId: true },
  });

  if (!existing) {
    throw new Error('Usuario no encontrado');
  }

  if (existing.role === 'ADMIN') {
    throw new Error('No se permite editar cuentas administradoras desde este módulo');
  }

  const name = (data.name || '').trim();
  if (!name) {
    throw new Error('El nombre es obligatorio');
  }

  const normalizedEmail = (data.email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('El correo es obligatorio');
  }

  if (normalizedEmail !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (emailTaken && emailTaken.id !== id) {
      throw new Error('El correo ya está registrado');
    }
  }

  const branchId = data.branchId ? Number(data.branchId) : null;
  if (!branchId) {
    throw new Error('La sede es obligatoria para empleados');
  }

  const updateData = {
    name,
    email: normalizedEmail,
    branchId,
    canSell: !!data.canSell,
    canEditProducts: !!data.canEditProducts,
    canAddProducts: !!data.canEditProducts,
  };

  if (data.password) {
    const password = String(data.password);
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
      role: true,
      canAddProducts: true,
      canSell: true,
      canEditProducts: true,
    }
  });
}

async function remove(id) {
  return prisma.user.delete({ where: { id } });
}

async function getSales(id, branchId) {
  const where = { sellerId: id };
  if (branchId) where.branchId = Number(branchId);

  return prisma.sale.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = { getAll, update, updatePermissions, remove, getSales };
