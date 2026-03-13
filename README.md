# AC StockManager

Sistema web de inventario y ventas con control de usuarios, clientes y fiados.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Base de datos:** Prisma ORM (SQLite en desarrollo)
- **Autenticación:** JWT

## Estructura

- `frontend/` → aplicación cliente
- `backend/` → API REST + Prisma

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

### 1) Instalar dependencias del backend

```bash
cd backend
npm install
```

### 2) Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

## Configuración de entorno

Crear archivo `backend/.env` con valores similares a:

```env
PORT=3000
HOST=0.0.0.0
JWT_SECRET=tu_clave_secreta
DATABASE_URL="file:./prisma/dev.db"
```

## Base de datos (Prisma)

Desde `backend/`:

```bash
npx prisma migrate deploy
npm run prisma:generate
npm run seed
```

Para desarrollo también puedes usar:

```bash
npx prisma migrate dev
```

## Ejecutar en desarrollo

### Opción 1: por separado

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

### Opción 2: desde la raíz (Windows)

```bash
npm run dev
```

## Acceso local y red

- Frontend local: `http://localhost:5173` (o siguiente puerto disponible)
- Backend local: `http://localhost:3000`
- Health API: `http://localhost:3000/api/health`

Para abrir desde celular en la misma red:

- Ejecutar frontend con host LAN (`frontend`):

```bash
npm run dev:lan
```

- Usar la IP del PC en Wi-Fi, por ejemplo: `http://192.168.x.x:5173`

## Scripts principales

### Raíz

- `npm run dev` → abre backend + frontend en ventanas separadas (Windows)
- `npm run migrate` → ejecuta migraciones en backend
- `npm run seed` → ejecuta seed en backend

### Backend (`backend/package.json`)

- `npm run dev` → nodemon
- `npm run start` → modo producción
- `npm run prisma:generate` → regenera cliente Prisma
- `npm run seed` → carga datos iniciales

### Frontend (`frontend/package.json`)

- `npm run dev` → Vite
- `npm run dev:lan` → Vite en LAN (`0.0.0.0:5173`)
- `npm run build` → build de producción
- `npm run preview` → previsualizar build

## Notas para GitHub

Este repositorio ya ignora:

- `node_modules`
- archivos `.env`
- outputs de build (`dist`, `build`)
- logs
- archivos locales de SQLite (`*.db`, `*.db-journal`)

Antes de publicar, verifica no incluir credenciales reales en ningún archivo versionado.
