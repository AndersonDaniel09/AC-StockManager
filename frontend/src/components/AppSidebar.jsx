import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5V20h11V10.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" strokeLinejoin="round" />
    </svg>
  );
}

function SellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v16M4 12h16" strokeLinecap="round" />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4h8l4 4v12H7V4Z" strokeLinejoin="round" />
      <path d="M15 4v4h4" strokeLinejoin="round" />
      <path d="M10 13h6M10 16h6" strokeLinecap="round" />
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" strokeLinecap="round" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M21 19v-1a4 4 0 0 0-3-3.87" strokeLinecap="round" />
      <path d="M14 4.2a3 3 0 0 1 0 5.6" strokeLinecap="round" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" strokeLinejoin="round" />
      <path d="M12 4v16" />
      <path d="M4 8.5 12 13l8-4.5" strokeLinejoin="round" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 19a5 5 0 0 1 10 0" strokeLinecap="round" />
      <path d="M13.5 19a3.5 3.5 0 0 1 7 0" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.8v2.1M12 18.1v2.1M20.2 12h-2.1M5.9 12H3.8M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5M17.8 17.8l-1.5-1.5M7.7 7.7 6.2 6.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="7.2" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" strokeLinecap="round" />
      <path d="M14 16l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h9" strokeLinecap="round" />
    </svg>
  );
}

function linkClass(isActive) {
  return `group w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
    isActive
      ? 'bg-sky-50 text-sky-700 border border-sky-100'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
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

  const menuItems = [
    ...(user?.role !== 'ADMIN' ? [{ to: '/', label: 'Inicio', icon: HomeIcon }] : []),
    ...(user?.role === 'ADMIN' ? [{ to: '/admin/dashboard', label: 'Panel principal', icon: DashboardIcon }] : []),
    ...((user?.role === 'ADMIN' || user?.canSell) ? [{ to: '/sell', label: 'Vender', icon: SellIcon }] : []),
    ...((user?.role === 'ADMIN' || user?.canSell) ? [{ to: '/sales', label: 'Cobro de fiados', icon: CreditIcon }] : []),
    ...((user?.role === 'ADMIN' || user?.canSell || user?.canEditProducts)
      ? [{ to: '/customers', label: 'Clientes', icon: CustomersIcon }]
      : []),
    ...((user?.role === 'ADMIN' || user?.canEditProducts)
      ? [{ to: '/admin/products', label: 'Gestionar productos', icon: ProductsIcon }]
      : []),
    ...(user?.role === 'ADMIN' ? [{ to: '/admin/categories', label: 'Gestionar categorías', icon: CategoriesIcon }] : []),
    ...((user?.role === 'ADMIN' || user?.canEditProducts) ? [{ to: '/admin', label: 'Usuarios', icon: UsersIcon }] : []),
  ];

  return (
    <aside className={`${mobile ? 'w-full h-full rounded-none' : 'w-64 h-screen'} relative bg-white border-r border-slate-200 p-4 overflow-visible`}>
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

      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center font-extrabold text-lg">
            AC
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">StockManager</h1>
            <p className="text-xs text-slate-500">Control de inventario</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => linkClass(isActive)} onClick={handleNavigate}>
              <span className="shrink-0"><Icon /></span>
              <span className="text-sm truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleOpenSettings}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2 mb-2"
        >
          <SettingsIcon />
          Configuraciones
        </button>

        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition flex items-center justify-center gap-2"
        >
          <LogoutIcon />
          Cerrar sesión
        </button>
      </div>
      </div>
    </aside>
  );
}
