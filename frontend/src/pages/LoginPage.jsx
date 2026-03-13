import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth.service';
import { useAuth } from '../store/AuthContext';

function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-cyan-200">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-cyan-200">
      <path d="M12 3 5 6v6c0 4.3 2.9 7.7 7 8.9 4.1-1.2 7-4.6 7-8.9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9.2 12.3 1.9 1.9 3.7-4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shinePosition, setShinePosition] = useState({ x: 50, y: 50 });
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  function handleCardMouseMove(event) {
    const cardRect = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - cardRect.left) / cardRect.width) * 100;
    const pointerY = ((event.clientY - cardRect.top) / cardRect.height) * 100;
    setShinePosition({ x: pointerX, y: pointerY });
  }

  function handleCardMouseLeave() {
    setShinePosition({ x: 50, y: 50 });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form);
      saveSession(res.data.token, res.data.user);
      if (res.data.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute left-10 top-14 w-52 h-52 rounded-full bg-cyan-300/60 blur-3xl" />
      <div className="pointer-events-none absolute right-12 top-28 w-48 h-48 rounded-full bg-sky-300/55 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-10 w-56 h-40 rounded-full bg-cyan-300/35 blur-3xl" />

      <div
        className="relative overflow-hidden bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl border border-slate-200 grid md:grid-cols-2"
        onMouseMove={handleCardMouseMove}
        onMouseLeave={handleCardMouseLeave}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: `radial-gradient(260px circle at ${shinePosition.x}% ${shinePosition.y}%, rgba(56,189,248,0.2), transparent 68%)`,
          }}
        />

        <section className="relative z-10 hidden md:block bg-gradient-to-b from-sky-900 to-cyan-900 text-white p-8 md:p-10">
          <p className="text-xs tracking-[0.3em] text-cyan-200 uppercase">Bienvenido</p>
          <h1 className="text-5xl font-extrabold leading-tight mt-2">AC StockManager</h1>
          <p className="mt-5 text-cyan-100 text-xl leading-relaxed max-w-md">
            Gestiona productos, ventas y fiados desde un panel moderno y seguro.
          </p>

          <div className="mt-8 grid gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-cyan-700/50 bg-cyan-900/30 px-4 py-3">
              <CheckBadgeIcon />
              <div>
                <p className="font-semibold text-cyan-50">Inventario actualizado</p>
                <p className="text-cyan-200 text-sm">Control de stock y movimientos en tiempo real.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-cyan-700/50 bg-cyan-900/30 px-4 py-3">
              <CheckBadgeIcon />
              <div>
                <p className="font-semibold text-cyan-50">Ventas y fiados centralizados</p>
                <p className="text-cyan-200 text-sm">Consulta histórico y estado de pagos en un solo lugar.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-cyan-700/50 bg-cyan-900/30 px-4 py-3">
              <ShieldIcon />
              <div>
                <p className="font-semibold text-cyan-50">Acceso seguro</p>
                <p className="text-cyan-200 text-sm">Sesiones protegidas con roles y permisos por usuario.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-cyan-600/40 bg-cyan-950/30 px-4 py-3">
            <p className="text-cyan-100 text-sm font-semibold">Estado del sistema: Operativo</p>
          </div>
        </section>

        <section className="relative z-10 p-5 sm:p-8 md:p-10">
          <div className="md:hidden mb-5 rounded-xl bg-gradient-to-r from-sky-900 to-cyan-900 text-white px-4 py-3">
            <p className="text-[11px] tracking-[0.22em] text-cyan-100 uppercase">Bienvenido</p>
            <p className="text-2xl font-extrabold leading-tight">AC StockManager</p>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800">Iniciar sesión</h2>
          <p className="text-slate-500 text-base sm:text-lg mt-2 mb-6 sm:mb-8">Ingresa con tus credenciales para continuar.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-2">Usuario o correo</label>
              <input
                type="text"
                placeholder="Ingresa tu usuario o correo"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="ui-input bg-slate-100 text-base sm:text-lg focus:ring-sky-400"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-2">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="ui-input bg-slate-100 text-base sm:text-lg focus:ring-sky-400"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="ui-btn ui-btn-primary w-full !py-3 !text-lg sm:!text-xl"
            >
              {loading ? 'Entrando...' : 'Entrar al sistema'}
            </button>
          </form>

          <div className="mt-4 sm:mt-5 ui-card bg-slate-100 p-3 sm:p-4">
            <p className="text-slate-500 text-sm sm:text-base">Usa tu usuario/correo y tu contraseña activa.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
