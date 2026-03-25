import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import AppLayout from '../components/AppLayout';
import { getSales } from '../services/sale.service';
import { getCredits } from '../services/credit.service';

function currency(value) {
  return `$${Number(value || 0).toLocaleString('es-CO')}`;
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function EmployeeHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  const canSell = user?.canSell;
  const canEdit = user?.canEditProducts;

  useEffect(() => {
    if (!canSell) {
      setLoading(false);
      return;
    }
    Promise.all([getSales(), getCredits()])
      .then(([salesRes, creditsRes]) => {
        setSales(salesRes.data || []);
        setCredits(creditsRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canSell]);

  const mySales = useMemo(
    () => sales.filter((s) => s.seller?.id === user?.id),
    [sales, user?.id]
  );

  const myCredits = useMemo(
    () => credits.filter((c) => c.sellerId === user?.id || c.seller?.id === user?.id),
    [credits, user?.id]
  );

  const todayKey = getDateKey(new Date());

  const todaySales = useMemo(
    () => mySales.filter((s) => getDateKey(new Date(s.createdAt)) === todayKey),
    [mySales, todayKey]
  );

  const todayRevenue = useMemo(
    () => todaySales.reduce((sum, s) => sum + (s.total || 0), 0),
    [todaySales]
  );

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    return d;
  }, []);

  const weekSales = useMemo(
    () => mySales.filter((s) => new Date(s.createdAt) >= weekStart),
    [mySales, weekStart]
  );

  const weekRevenue = useMemo(
    () => weekSales.reduce((sum, s) => sum + (s.total || 0), 0),
    [weekSales]
  );

  const pendingCredits = useMemo(
    () => myCredits.filter((c) => c.status === 'PENDING'),
    [myCredits]
  );

  const pendingAmount = useMemo(
    () => pendingCredits.reduce(
      (sum, c) => sum + (c.items || []).reduce((a, i) => a + (i.unitPrice || 0) * (i.quantity || 0), 0),
      0
    ),
    [pendingCredits]
  );

  const recentSales = useMemo(() => mySales.slice(0, 6), [mySales]);

  return (
    <AppLayout
      title={`${greeting()}, ${user?.name || 'empleado'}`}
      subtitle={`Sede: ${user?.branchName || user?.branch?.name || '—'} · ${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}`}
    >
      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => canSell && navigate('/sell')}
          className={`rounded-2xl p-4 text-left font-bold shadow-sm border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${canSell ? 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-2 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg">Vender</p>
          <p className={`text-xs mt-0.5 font-semibold ${canSell ? 'text-emerald-100' : 'text-slate-400'}`}>{canSell ? 'Autorizado' : 'Sin permiso'}</p>
        </button>

        <button
          onClick={() => canSell && navigate('/sales')}
          className={`rounded-2xl p-4 text-left font-bold shadow-sm border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${canSell ? 'bg-sky-600 border-sky-700 text-white hover:bg-sky-700' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-2 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-lg">Historial</p>
          <p className={`text-xs mt-0.5 font-semibold ${canSell ? 'text-sky-100' : 'text-slate-400'}`}>{canSell ? 'Ver ventas y fiados' : 'Sin permiso'}</p>
        </button>

        <button
          onClick={() => canSell && navigate('/customers')}
          className={`rounded-2xl p-4 text-left font-bold shadow-sm border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${canSell ? 'bg-violet-600 border-violet-700 text-white hover:bg-violet-700' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-2 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg">Clientes</p>
          <p className={`text-xs mt-0.5 font-semibold ${canSell ? 'text-violet-100' : 'text-slate-400'}`}>{canSell ? 'Ver clientes' : 'Sin permiso'}</p>
        </button>

        <button
          onClick={() => canEdit && navigate('/admin/products')}
          className={`rounded-2xl p-4 text-left font-bold shadow-sm border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${canEdit ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-2 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-lg">Productos</p>
          <p className={`text-xs mt-0.5 font-semibold ${canEdit ? 'text-amber-100' : 'text-slate-400'}`}>{canEdit ? 'Editar inventario' : 'Sin permiso'}</p>
        </button>
      </div>

      {!canSell && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <p className="font-bold text-amber-900">Permisos pendientes</p>
          <p className="text-amber-800 mt-1 text-sm">Solicita al administrador activar tus permisos para ver tus estadísticas.</p>
        </div>
      )}

      {canSell && (
        <>
          {/* Estadísticas */}
          {loading ? (
            <p className="text-slate-500 font-medium mb-6">Cargando estadísticas...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ventas hoy</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{todaySales.length}</p>
                  <p className="text-sm font-semibold text-emerald-700 mt-1">{currency(todayRevenue)}</p>
                </div>
                <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Esta semana</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-sky-700 mt-1">{weekSales.length}</p>
                  <p className="text-sm font-semibold text-sky-600 mt-1">{currency(weekRevenue)}</p>
                </div>
                <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total ventas</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-violet-700 mt-1">{mySales.length}</p>
                  <p className="text-xs text-slate-400 mt-1">desde el inicio</p>
                </div>
                <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fiados pendientes</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">{pendingCredits.length}</p>
                  <p className="text-sm font-semibold text-amber-600 mt-1">{currency(pendingAmount)}</p>
                </div>
              </div>

              {/* Últimas ventas */}
              <div className="ui-card p-5">
                <h3 className="text-base font-bold text-slate-900 mb-3">Mis últimas ventas</h3>
                {recentSales.length === 0 ? (
                  <p className="text-slate-500 text-sm">Aún no registras ventas.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {recentSales.map((sale) => {
                      const items = (sale.items || []).map((i) => `${i.product?.name || 'Producto'} ×${i.quantity}`).join(', ');
                      return (
                        <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 last:border-0 gap-2 sm:gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{items || `Venta #${sale.id}`}</p>
                            <p className="text-xs text-slate-400">{new Date(sale.createdAt).toLocaleString('es-CO')}</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-700 shrink-0">{currency(sale.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
