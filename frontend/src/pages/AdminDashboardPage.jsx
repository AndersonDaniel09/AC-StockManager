import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { getSales } from '../services/sale.service';
import { getCredits } from '../services/credit.service';
import { getProducts, getLowStockProducts } from '../services/product.service';
import { getBranches } from '../services/branch.service';

function currency(value) {
  return `$${Number(value || 0).toLocaleString('es-CO')}`;
}

function printHtmlReport(title, rows, totalLabel, totalValue) {
  const tableRows = rows
    .map((row) => `<tr>
      <td>${row.date}</td>
      <td>${row.detail}</td>
      <td style="text-align:right;">${row.amount}</td>
    </tr>`)
    .join('');

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; }
          p { margin: 0 0 20px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 14px; }
          th { background: #f1f5f9; text-align: left; }
          .total { margin-top: 16px; font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generado el ${new Date().toLocaleString('es-CO')}</p>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Detalle</th>
              <th style="text-align:right;">Valor</th>
            </tr>
          </thead>
          <tbody>${tableRows || '<tr><td colspan="3">Sin datos</td></tr>'}</tbody>
        </table>
        <div class="total">${totalLabel}: ${totalValue}</div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDailySeries(rows, getValue, days = 7) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const keys = [];
  const map = new Map();
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    const key = getDateKey(day);
    keys.push(key);
    map.set(key, 0);
  }

  rows.forEach((row) => {
    const rowDate = new Date(row.createdAt);
    rowDate.setHours(0, 0, 0, 0);
    const key = getDateKey(rowDate);
    if (!map.has(key)) return;
    map.set(key, map.get(key) + Number(getValue(row) || 0));
  });

  return keys.map((key) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return {
      key,
      label: date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
      value: map.get(key) || 0,
    };
  });
}

function buildTopProductsSeries(sales, limit = 4) {
  const totals = new Map();
  sales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const name = item.product?.name || item.productName || 'Producto';
      const quantity = Number(item.quantity || 0);
      totals.set(name, (totals.get(name) || 0) + quantity);
    });
  });

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function buildStockSegments(products, threshold) {
  return products.reduce(
    (acc, product) => {
      const units = Number(product.stock || 0);
      if (units === 0) {
        acc.empty += 1;
      } else if (units <= threshold) {
        acc.low += 1;
      } else {
        acc.normal += 1;
      }
      return acc;
    },
    { normal: 0, low: 0, empty: 0 }
  );
}

