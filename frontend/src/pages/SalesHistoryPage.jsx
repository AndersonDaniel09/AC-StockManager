import { useEffect, useState, useMemo } from 'react';
import { getSales } from '../services/sale.service';
import { getCredits, updateCreditStatus } from '../services/credit.service';
import AppLayout from '../components/AppLayout';
import { useConfirm } from '../components/ConfirmModal';
import { useAuth } from '../store/AuthContext';
import {
  currency,
  filterSalesByQueryAndDate,
  filterCreditsByStatusAndQueryAndDate,
  getCreditTotal,
  getCreditsTotal,
  groupItemsAsMiniInvoices,
} from './salesHistory/salesHistory.utils';

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const showConfirm = useConfirm();
  const [activeTab, setActiveTab] = useState('receivable'); // receivable | sold | paid
  const [sales, setSales] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCreditId, setSelectedCreditId] = useState(null);

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
      return filterSalesByQueryAndDate(sales, { search, dateFrom, dateTo });
  }, [sales, search, dateFrom, dateTo]);

  const filteredReceivableCredits = useMemo(() => {
      return filterCreditsByStatusAndQueryAndDate(credits, 'PENDING', { search, dateFrom, dateTo });
  }, [credits, search, dateFrom, dateTo]);

  const filteredPaidCredits = useMemo(() => {
      return filterCreditsByStatusAndQueryAndDate(credits, 'PAID', { search, dateFrom, dateTo });
  }, [credits, search, dateFrom, dateTo]);

  const totalSalesFiltered = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalReceivableCreditsFiltered = getCreditsTotal(filteredReceivableCredits);

  const totalPaidCreditsFiltered = getCreditsTotal(filteredPaidCredits);

  const selectedCredit = useMemo(
    () => credits.find((credit) => credit.id === selectedCreditId) || null,
    [credits, selectedCreditId]
  );

  const selectedCreditMiniInvoices = useMemo(
    () => (selectedCredit ? groupItemsAsMiniInvoices(selectedCredit) : []),
    [selectedCredit]
  );

  const selectedCreditTotal = useMemo(
    () => (selectedCredit ? getCreditTotal(selectedCredit) : 0),
    [selectedCredit]
  );

  async function handleMarkPaid(credit) {
    const ok = await showConfirm(`Se registrará el pago de "${credit.personName}" y se marcará como saldado.`, {
      title: '¿Marcar como pagado?',
      confirmText: 'Marcar pagado',
    });
    if (!ok) return;
    const res = await updateCreditStatus(credit.id, 'PAID');
    setCredits((prev) => prev.map((c) => (c.id === credit.id ? res.data : c)));
    if (selectedCreditId === credit.id) {
      setSelectedCreditId(null);
    }
  }

  return (
    <AppLayout title="Cobro de fiados" subtitle="Consulta y gestiona mini-facturas de fiados pendientes">
      <div className="ui-card p-3 mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('receivable')}
          className={`ui-btn ${activeTab === 'receivable' ? 'ui-btn-primary' : 'ui-btn-neutral'}`}
        >
          Fiados por cobrar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sold')}
          className={`ui-btn ${activeTab === 'sold' ? 'ui-btn-primary' : 'ui-btn-neutral'}`}
        >
          Historial productos vendidos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('paid')}
          className={`ui-btn ${activeTab === 'paid' ? 'ui-btn-primary' : 'ui-btn-neutral'}`}
        >
          Historial fiados pagados
        </button>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow">
          <p className="text-sm font-semibold opacity-80">
            {activeTab === 'sold'
              ? 'Total vendidos (filtro)'
              : activeTab === 'paid'
                ? 'Total fiados pagados (filtro)'
                : 'Total fiados por cobrar (filtro)'}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold break-words">
            {activeTab === 'sold'
              ? currency(totalSalesFiltered)
              : activeTab === 'paid'
                ? currency(totalPaidCreditsFiltered)
                : currency(totalReceivableCreditsFiltered)}
          </p>
        </div>
        <div className="bg-slate-800 text-white rounded-2xl p-5 shadow">
          <p className="text-sm font-semibold opacity-80">
            {activeTab === 'sold' ? 'Nº de ventas' : 'Nº de fiados'}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold break-words">
            {activeTab === 'sold' ? filteredSales.length : activeTab === 'paid' ? filteredPaidCredits.length : filteredReceivableCredits.length}
          </p>
        </div>
        <div className="bg-sky-700 text-white rounded-2xl p-5 shadow sm:col-span-1">
          <p className="text-sm font-semibold opacity-80">
            {activeTab === 'sold' ? 'Promedio por venta' : 'Promedio por fiado'}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold break-words">
            {activeTab === 'sold'
              ? (filteredSales.length ? currency(Math.round(totalSalesFiltered / filteredSales.length)) : '$0')
              : activeTab === 'paid'
                ? (filteredPaidCredits.length ? currency(Math.round(totalPaidCreditsFiltered / filteredPaidCredits.length)) : '$0')
                : (filteredReceivableCredits.length ? currency(Math.round(totalReceivableCreditsFiltered / filteredReceivableCredits.length)) : '$0')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="ui-card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[12rem]">
          <label className="text-xs font-semibold text-slate-600">
            {activeTab === 'sold' ? 'Buscar producto o vendedor' : 'Buscar cliente por cédula o nombre'}
          </label>
          <input
            type="text"
            placeholder={activeTab === 'sold' ? 'Ej: Leche, Daniel...' : 'Ej: 1234567890 o Reinel...'}
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
      ) : activeTab === 'receivable' && filteredReceivableCredits.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-semibold text-base">No hay productos fiados pendientes para este filtro</p>
        </div>
      ) : activeTab === 'paid' && filteredPaidCredits.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-semibold text-base">No hay fiados pagados para este filtro</p>
        </div>
      ) : (
        <div className={activeTab === 'receivable' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start' : 'flex flex-col gap-3'}>
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

          {activeTab === 'receivable' && filteredReceivableCredits.map((credit) => {
            const total = getCreditTotal(credit);
            const miniInvoices = groupItemsAsMiniInvoices(credit);
            return (
              <div key={credit.id} className="ui-card p-4 border-l-4 border-l-sky-500 min-h-[360px] flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div />
                  <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">POR COBRAR</span>
                </div>

                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mb-3" />

                <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 leading-none mb-3 break-words">{currency(total)}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight break-words whitespace-normal">{credit.personName}</p>
                <p className="text-slate-700 text-lg sm:text-xl mt-2 break-all">{credit.customer?.idNumber || 'Sin cédula'}</p>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 font-semibold">
                    {miniInvoices.length} mini-factura{miniInvoices.length === 1 ? '' : 's'} · {(credit.items || []).length} ítem{(credit.items || []).length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-4 font-medium">Creada: {new Date(credit.createdAt).toLocaleString('es-CO')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedCreditId(credit.id)}
                      className="ui-btn ui-btn-primary !py-2"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleMarkPaid(credit)}
                      className="ui-btn ui-btn-success !py-2"
                    >
                      Pagar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {activeTab === 'paid' && filteredPaidCredits.map((credit) => {
            const total = getCreditTotal(credit);
            const miniInvoices = groupItemsAsMiniInvoices(credit);
            return (
              <div key={credit.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate">{credit.personName}</p>
                    <p className="text-xs text-slate-500">{new Date(credit.createdAt).toLocaleString('es-CO')}</p>
                    {credit.customer && (
                      <p className="text-xs text-slate-500 mt-1">Cédula: {credit.customer.idNumber}</p>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700">{currency(total)}</span>
                </div>

                <div className="flex flex-col gap-3 mb-2">
                  {miniInvoices.map((invoice) => (
                    <div key={invoice.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 leading-5 max-w-[68%]">
                          Fiado del {new Date(invoice.createdAt).toLocaleString('es-CO')}
                        </p>
                        <span className="text-base font-extrabold text-emerald-700 shrink-0">{currency(invoice.subtotal)}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        {invoice.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm text-slate-800">
                            <span className="font-medium pr-3">{item.product?.name ?? '—'} x{item.quantity}</span>
                            <span className="font-semibold shrink-0">{currency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">Factura completa de fiado</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCredit.personName} · {new Date(selectedCredit.createdAt).toLocaleString('es-CO')}
                </p>
                {selectedCredit.customer && (
                  <p className="text-xs text-slate-500 mt-1">
                    Cédula: {selectedCredit.customer.idNumber} · Cel: {selectedCredit.customer.phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCreditId(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-3">
                {selectedCreditMiniInvoices.map((invoice) => (
                  <div key={invoice.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 leading-5 max-w-[68%]">
                        Fiado del {new Date(invoice.createdAt).toLocaleString('es-CO')}
                      </p>
                      <span className="text-base font-extrabold text-amber-700 shrink-0">{currency(invoice.subtotal)}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {invoice.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm text-slate-800">
                          <span className="font-medium pr-3">{item.product?.name ?? '—'} x{item.quantity}</span>
                          <span className="font-semibold shrink-0">{currency(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedCredit.note && (
                <p className="text-sm text-slate-700 italic bg-slate-100 rounded-lg px-3 py-2 mt-4 border border-slate-200">
                  Nota: {selectedCredit.note}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-extrabold text-slate-900">Total acumulado: {currency(selectedCreditTotal)}</p>
              <div className="flex gap-2">
                {selectedCredit.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(selectedCredit)}
                    className="ui-btn ui-btn-success"
                  >
                    Pagar
                  </button>
                )}
                <button type="button" onClick={() => setSelectedCreditId(null)} className="ui-btn ui-btn-neutral">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
