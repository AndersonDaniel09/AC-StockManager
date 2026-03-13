import { useEffect, useState, useMemo } from 'react';
import { getSales } from '../services/sale.service';
import { getCredits, updateCreditStatus } from '../services/credit.service';
import AppLayout from '../components/AppLayout';
import { useConfirm } from '../components/ConfirmModal';
import { useAuth } from '../store/AuthContext';

function currency(v) {
  return `$${Number(v || 0).toLocaleString('es-CO')}`;
}

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const showConfirm = useConfirm();
  const [activeTab, setActiveTab] = useState('sold'); // sold | credited
  const [sales, setSales] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const branchId = user?.role === 'ADMIN' ? (localStorage.getItem('activeBranchId') || undefined) : undefined;
    Promise.all([getSales(branchId), getCredits(branchId)])
      .then(([salesRes, creditsRes]) => {
        setSales(salesRes.data || []);
        setCredits(creditsRes.data || []);
      })
      .finally(() => setLoading(false));
  }, [user?.role]);
  

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const date = new Date(s.createdAt);
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
      if (search) {
        const q = search.toLowerCase();
        const inSeller = s.seller?.name?.toLowerCase().includes(q);
        const inProduct = s.items.some((i) => i.product?.name?.toLowerCase().includes(q));
        if (!inSeller && !inProduct) return false;
      }
      return true;
    });
  }, [sales, search, dateFrom, dateTo]);

  const filteredCredits = useMemo(() => {
    return credits
      .filter((credit) => credit.status === 'PENDING')
      .filter((credit) => {
        const date = new Date(credit.createdAt);
        if (dateFrom && date < new Date(dateFrom)) return false;
        if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
        if (search) {
          const q = search.toLowerCase();
          const inCustomer = credit.personName?.toLowerCase().includes(q);
          const inProduct = (credit.items || []).some((i) => i.product?.name?.toLowerCase().includes(q));
          if (!inCustomer && !inProduct) return false;
        }
        return true;
      });
  }, [credits, search, dateFrom, dateTo]);

  const totalSalesFiltered = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalCreditsFiltered = filteredCredits.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    0
  );

  async function handleMarkPaid(credit) {
    const ok = await showConfirm(`Se registrará el pago de "${credit.personName}" y se marcará como saldado.`, {
      title: '¿Marcar como pagado?',
      confirmText: 'Marcar pagado',
    });
    if (!ok) return;
    const res = await updateCreditStatus(credit.id, 'PAID');
    setCredits((prev) => prev.map((c) => (c.id === credit.id ? res.data : c)));
  }

  return (
    <AppLayout title="Historial de productos" subtitle="Consulta productos vendidos y productos fiados">
      <div className="ui-card p-3 mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('sold')}
          className={`ui-btn ${activeTab === 'sold' ? 'ui-btn-primary' : 'ui-btn-neutral'}`}
        >
          Productos vendidos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('credited')}
          className={`ui-btn ${activeTab === 'credited' ? 'ui-btn-primary' : 'ui-btn-neutral'}`}
        >
          Productos fiados
        </button>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow">
          <p className="text-sm font-semibold opacity-80">
            {activeTab === 'sold' ? 'Total vendidos (filtro)' : 'Total fiados (filtro)'}
          </p>
          <p className="text-3xl font-extrabold">
            {activeTab === 'sold' ? currency(totalSalesFiltered) : currency(totalCreditsFiltered)}
          </p>
        </div>
        <div className="bg-slate-800 text-white rounded-2xl p-5 shadow">
          <p className="text-sm font-semibold opacity-80">
            {activeTab === 'sold' ? 'Nº de ventas' : 'Nº de fiados'}
          </p>
          <p className="text-3xl font-extrabold">{activeTab === 'sold' ? filteredSales.length : filteredCredits.length}</p>
        </div>
        <div className="bg-sky-700 text-white rounded-2xl p-5 shadow sm:col-span-1 col-span-2">
          <p className="text-sm font-semibold opacity-80">
            {activeTab === 'sold' ? 'Promedio por venta' : 'Promedio por fiado'}
          </p>
          <p className="text-3xl font-extrabold">
            {activeTab === 'sold'
              ? (filteredSales.length ? currency(Math.round(totalSalesFiltered / filteredSales.length)) : '$0')
              : (filteredCredits.length ? currency(Math.round(totalCreditsFiltered / filteredCredits.length)) : '$0')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="ui-card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-40">
          <label className="text-xs font-semibold text-slate-600">
            {activeTab === 'sold' ? 'Buscar producto o vendedor' : 'Buscar cliente o producto'}
          </label>
          <input
            type="text"
            placeholder={activeTab === 'sold' ? 'Ej: Leche, Daniel...' : 'Ej: Reinel, Vino...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ui-input !px-3 !py-2 text-sm focus:ring-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="ui-input !px-3 !py-2 text-sm focus:ring-sky-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="ui-input !px-3 !py-2 text-sm focus:ring-sky-400"
          />
        </div>
        {(search || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="self-end ui-btn ui-btn-neutral"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Content list */}
      {loading ? (
        <p className="text-slate-500 font-medium">Cargando...</p>
      ) : activeTab === 'sold' && filteredSales.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-semibold text-base">No hay productos vendidos para este filtro</p>
        </div>
      ) : activeTab === 'credited' && filteredCredits.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-semibold text-base">No hay productos fiados pendientes para este filtro</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeTab === 'sold' && filteredSales.map((sale) => {
            const isOpen = expandedId === sale.id;
            const dateStr = new Date(sale.createdAt).toLocaleDateString('es-CO', {
              day: '2-digit', month: 'short', year: 'numeric',
            });
            const timeStr = new Date(sale.createdAt).toLocaleTimeString('es-CO', {
              hour: '2-digit', minute: '2-digit',
            });
            const summary = sale.items.map((i) => i.product?.name).filter(Boolean).join(', ');

            return (
              <div
                key={sale.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                {/* Header row — single compact line */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : sale.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition"
                >
                  {/* Date + time */}
                  <span className="text-xs text-slate-500 shrink-0 w-28">{dateStr} · {timeStr}</span>

                  {/* Product summary */}
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate min-w-0">{summary}</span>

                  {/* Seller badge (admin only) */}
                  {user?.role === 'ADMIN' && sale.seller && (
                    <span className="hidden sm:inline text-xs text-slate-500 shrink-0">{sale.seller.name}</span>
                  )}

                  {/* Total */}
                  <span className="text-sm font-bold text-emerald-700 shrink-0">{currency(sale.total)}</span>

                  {/* Chevron */}
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{item.product?.name ?? '—'} <span className="text-slate-400">×{item.quantity}</span></span>
                          <span className="font-semibold text-slate-800">{currency(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    {user?.role === 'ADMIN' && sale.seller && (
                      <p className="text-xs text-slate-400 mt-2 sm:hidden">Vendedor: {sale.seller.name}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {activeTab === 'credited' && filteredCredits.map((credit) => {
            const total = credit.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
            return (
              <div key={credit.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-base font-bold text-slate-900">{credit.personName}</p>
                    <p className="text-xs text-slate-500">{new Date(credit.createdAt).toLocaleString('es-CO')}</p>
                  </div>
                  <span className="text-sm font-extrabold text-amber-700">{currency(total)}</span>
                </div>

                <div className="space-y-1 mb-3">
                  {credit.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.product?.name ?? '—'} <span className="text-slate-400">×{item.quantity}</span></span>
                      <span className="font-semibold text-slate-800">{currency(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleMarkPaid(credit)}
                    className="ui-btn ui-btn-success !py-2"
                  >
                    Marcar pagado
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