function MiniSparkline({ points: series, toneClass, formatValue = (value) => Number(value || 0).toLocaleString('es-CO') }) {
  const width = 240;
  const height = 64;
  const pad = 6;
  const values = series.map((point) => Number(point.value || 0));
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const coordinatePoints = values.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value / max) * (height - pad * 2));
    return `${x},${y}`;
  });

  const areaPoints = coordinatePoints.length
    ? `${coordinatePoints.join(' ')} ${pad + (values.length - 1) * step},${height - pad} ${pad},${height - pad}`
    : '';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`h-16 w-full ${toneClass}`}>
      {areaPoints && <polygon points={areaPoints} fill="currentColor" className="opacity-15" />}
      {coordinatePoints.length > 1 && (
        <polyline
          points={coordinatePoints.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {coordinatePoints.map((point, index) => {
        const [xStr, yStr] = point.split(',');
        const x = Number(xStr);
        const y = Number(yStr);
        return (
          <circle key={index} cx={x} cy={y} r="2.2" fill="currentColor" className="opacity-85">
            <title>{`${series[index]?.label || ''}: ${formatValue(values[index])}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function MiniBars({ points, toneClass, formatValue = (value) => Number(value || 0).toLocaleString('es-CO') }) {
  const values = points.map((point) => Number(point.value || 0));
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((value, index) => {
        const heightPct = Math.max((value / max) * 100, value > 0 ? 10 : 4);
        return (
          <div
            key={index}
            className="flex-1 rounded-t-md bg-slate-100"
            title={`${points[index]?.label || ''}: ${formatValue(value)}`}
          >
            <div className={`w-full rounded-t-md ${toneClass}`} style={{ height: `${heightPct}%` }} />
          </div>
        );
      })}
    </div>
  );
}

function MiniDonut({ percent, toneClass }) {
  const radius = 22;
  const stroke = 7;
  const normalizedPercent = Math.min(Math.max(percent, 0), 100);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalizedPercent / 100);

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-200" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={toneClass}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-700">
        {Math.round(normalizedPercent)}%
      </span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [sales, setSales] = useState([]);
  const [credits, setCredits] = useState([]);
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState({ items: [], count: 0, threshold: 3 });
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreditNotifications, setShowCreditNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBranches().then((res) => {
      const rows = res.data || [];
      setBranches(rows);
      const saved = localStorage.getItem('activeBranchId');
      const selected = saved || String(rows[0]?.id || '');
      if (selected) {
        setActiveBranchId(selected);
        localStorage.setItem('activeBranchId', selected);
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const branchId = activeBranchId || undefined;
    Promise.all([getSales(branchId), getCredits(branchId), getProducts(branchId), getLowStockProducts(branchId, 3)])
      .then(([salesRes, creditsRes, productsRes, lowStockRes]) => {
        setSales(salesRes.data || []);
        setCredits(creditsRes.data || []);
        setProducts(productsRes.data || []);
        setLowStock(lowStockRes.data || { items: [], count: 0, threshold: 3 });
      })
      .finally(() => setLoading(false));
  }, [activeBranchId]);

  const stats = useMemo(() => {
    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalSalesCount = sales.length;
    const totalInventoryUnits = products.reduce((sum, product) => sum + (product.stock || 0), 0);
    const totalUnitsSold = sales.reduce(
      (sum, sale) => sum + (sale.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0),
      0
    );

    const pendingCredits = credits.filter((credit) => credit.status === 'PENDING');
    const totalCreditsPendingAmount = pendingCredits.reduce(
      (sum, credit) => sum + (credit.items || []).reduce((acc, item) => acc + ((item.unitPrice || 0) * (item.quantity || 0)), 0),
      0
    );

    const totalCreditsCount = credits.length;
    const pendingCreditsCount = pendingCredits.length;

    return {
      totalSalesAmount,
      totalSalesCount,
      totalInventoryUnits,
      totalUnitsSold,
      totalCreditsPendingAmount,
      totalCreditsCount,
      pendingCreditsCount,
    };
  }, [sales, credits, products]);

  const recentSales = useMemo(
    () => sales.slice(0, 8).map((sale) => ({
      date: new Date(sale.createdAt).toLocaleString('es-CO'),
      detail: `Venta #${sale.id} · ${sale.seller?.name || 'Sin vendedor'}`,
      amount: currency(sale.total),
    })),
    [sales]
  );

  const recentCredits = useMemo(
    () => credits.slice(0, 8).map((credit) => {
      const value = (credit.items || []).reduce((acc, item) => acc + ((item.unitPrice || 0) * (item.quantity || 0)), 0);
      return {
        date: new Date(credit.createdAt).toLocaleString('es-CO'),
        detail: `${credit.personName} · ${credit.status === 'PENDING' ? 'Pendiente' : 'Pagado'}`,
        amount: currency(value),
      };
    }),
    [credits]
  );

  const productAlerts = useMemo(() => {
    const alerts = [];

    for (const item of lowStock.items || []) {
      alerts.push({
        id: `stock-${item.id}`,
        type: item.stock === 0 ? 'critical' : 'warning',
        title: item.stock === 0 ? 'Producto agotado' : 'Stock bajo',
        description: `${item.name} tiene ${item.stock} unidades disponibles.`,
      });
    }

    return alerts;
  }, [lowStock.items]);

  const creditAlerts = useMemo(() => {
    if (stats.pendingCreditsCount <= 0) return [];
    return [{
      id: 'pending-credits',
      type: 'info',
      title: 'Fiados pendientes por cobrar',
      description: `${stats.pendingCreditsCount} fiados siguen pendientes por un total de ${currency(stats.totalCreditsPendingAmount)}.`,
    }];
  }, [stats.pendingCreditsCount, stats.totalCreditsPendingAmount]);

  const salesCountSeries = useMemo(() => buildDailySeries(sales, () => 1, 7), [sales]);
  const salesAmountSeries = useMemo(() => buildDailySeries(sales, (sale) => sale.total || 0, 7), [sales]);
  const topProductsSeries = useMemo(() => buildTopProductsSeries(sales, 3), [sales]);
  const stockSegments = useMemo(() => buildStockSegments(products, lowStock.threshold), [products, lowStock.threshold]);

  const totalSegmentProducts = stockSegments.normal + stockSegments.low + stockSegments.empty;
  const pendingCreditsRatio = stats.totalCreditsCount > 0
    ? (stats.pendingCreditsCount / stats.totalCreditsCount) * 100
    : 0;

  return (
    <AppLayout
      title="Panel principal"
      subtitle="Resumen general del negocio y reportes imprimibles"
      actions={
        <>
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-600"
            title="Alertas de productos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {productAlerts.length > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {productAlerts.length > 9 ? '9+' : productAlerts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowCreditNotifications(true)}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
            title="Alertas de fiados"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {creditAlerts.length > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">
                {creditAlerts.length > 9 ? '9+' : creditAlerts.length}
              </span>
            )}
          </button>

          <select
            value={activeBranchId}
            onChange={(e) => {
              setActiveBranchId(e.target.value);
              localStorage.setItem('activeBranchId', e.target.value);
              setShowNotifications(false);
              setShowCreditNotifications(false);
            }}
            className="ui-input w-full sm:w-auto sm:min-w-56"
          >
            <option value="">Todas las sedes</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </>
      }
    >
      {loading ? (
        <p className="text-slate-700 font-medium">Cargando estadísticas...</p>
      ) : (
        <>
          {showNotifications && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
              <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900">Alertas de productos</p>
                    <p className="mt-1 text-sm text-slate-500">Resumen de stock bajo y productos agotados</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
                  {productAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
                      <p className="text-lg font-bold text-emerald-800">Todo en orden</p>
                      <p className="mt-1 text-sm text-emerald-700">No hay alertas activas en este momento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {productAlerts.map((alert) => {
                        const tone = alert.type === 'critical'
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : alert.type === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-sky-200 bg-sky-50 text-sky-800';

                        const badgeTone = alert.type === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : alert.type === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-sky-100 text-sky-700';

                        const badgeLabel = alert.type === 'critical'
                          ? 'Urgente'
                          : alert.type === 'warning'
                          ? 'Atención'
                          : 'Información';

                        return (
                          <div key={alert.id} className={`rounded-2xl border px-4 py-4 ${tone}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-bold">{alert.title}</p>
                                <p className="mt-1 text-sm opacity-90">{alert.description}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeTone}`}>
                                {badgeLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="ui-btn ui-btn-primary !px-5 !py-3"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCreditNotifications && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
              <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900">Alertas de fiados</p>
                    <p className="mt-1 text-sm text-slate-500">Resumen de cartera pendiente por cobrar</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreditNotifications(false)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
                  {creditAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
                      <p className="text-lg font-bold text-emerald-800">Todo en orden</p>
                      <p className="mt-1 text-sm text-emerald-700">No hay fiados pendientes en este momento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {creditAlerts.map((alert) => (
                        <div key={alert.id} className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sky-800">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-bold">{alert.title}</p>
                              <p className="mt-1 text-sm opacity-90">{alert.description}</p>
                            </div>
                            <span className="rounded-full px-3 py-1 text-xs font-bold bg-sky-100 text-sky-700">
                              Información
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setShowCreditNotifications(false)}
                    className="ui-btn ui-btn-primary !px-5 !py-3"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inventory chart + print row */}
          <div className="ui-card p-5 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stock por producto</h3>
                <p className="text-xs text-slate-500 mt-0.5">Inventario actual de la sede seleccionada</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => printHtmlReport('Reporte de ventas', recentSales, 'Total ventas', currency(stats.totalSalesAmount))}
                  className="ui-btn ui-btn-primary !px-3 !py-2 text-sm flex-1 sm:flex-none"
                >
                  Reporte ventas
                </button>
                <button
                  onClick={() => printHtmlReport('Reporte de fiados', recentCredits, 'Pendiente por cobrar', currency(stats.totalCreditsPendingAmount))}
                  className="ui-btn ui-btn-primary !px-3 !py-2 text-sm flex-1 sm:flex-none"
                >
                  Reporte fiados
                </button>
              </div>
            </div>

            {products.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay productos registrados para esta sede.</p>
            ) : (() => {
              const sorted = [...products].sort((a, b) => b.stock - a.stock);
              const max = Math.max(...sorted.map((p) => p.stock), 1);
              return (
                <div className="flex flex-col gap-2">
                  {sorted.map((product) => {
                    const pct = Math.max((product.stock / max) * 100, product.stock > 0 ? 2 : 0);
                    const isLow = product.stock <= lowStock.threshold && product.stock > 0;
                    const isEmpty = product.stock === 0;
                    const barColor = isEmpty
                      ? 'bg-red-400'
                      : isLow
                      ? 'bg-amber-400'
                      : 'bg-emerald-500';
                    const textColor = isEmpty
                      ? 'text-red-600'
                      : isLow
                      ? 'text-amber-700'
                      : 'text-emerald-700';
                    return (
                      <div key={product.id} className="flex items-center gap-3">
                        {/* Product name */}
                        <span className="text-sm text-slate-700 font-medium w-36 shrink-0 truncate" title={product.name}>
                          {product.name}
                        </span>
                        {/* Bar track */}
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div
                            className={`h-4 rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {/* Stock count */}
                        <span className={`text-sm font-bold w-14 text-right shrink-0 ${textColor}`}>
                          {product.stock} ud.
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex gap-4 mt-5 pt-4 border-t border-slate-100 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> Stock normal
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> Stock bajo (≤ {lowStock.threshold})
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block w-3 h-3 rounded-full bg-red-400" /> Sin stock
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <p className="text-slate-600 text-sm font-semibold">Ventas realizadas</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalSalesCount}</p>
              <div className="mt-3">
                <MiniSparkline points={salesCountSeries} toneClass="text-slate-700" />
                <p className="mt-1 text-xs text-slate-500">Últimos 7 días</p>
              </div>
            </div>
            <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <p className="text-slate-600 text-sm font-semibold">Ingresos por ventas</p>
              <p className="text-3xl font-extrabold text-emerald-700 mt-1">{currency(stats.totalSalesAmount)}</p>
              <div className="mt-3">
                <MiniBars
                  points={salesAmountSeries}
                  toneClass="bg-emerald-500"
                  formatValue={(value) => currency(value)}
                />
                <p className="mt-1 text-xs text-slate-500">Comportamiento semanal</p>
              </div>
            </div>
            <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <p className="text-slate-600 text-sm font-semibold">Productos vendidos</p>
              <p className="text-3xl font-extrabold text-sky-700 mt-1">{stats.totalUnitsSold}</p>
              <div className="mt-3 space-y-2">
                {(topProductsSeries.length ? topProductsSeries : [{ label: 'Sin ventas', value: 0 }]).map((item, index, arr) => {
                  const max = Math.max(...arr.map((row) => row.value), 1);
                  const widthPct = Math.max((item.value / max) * 100, item.value > 0 ? 14 : 8);
                  return (
                    <div key={`${item.label}-${index}`}>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate pr-2">{item.label}</span>
                        <span className="font-semibold text-slate-600">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-sky-500"
                          style={{ width: `${widthPct}%` }}
                          title={`${item.label}: ${item.value} unidades`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <p className="text-slate-600 text-sm font-semibold">Stock total disponible</p>
              <p className="text-3xl font-extrabold text-violet-700 mt-1">{stats.totalInventoryUnits}</p>
              <div className="mt-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${totalSegmentProducts ? (stockSegments.normal / totalSegmentProducts) * 100 : 0}%` }}
                    title={`Stock normal: ${stockSegments.normal} productos`}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${totalSegmentProducts ? (stockSegments.low / totalSegmentProducts) * 100 : 0}%` }}
                    title={`Stock bajo: ${stockSegments.low} productos`}
                  />
                  <div
                    className="bg-red-400"
                    style={{ width: `${totalSegmentProducts ? (stockSegments.empty / totalSegmentProducts) * 100 : 0}%` }}
                    title={`Sin stock: ${stockSegments.empty} productos`}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Normal: {stockSegments.normal}</span>
                  <span>Bajo: {stockSegments.low}</span>
                  <span>Sin stock: {stockSegments.empty}</span>
                </div>
              </div>
            </div>
            <div className="ui-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <p className="text-slate-600 text-sm font-semibold">Fiados pendientes</p>
              <p className="text-3xl font-extrabold text-amber-700 mt-1">{currency(stats.totalCreditsPendingAmount)}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">{stats.pendingCreditsCount} de {stats.totalCreditsCount} fiados</p>
                  <p className="text-xs text-slate-500 mt-1">Ratio de cartera pendiente</p>
                </div>
                <div title={`Pendientes: ${stats.pendingCreditsCount} de ${stats.totalCreditsCount} (${Math.round(pendingCreditsRatio)}%)`}>
                  <MiniDonut percent={pendingCreditsRatio} toneClass="stroke-amber-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent sales & credits — compact lists */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="ui-card p-4">
              <h3 className="text-base font-bold text-slate-900 mb-3">Últimas ventas</h3>
              <div className="flex flex-col gap-1">
                {recentSales.length === 0 ? (
                  <p className="text-slate-500 text-sm">No hay ventas registradas.</p>
                ) : (
                  recentSales.map((sale, index) => (
                    <div key={index} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{sale.detail}</p>
                        <p className="text-xs text-slate-400">{sale.date}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700 shrink-0 ml-3">{sale.amount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="ui-card p-4">
              <h3 className="text-base font-bold text-slate-900 mb-3">Últimos fiados</h3>
              <div className="flex flex-col gap-1">
                {recentCredits.length === 0 ? (
                  <p className="text-slate-500 text-sm">No hay fiados registrados.</p>
                ) : (
                  recentCredits.map((credit, index) => (
                    <div key={index} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{credit.detail}</p>
                        <p className="text-xs text-slate-400">{credit.date}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-700 shrink-0 ml-3">{credit.amount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
