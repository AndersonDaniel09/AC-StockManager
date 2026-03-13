import { useEffect, useState } from 'react';
import { getCredits, updateCreditStatus } from '../services/credit.service';
import AppLayout from '../components/AppLayout';
import { useConfirm } from '../components/ConfirmModal';
import { useAuth } from '../store/AuthContext';

const STATUS_LABEL = { PENDING: 'Pendiente', PAID: 'Pagado' };

function currency(value) {
  return `$${Number(value || 0).toLocaleString('es-CO')}`;
}

function groupItemsAsMiniInvoices(credit) {
  const groups = new Map();

  for (const item of credit.items || []) {
    const timestamp = item.createdAt || credit.createdAt;
    const key = new Date(timestamp).toISOString();
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        createdAt: timestamp,
        items: [],
      });
    }
    groups.get(key).items.push(item);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      subtotal: group.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default function CreditsPage() {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const showConfirm = useConfirm();
  const { user } = useAuth();

  useEffect(() => {
    const branchId = user?.role === 'ADMIN' ? (localStorage.getItem('activeBranchId') || undefined) : undefined;
    getCredits(branchId)
      .then((res) => setCredits(res.data))
      .finally(() => setLoading(false));
  }, [user?.role]);

  async function handleMarkPaid(credit) {
    const ok = await showConfirm(`Se registrará el pago de "${credit.personName}" y se marcará como saldado.`, {
      title: '¿Marcar como pagado?',
      confirmText: 'Marcar pagado',
    });
    if (!ok) return;
    const res = await updateCreditStatus(credit.id, 'PAID');
    setCredits((prev) => prev.map((c) => (c.id === credit.id ? res.data : c)));
  }

  const filtered = credits.filter((c) => c.status === 'PENDING');

  const totalPending = credits
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0), 0);

  return (
    <AppLayout title="Fiados" subtitle="Controla deudas pendientes y pagos">
      <div className="bg-amber-500 rounded-2xl p-5 mb-5 text-white shadow-md border border-amber-600">
        <p className="text-sm font-semibold">Total pendiente por cobrar</p>
        <p className="text-4xl font-extrabold">${totalPending.toLocaleString()}</p>
      </div>

      {loading ? (
        <p className="text-slate-700 font-medium">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-700 font-medium">No hay fiados pendientes.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          {filtered.map((credit) => {
            const total = credit.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
            const miniInvoices = groupItemsAsMiniInvoices(credit);
            return (
              <div key={credit.id} className="ui-card p-5 border-l-4 border-l-amber-400 max-w-md w-full min-h-[420px] flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 border border-amber-200">
                        Cliente fiado
                      </span>
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        credit.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {STATUS_LABEL[credit.status]}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-xl">{credit.personName}</p>
                    <p className="text-slate-600 text-sm">
                      {new Date(credit.createdAt).toLocaleString('es-CO')} · por {credit.seller?.name}
                    </p>
                    {credit.customer && (
                      <p className="text-slate-500 text-xs mt-1">
                        Cédula: {credit.customer.idNumber} · Cel: {credit.customer.phone}
                      </p>
                    )}
                  </div>
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                </div>

                <div className="flex flex-col gap-3 mb-3 flex-1">
                  {miniInvoices.map((invoice) => (
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
                            <span className="font-medium pr-3">{item.product?.name} x{item.quantity}</span>
                            <span className="font-semibold shrink-0">{currency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {credit.note && (
                  <p className="text-sm text-slate-700 italic bg-slate-100 rounded-lg px-3 py-2 mb-3 border border-slate-200">
                    Nota: {credit.note}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <p className="font-extrabold text-slate-900 text-lg">Total acumulado: {currency(total)}</p>
                  {credit.status === 'PENDING' && (
                    <button
                      onClick={() => handleMarkPaid(credit)}
                      className="ui-btn ui-btn-success w-full"
                    >
                      Marcar pagado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
