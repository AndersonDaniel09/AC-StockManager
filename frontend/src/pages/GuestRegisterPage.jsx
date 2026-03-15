import { useState } from 'react';
import api from '../services/api';

export default function GuestRegisterPage() {
  const [activeTab, setActiveTab] = useState('register');
  const [form, setForm] = useState({ firstName: '', lastName: '', idNumber: '', phone: '' });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error' | 'duplicate' | 'pending-review'
  const [errorMsg, setErrorMsg] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [sendingUpdateRequest, setSendingUpdateRequest] = useState(false);
  const [debtIdNumber, setDebtIdNumber] = useState('');
  const [debtStatus, setDebtStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [debtErrorMsg, setDebtErrorMsg] = useState('');
  const [debtData, setDebtData] = useState(null);

  function currency(value) {
    return `$${Number(value || 0).toLocaleString('es-CO')}`;
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { firstName, lastName, idNumber, phone } = form;
    if (!firstName.trim() || !lastName.trim() || !idNumber.trim() || !phone.trim()) {
      setErrorMsg('Todos los campos son obligatorios.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await api.post('/customers/self-register', form);
      if (res.data?.pendingApproval) {
        setStatus('pending-review');
      } else {
        setStatus('success');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al registrarse. Intenta de nuevo.';
      const isDuplicate = err?.response?.status === 409;
      setErrorMsg(msg);
      if (isDuplicate) {
        setStatus('duplicate');
        setShowDuplicateModal(true);
      } else {
        setStatus('error');
      }
    }
  }

  async function handleConfirmUpdateRequest() {
    setSendingUpdateRequest(true);
    try {
      setStatus('loading');
      const reviewRes = await api.post('/customers/self-register', { ...form, requestUpdate: true });
      if (reviewRes.data?.pendingApproval) {
        setStatus('pending-review');
        setErrorMsg('');
      } else {
        setStatus('success');
      }
    } catch (requestErr) {
      setErrorMsg(requestErr?.response?.data?.message || 'No se pudo crear la solicitud de actualización.');
      setStatus('error');
    } finally {
      setSendingUpdateRequest(false);
      setShowDuplicateModal(false);
    }
  }

  async function handleDebtLookup(e) {
    e.preventDefault();
    const idValue = debtIdNumber.trim();
    if (!idValue) {
      setDebtErrorMsg('Debes ingresar un número de cédula.');
      setDebtStatus('error');
      return;
    }

    setDebtStatus('loading');
    setDebtErrorMsg('');
    setDebtData(null);

    try {
      const res = await api.get(`/customers/public-debt/${encodeURIComponent(idValue)}`);
      setDebtData(res.data);
      setDebtStatus('success');
    } catch (err) {
      setDebtErrorMsg(err?.response?.data?.message || 'No se pudo consultar la deuda.');
      setDebtStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registro de huésped</h1>
          <p className="text-slate-500 text-sm mt-1">
            Regístrate o consulta tu deuda pendiente por cédula
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`rounded-xl py-2 text-sm font-bold transition ${
              activeTab === 'register' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Registro nuevo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('debt')}
            className={`rounded-xl py-2 text-sm font-bold transition ${
              activeTab === 'debt' ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Consultar deuda
          </button>
        </div>

        {activeTab === 'register' ? (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Nombres completos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Ej: Carlos Andrés"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoCapitalize="words"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Ej: Rodríguez Pérez"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoCapitalize="words"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Número de cédula <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="idNumber"
                  value={form.idNumber}
                  onChange={handleChange}
                  placeholder="Ej: 1234567890"
                  inputMode="numeric"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Número de celular <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ej: 3001234567"
                  inputMode="tel"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {(status === 'error' || status === 'duplicate') && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
                  status === 'duplicate'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {status === 'duplicate' ? '⚠️ ' : '❌ '}{errorMsg}
                </div>
              )}

              {status === 'success' && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium border bg-emerald-50 text-emerald-800 border-emerald-200">
                  ✅ Registro exitoso. Ya puedes acceder al servicio de fiado.
                </div>
              )}

              {status === 'pending-review' && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium border bg-amber-50 text-amber-800 border-amber-200">
                  ⏳ Solicitud enviada. Un administrador revisará tus cambios.
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl text-base shadow disabled:opacity-60 transition-colors tracking-wide"
              >
                {status === 'loading' ? 'Registrando...' : 'Registrarme'}
              </button>
            </form>
          </>
        ) : (
          <>
            <form onSubmit={handleDebtLookup} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Número de cédula <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={debtIdNumber}
                  onChange={(e) => setDebtIdNumber(e.target.value)}
                  placeholder="Ej: 1234567890"
                  inputMode="numeric"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {debtStatus === 'error' && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium border bg-red-50 text-red-700 border-red-200">
                  ❌ {debtErrorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={debtStatus === 'loading'}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl text-base shadow disabled:opacity-60 transition-colors tracking-wide"
              >
                {debtStatus === 'loading' ? 'Consultando...' : 'Consultar deuda'}
              </button>
            </form>

            {debtStatus === 'success' && debtData && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-lg font-extrabold text-slate-900">Estado de cuenta pendiente</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {debtData.customer?.firstName} {debtData.customer?.lastName} · Cédula: {debtData.customer?.idNumber}
                </p>
                <p className="text-sm text-slate-600">Celular: {debtData.customer?.phone}</p>

                {debtData.credits?.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                    No tienes deuda pendiente.
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {debtData.credits.map((credit) => (
                      <div key={credit.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-700">
                            Fiado #{credit.id} · {new Date(credit.createdAt).toLocaleDateString('es-CO')}
                          </p>
                          <p className="text-sm font-extrabold text-rose-700">{currency(credit.total)}</p>
                        </div>
                        {credit.branch?.name && (
                          <p className="text-xs text-slate-500 mt-1">Sede: {credit.branch.name}</p>
                        )}
                        <ul className="mt-2 space-y-1">
                          {credit.items.map((item) => (
                            <li key={item.id} className="text-xs text-slate-700 flex justify-between gap-2">
                              <span>{item.productName} x{item.quantity}</span>
                              <span>{currency(item.subTotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-rose-800">Total pendiente</span>
                  <span className="text-lg font-extrabold text-rose-700">{currency(debtData.totalPending)}</span>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Tus datos son confidenciales y solo se usan para el servicio del hotel.
        </p>
      </div>

      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Este número ya está registrado</h3>
            <p className="mt-2 text-sm text-slate-600">
              ¿Deseas solicitar actualización de datos?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                disabled={sendingUpdateRequest}
                className="ui-btn ui-btn-neutral !py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdateRequest}
                disabled={sendingUpdateRequest}
                className="ui-btn ui-btn-primary !py-2"
              >
                {sendingUpdateRequest ? 'Enviando...' : 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
