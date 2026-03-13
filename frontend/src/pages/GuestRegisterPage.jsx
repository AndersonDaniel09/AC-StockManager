import { useState } from 'react';
import api from '../services/api';

export default function GuestRegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', idNumber: '', phone: '' });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error' | 'duplicate' | 'pending-review'
  const [errorMsg, setErrorMsg] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [sendingUpdateRequest, setSendingUpdateRequest] = useState(false);

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

  if (status === 'success') {
    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 mb-4 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Registro exitoso</h1>
          <p className="text-slate-600">
            <span className="font-semibold">{form.firstName} {form.lastName}</span>, tus datos quedaron guardados.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            A partir de ahora puedes acceder al servicio de fiado en el hotel.
          </p>
          <div className="mt-6 bg-blue-50 rounded-2xl p-4 text-blue-800 text-sm font-medium border border-blue-200">
            Si tienes alguna duda, acércate a recepción.
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending-review') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Solicitud enviada</h1>
          <p className="text-slate-600">
            Tu solicitud de actualización fue enviada correctamente.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Un administrador o empleado autorizado revisará y aprobará los cambios.
          </p>
          <div className="mt-6 bg-amber-50 rounded-2xl p-4 text-amber-800 text-sm font-medium border border-amber-200">
            Cuando la aprueben, tus datos quedarán actualizados.
          </div>
        </div>
      </div>
    );
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
            Regístrate para acceder a nuestro servicio de fiado
          </p>
        </div>

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

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl text-base shadow disabled:opacity-60 transition-colors tracking-wide"
          >
            {status === 'loading' ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>

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
