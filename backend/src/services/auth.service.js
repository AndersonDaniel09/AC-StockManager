const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

function buildUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    branchId: user.branchId ?? null,
    branchName: user.branch?.name ?? null,
    role: user.role,
    canAddProducts: user.canAddProducts,
    canSell: user.canSell,
    canEditProducts: user.canEditProducts,
  };
}

async function generateUniqueUsernameFromEmail(email) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'empleado';
  let candidate = base;
  let suffix = 1;

  while (true) {
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) {
      return candidate;
    }
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
}

async function login(username, password) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }],
    },
    include: { branch: { select: { name: true } } },
  });
  if (!user) throw new Error('Usuario o contraseña incorrectos');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Usuario o contraseña incorrectos');

  const token = jwt.sign(
    buildUserPayload(user),
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  return {
    token,
    user: buildUserPayload(user)
  };
}

async function register(data) {
  if (!data.firstName || !data.lastName || !data.email || !data.password) {
    throw new Error('Nombres, apellidos, correo y contraseña son obligatorios');
  }

  if (data.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const emailExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (emailExists) throw new Error('El correo ya está registrado');

  const username = await generateUniqueUsernameFromEmail(normalizedEmail);
  const hashed = await bcrypt.hash(data.password, 10);
  const role = data.role || 'SELLER';
  const branchId = data.branchId ? Number(data.branchId) : null;

  if (role !== 'ADMIN' && !branchId) {
    throw new Error('La sede es obligatoria para empleados');
  }

  const user = await prisma.user.create({
    data: {
      name: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
      username,
      email: normalizedEmail,
      password: hashed,
      role,
      branchId,
      canSell: !!data.canSell,
      canEditProducts: !!data.canEditProducts,
      canAddProducts: !!data.canEditProducts,
      setupToken: null,
      setupTokenExpiresAt: null,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      branchId: true,
      branch: { select: { name: true } },
      role: true,
      canAddProducts: true,
      canSell: true,
      canEditProducts: true,
    }
  });

  return { user };
}

async function setupPassword({ token, password }) {
  if (!token || !password) {
    throw new Error('Token y contraseña son obligatorios');
  }
  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const user = await prisma.user.findFirst({
    where: {
      setupToken: token,
      setupTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error('El enlace de activación es inválido o expiró');
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      setupToken: null,
      setupTokenExpiresAt: null,
    },
  });

  return { message: 'Contraseña creada correctamente. Ya puedes iniciar sesión.' };
}

module.exports = { login, register, setupPassword };
