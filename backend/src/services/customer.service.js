const prisma = require('../config/prisma');

async function getAll(query) {
  const q = (query || '').trim();
  return prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { idNumber: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
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
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
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
  const existing = await prisma.customer.findFirst({ where: { idNumber } });
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

async function getPendingUpdateRequests() {
  return prisma.customerUpdateRequest.findMany({
    where: { status: 'PENDING' },
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

module.exports = { getAll, create, update, selfRegister, getPendingUpdateRequests, reviewUpdateRequest };
