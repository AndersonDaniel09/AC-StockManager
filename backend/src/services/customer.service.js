const prisma = require('../config/prisma');

async function getAll(query) {
  const q = (query || '').trim();
  return prisma.customer.findMany({
    where: {
      isDeleted: false,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { idNumber: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    take: q ? 20 : 200,
  });
}

async function getDeleted(query) {
  const q = (query || '').trim();
  return prisma.customer.findMany({
    where: {
      isDeleted: true,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { idNumber: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ deletedAt: 'desc' }, { firstName: 'asc' }, { lastName: 'asc' }],
    take: q ? 20 : 200,
  });
}

async function create(data) {
  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();
  const phone = data.phone?.trim();
  const idNumber = data.idNumber?.trim();

  if (!firstName || !lastName || !phone || !idNumber) {
    throw new Error('Nombre, apellido, celular y cédula son obligatorios');
  }

  return prisma.customer.create({
    data: { firstName, lastName, phone, idNumber },
  });
}

async function update(id, data) {
  const existing = await prisma.customer.findUnique({ where: { id }, select: { id: true, isDeleted: true } });
  if (!existing || existing.isDeleted) {
    throw new Error('Cliente no encontrado');
  }

  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();
  const phone = data.phone?.trim();
  const idNumber = data.idNumber?.trim();

  if (!firstName || !lastName || !phone || !idNumber) {
    throw new Error('Nombre, apellido, celular y cédula son obligatorios');
  }

  const duplicate = await prisma.customer.findFirst({
    where: {
      idNumber,
      NOT: { id },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error('Ya existe un cliente registrado con esa cédula');
  }

  return prisma.customer.update({
    where: { id },
    data: { firstName, lastName, phone, idNumber },
  });
}

async function markCustomerAsDeleted(tx, customerId) {
  return tx.customer.update({
    where: { id: customerId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}

async function remove(id, actor) {
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, isDeleted: true } });
  if (!customer || customer.isDeleted) {
    throw new Error('Cliente no encontrado');
  }

  if (actor?.role === 'ADMIN') {
    await prisma.$transaction(async (tx) => {
      await markCustomerAsDeleted(tx, id);
    });

    return {
      deleted: true,
      pendingApproval: false,
      message: 'Cliente eliminado correctamente',
      customerId: id,
    };
  }

  const existingPending = await prisma.customerDeleteRequest.findFirst({
    where: { customerId: id, status: 'PENDING' },
    select: { id: true },
  });

  if (existingPending) {
    return {
      deleted: false,
      pendingApproval: true,
      requestCreated: false,
      message: 'Ya existe una solicitud pendiente para eliminar este cliente',
      requestId: existingPending.id,
      customerId: id,
    };
  }

  const request = await prisma.customerDeleteRequest.create({
    data: {
      customerId: id,
      requestedById: actor.id,
    },
  });

  return {
    deleted: false,
    pendingApproval: true,
    requestCreated: true,
    message: 'Solicitud enviada al administrador para aprobación',
    requestId: request.id,
    customerId: id,
  };
}

async function selfRegister(data) {
  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();
  const phone = data.phone?.trim();
  const idNumber = data.idNumber?.trim();
  const requestUpdate = !!data.requestUpdate;

  if (!firstName || !lastName || !phone || !idNumber) {
    throw new Error('Nombres, apellidos, cédula y celular son obligatorios');
  }

  // Evitar duplicados por cédula o crear solicitud de actualización
  const existing = await prisma.customer.findFirst({ where: { idNumber, isDeleted: false } });
  if (existing) {
    if (!requestUpdate) {
      throw Object.assign(new Error('Este número ya está registrado. ¿Deseas solicitar actualización de datos?'), { code: 'DUPLICATE' });
    }

    const pendingRequest = await prisma.customerUpdateRequest.findFirst({
      where: {
        customerId: existing.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pendingRequest) {
      const request = await prisma.customerUpdateRequest.update({
        where: { id: pendingRequest.id },
        data: {
          proposedFirstName: firstName,
          proposedLastName: lastName,
          proposedPhone: phone,
          proposedIdNumber: idNumber,
        },
      });
      return { request, customer: existing, requestCreated: false };
    }

    const request = await prisma.customerUpdateRequest.create({
      data: {
        customerId: existing.id,
        proposedFirstName: firstName,
        proposedLastName: lastName,
        proposedPhone: phone,
        proposedIdNumber: idNumber,
      },
    });

    return { request, customer: existing, requestCreated: true };
  }

  const customer = await prisma.customer.create({
    data: { firstName, lastName, phone, idNumber },
  });

  return { customer, request: null, requestCreated: false };
}

async function getPublicDebtByIdNumber(idNumber) {
  const normalizedId = String(idNumber || '').trim();
  if (!normalizedId) {
    throw new Error('La cédula es obligatoria');
  }

  const customer = await prisma.customer.findFirst({
    where: { idNumber: normalizedId, isDeleted: false },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      idNumber: true,
      phone: true,
    },
  });

  if (!customer) {
    throw Object.assign(new Error('No se encontró un cliente registrado con esa cédula'), { statusCode: 404 });
  }

  const pendingCredits = await prisma.credit.findMany({
    where: {
      customerId: customer.id,
      status: 'PENDING',
    },
    include: {
      branch: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const credits = pendingCredits.map((credit) => {
    const total = (credit.items || []).reduce(
      (sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)),
      0
    );

    return {
      id: credit.id,
      createdAt: credit.createdAt,
      branch: credit.branch,
      note: credit.note,
      status: credit.status,
      total,
      items: (credit.items || []).map((item) => ({
        id: item.id,
        productName: item.product?.name || 'Producto',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subTotal: Number(item.unitPrice || 0) * Number(item.quantity || 0),
      })),
    };
  });

  const totalPending = credits.reduce((sum, credit) => sum + Number(credit.total || 0), 0);

  return {
    customer,
    credits,
    totalPending,
  };
}

async function getPendingUpdateRequests() {
  return prisma.customerUpdateRequest.findMany({
    where: { status: 'PENDING', customer: { isDeleted: false } },
    include: {
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function reviewUpdateRequest(id, data, reviewerId) {
  const approve = !!data.approve;

  const request = await prisma.customerUpdateRequest.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!request) {
    throw new Error('Solicitud no encontrada');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Esta solicitud ya fue procesada');
  }

  const reviewedAt = new Date();

  if (!approve) {
    return prisma.customerUpdateRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewedAt,
      },
      include: { customer: true, reviewedBy: { select: { id: true, name: true } } },
    });
  }

  const duplicateId = await prisma.customer.findFirst({
    where: {
      idNumber: request.proposedIdNumber,
      NOT: { id: request.customerId },
    },
    select: { id: true },
  });

  if (duplicateId) {
    throw new Error('La cédula propuesta ya pertenece a otro cliente');
  }

  return prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: request.customerId },
      data: {
        firstName: request.proposedFirstName,
        lastName: request.proposedLastName,
        phone: request.proposedPhone,
        idNumber: request.proposedIdNumber,
      },
    });

    return tx.customerUpdateRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        reviewedAt,
      },
      include: { customer: true, reviewedBy: { select: { id: true, name: true } } },
    });
  });
}

