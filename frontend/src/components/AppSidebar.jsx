import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

function linkClass(isActive) {
  return `w-full text-left px-4 py-3 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    isActive
      ? 'bg-sky-500 text-white shadow'
      : 'bg-slate-800/80 text-slate-100 hover:bg-slate-700'
  }`;
}

export default function AppSidebar({ mobile = false, onNavigate, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleNavigate() {
    if (mobile && onNavigate) onNavigate();
  }

  function handleLogout() {
    if (mobile && onNavigate) onNavigate();
    logout();
  }

  function handleOpenSettings() {
    if (mobile && onNavigate) onNavigate();
    navigate('/settings');
  }

  return (
    <aside className={`${mobile ? 'w-full h-full' : 'w-64 h-screen'} relative bg-slate-900 border-r border-slate-800 p-4 overflow-visible`}>
      {mobile && (
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-5 top-1/2 -translate-y-1/2 z-30 inline-flex items-center justify-center w-11 h-11 rounded-full border border-sky-300 bg-sky-500 text-white shadow-xl hover:bg-sky-400 transition"
          aria-label="Esconder menú"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <div className="h-full flex flex-col overflow-y-auto">

      <div className="mb-6">
        <h1 className="leading-none font-extrabold text-white">
          <span className="block text-5xl">AC</span>
          <span className="block text-3xl whitespace-nowrap">StockManager</span>
        </h1>
        <p className="text-sm text-slate-300 mt-2">Control de inventario</p>
      </div>

      <nav className="flex flex-col gap-2">
        {user?.role !== 'ADMIN' && (
          <NavLink to="/" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
            Inicio
          </NavLink>
        )}
        {user?.role === 'ADMIN' && (
          <NavLink to="/admin/dashboard" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
            Panel principal
          </NavLink>
        )}
        {(user?.role === 'ADMIN' || user?.canSell) && (
          <NavLink to="/sell" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
            Vender
          </NavLink>
        )}
        {(user?.role === 'ADMIN' || user?.canSell) && (
          <NavLink to="/sales" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
            Historial de productos
          </NavLink>
        )}
        {(user?.role === 'ADMIN' || user?.canSell || user?.canEditProducts) && (
          <NavLink to="/customers" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
            Clientes
          </NavLink>
        )}
        {(user?.role === 'ADMIN' || user?.canEditProducts) && (
          <NavLink to="/admin/products" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
            Gestionar productos
          </NavLink>
        )}
        {user?.role === 'ADMIN' && (
          <>
            <NavLink to="/admin/categories" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
              Gestionar categorías
            </NavLink>
          </>
        )}
        {(user?.role === 'ADMIN' || user?.canEditProducts) && (
          <NavLink to="/admin" end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
            Usuarios
          </NavLink>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-700">
        <p className="text-sm text-white font-semibold">{user?.name}</p>
        <p className="text-xs text-slate-300 mb-3">{user?.role === 'ADMIN' ? 'Administrador' : 'Empleado'}</p>

        <button
          type="button"
          onClick={handleOpenSettings}
          className="w-full ui-btn ui-btn-neutral mb-2"
        >
          Configuraciones
        </button>

        <button
          onClick={handleLogout}
          className="w-full ui-btn ui-btn-danger"
        >
          Cerrar sesión
        </button>
      </div>
      </div>
    </aside>
  );
}