async function getPendingDeleteRequests() {
  return prisma.customerDeleteRequest.findMany({
    where: { status: 'PENDING', customer: { isDeleted: false } },
    include: {
      customer: true,
      requestedBy: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function reviewDeleteRequest(id, data, reviewerId) {
  const approve = !!data.approve;

  const request = await prisma.customerDeleteRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      requestedBy: { select: { id: true, name: true, username: true } },
    },
  });

  if (!request) {
    throw new Error('Solicitud no encontrada');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Esta solicitud ya fue procesada');
  }

  const reviewedAt = new Date();

  if (!approve) {
    return prisma.customerDeleteRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewedAt,
      },
      include: {
        customer: true,
        requestedBy: { select: { id: true, name: true, username: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.customerDeleteRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        reviewedAt,
      },
    });

    await markCustomerAsDeleted(tx, request.customerId);
  });

  return {
    id: request.id,
    status: 'APPROVED',
    reviewedById: reviewerId,
    reviewedAt,
    customerId: request.customerId,
  };
}

async function restore(id) {
  const existing = await prisma.customer.findUnique({ where: { id }, select: { id: true, isDeleted: true } });
  if (!existing || !existing.isDeleted) {
    throw new Error('Cliente no encontrado en historial');
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      restoredAt: new Date(),
    },
  });

  await prisma.customerDeleteRequest.updateMany({
    where: { customerId: id, status: 'PENDING' },
    data: { status: 'REJECTED' },
  });

  return customer;
}

module.exports = {
  getAll,
  getDeleted,
  create,
  update,
  remove,
  restore,
  selfRegister,
  getPublicDebtByIdNumber,
  getPendingUpdateRequests,
  reviewUpdateRequest,
  getPendingDeleteRequests,
  reviewDeleteRequest,
};
