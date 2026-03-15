import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AppLayout from '../components/AppLayout';
import {
  createCustomer,
  deleteCustomer,
  getDeletedCustomers,
  getCustomers,
  getCustomerDeleteRequests,
  restoreCustomer,
  updateCustomer,
  getCustomerUpdateRequests,
  reviewCustomerDeleteRequest,
  reviewCustomerUpdateRequest,
} from '../services/customer.service';
import { useToast } from '../components/Toast';
import { useAuth } from '../store/AuthContext';
import { useConfirm } from '../components/ConfirmModal';

const EMPTY = { firstName: '', lastName: '', phone: '', idNumber: '' };
const REGISTER_URL = `${window.location.origin}/guest-register`;

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [pendingDeleteRequests, setPendingDeleteRequests] = useState([]);
  const [loadingDeleteRequests, setLoadingDeleteRequests] = useState(false);
  const [reviewingDeleteRequestId, setReviewingDeleteRequestId] = useState(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState(null);
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [restoringCustomerId, setRestoringCustomerId] = useState(null);
  const [showUpdateRequests, setShowUpdateRequests] = useState(false);
  const [showDeleteRequests, setShowDeleteRequests] = useState(false);
  const [showDeletedHistory, setShowDeletedHistory] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const showConfirm = useConfirm();
  const qrRef = useRef(null);
  const canEditCustomers = user?.role === 'ADMIN' || user?.canEditProducts;
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    getCustomers()
      .then((res) => setCustomers(res.data || []))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    if (!canEditCustomers) {
      setPendingRequests([]);
      return;
    }

    setLoadingRequests(true);
    getCustomerUpdateRequests()
      .then((res) => setPendingRequests(res.data || []))
      .catch(() => setPendingRequests([]))
      .finally(() => setLoadingRequests(false));
  }, [canEditCustomers]);

  useEffect(() => {
    if (!isAdmin) {
      setPendingDeleteRequests([]);
      return;
    }

    setLoadingDeleteRequests(true);
    getCustomerDeleteRequests()
      .then((res) => setPendingDeleteRequests(res.data || []))
      .catch(() => setPendingDeleteRequests([]))
      .finally(() => setLoadingDeleteRequests(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setDeletedCustomers([]);
      return;
    }

    getDeletedCustomers()
      .then((res) => setDeletedCustomers(res.data || []))
      .catch(() => setDeletedCustomers([]));
  }, [isAdmin]);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createCustomer({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        idNumber: form.idNumber,
      });
      setCustomers((prev) => [...prev, res.data].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
      setForm(EMPTY);
      setShowCreateForm(false);
      showToast('Cliente registrado correctamente.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al registrar cliente', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.idNumber || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(REGISTER_URL);
      setCopied(true);
      showToast('Enlace de registro copiado.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('No se pudo copiar el enlace.', 'warning');
    }
  }

  function startEdit(customer) {
    setEditingCustomerId(customer.id);
    setEditForm({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.phone || '',
      idNumber: customer.idNumber || '',
    });
  }

  function cancelEdit() {
    setEditingCustomerId(null);
    setEditForm(EMPTY);
  }

  async function handleUpdateCustomer(e, customerId) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await updateCustomer(customerId, editForm);
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? res.data : c)));
      showToast('Cliente actualizado correctamente.', 'success');
      cancelEdit();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar cliente', 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleReviewRequest(requestId, approve) {
    setReviewingRequestId(requestId);
    try {
      const res = await reviewCustomerUpdateRequest(requestId, approve);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));

      if (approve) {
        const updatedCustomer = res.data?.customer;
        if (updatedCustomer?.id) {
          setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
        }
        showToast('Solicitud aprobada y datos actualizados.', 'success');
      } else {
        showToast('Solicitud rechazada.', 'warning');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'No se pudo procesar la solicitud', 'error');
    } finally {
      setReviewingRequestId(null);
    }
  }

  async function handleDeleteCustomer(customer) {
    if (!canEditCustomers) return;

    if (isAdmin) {
      const ok = await showConfirm(
        `Se eliminará a ${customer.firstName} ${customer.lastName} de forma permanente.`,
        {
          title: '¿Eliminar cliente?',
          confirmText: 'Eliminar',
          danger: true,
        }
      );
      if (!ok) return;
    }

    setDeletingCustomerId(customer.id);
    try {
      const res = await deleteCustomer(customer.id);
      const data = res.data || {};

      if (data.pendingApproval) {
        showToast(data.message || 'Solicitud enviada al administrador.', 'warning');
        return;
      }

      setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
      setDeletedCustomers((prev) => [
        {
          ...customer,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setPendingDeleteRequests((prev) => prev.filter((req) => req.customerId !== customer.id));
      if (editingCustomerId === customer.id) {
        cancelEdit();
      }
      showToast('Cliente eliminado correctamente.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'No se pudo eliminar el cliente', 'error');
    } finally {
      setDeletingCustomerId(null);
    }
  }

  async function handleReviewDeleteRequest(requestId, approve) {
    setReviewingDeleteRequestId(requestId);
    try {
      const res = await reviewCustomerDeleteRequest(requestId, approve);
      const customerId = res.data?.customerId;

      setPendingDeleteRequests((prev) => prev.filter((request) => request.id !== requestId));

      if (approve) {
        if (customerId) {
          const removedCustomer = customers.find((customer) => customer.id === customerId);
          setCustomers((prev) => prev.filter((customer) => customer.id !== customerId));
          if (removedCustomer) {
            setDeletedCustomers((prev) => [
              {
                ...removedCustomer,
                isDeleted: true,
                deletedAt: new Date().toISOString(),
              },
              ...prev,
            ]);
          }
        }
        showToast('Solicitud aprobada y cliente eliminado.', 'success');
      } else {
        showToast('Solicitud de eliminación rechazada.', 'warning');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'No se pudo procesar la solicitud', 'error');
    } finally {
      setReviewingDeleteRequestId(null);
    }
  }

  async function handleRestoreCustomer(customer) {
    const ok = await showConfirm(
      `Se restaurará a ${customer.firstName} ${customer.lastName} en la lista activa de clientes.`,
      {
        title: '¿Restaurar cliente?',
        confirmText: 'Restaurar',
      }
    );
    if (!ok) return;

    setRestoringCustomerId(customer.id);
    try {
      const res = await restoreCustomer(customer.id);
      const restored = res.data;
      setDeletedCustomers((prev) => prev.filter((item) => item.id !== customer.id));
      setCustomers((prev) => [...prev, restored].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
      showToast('Cliente restaurado correctamente.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'No se pudo restaurar el cliente', 'error');
    } finally {
      setRestoringCustomerId(null);
    }
  }

  function printQR() {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR de Registro</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 20px; color: #64748b; }
            svg { width: 260px; height: 260px; }
            .url { margin-top: 16px; max-width: 320px; text-align: center; word-break: break-all; font-size: 12px; color: #475569; }
          </style>
        </head>
        <body>
          <h1>Registro de huéspedes</h1>
          <p>Escanea el código para completar el registro</p>
          ${svgData}
          <div class="url">${REGISTER_URL}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <AppLayout
      title="Clientes"
      subtitle="Registra clientes para permitir fiados solo a usuarios registrados"
      actions={
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="ui-btn ui-btn-primary !px-4 !py-3 whitespace-nowrap"
        >
          {showCreateForm ? 'Cerrar formulario' : 'Nuevo cliente'}
        </button>
      }
    >
      {(user?.role === 'ADMIN' || user?.canSell) && (
        <div className="ui-card p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Registro autónomo por QR</h3>
              <p className="text-sm text-slate-500 mt-1">
                Comparte este código o enlace para que el huésped se registre por su cuenta.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={copyLink} className="ui-btn ui-btn-primary !px-4 !py-2">
                  {copied ? 'Enlace copiado' : 'Copiar enlace'}
                </button>
                <button type="button" onClick={printQR} className="ui-btn ui-btn-neutral !px-4 !py-2">
                  Imprimir QR
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400 break-all">{REGISTER_URL}</p>
            </div>

            <div ref={qrRef} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <QRCodeSVG
                value={REGISTER_URL}
                size={170}
                bgColor="#f8fafc"
                fgColor="#0f172a"
                level="M"
                includeMargin
              />
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="ui-card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-xl font-bold text-slate-900">Nuevo cliente</h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre"
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              className="ui-input"
              required
            />
            <input
              type="text"
              placeholder="Apellido"
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className="ui-input"
              required
            />
            <input
              type="text"
              placeholder="Número de celular"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="ui-input"
              required
            />
            <input
              type="text"
              placeholder="Número de cédula"
              value={form.idNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, idNumber: e.target.value }))}
              className="ui-input"
              required
            />
            <button type="submit" disabled={loading} className="md:col-span-2 ui-btn ui-btn-primary !py-3">
              {loading ? 'Guardando...' : 'Registrar cliente'}
            </button>
          </form>
        </div>
      )}

      {canEditCustomers && (
        <div className="ui-card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-xl font-bold text-slate-900">Solicitudes de actualización</h3>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              {pendingRequests.length} pendientes
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-slate-500 text-sm">
              Revisa el detalle de solicitudes en una vista separada.
            </p>
            <button
              type="button"
              onClick={() => setShowUpdateRequests(true)}
              className="ui-btn ui-btn-primary !py-2 !px-4"
            >
              Ver solicitudes
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="ui-card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-xl font-bold text-slate-900">Solicitudes de eliminación</h3>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
              {pendingDeleteRequests.length} pendientes
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-slate-500 text-sm">
              Revisa y responde solicitudes de eliminación en una vista separada.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteRequests(true)}
              className="ui-btn ui-btn-primary !py-2 !px-4"
            >
              Ver solicitudes
            </button>
          </div>
        </div>
      )}

      {canEditCustomers && showUpdateRequests && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">Solicitudes de actualización</p>
                <p className="mt-1 text-sm text-slate-500">Gestiona las solicitudes pendientes de clientes.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateRequests(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              {loadingRequests ? (
                <p className="text-slate-500 text-sm">Cargando solicitudes...</p>
              ) : pendingRequests.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay solicitudes pendientes.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-800 mb-1">Cliente: {request.customer?.firstName} {request.customer?.lastName}</p>
                      <p className="text-xs text-amber-700">Cédula actual: {request.customer?.idNumber} · Celular actual: {request.customer?.phone}</p>
                      <p className="text-xs text-amber-700 mt-2">Propuesto: {request.proposedFirstName} {request.proposedLastName} · Cédula: {request.proposedIdNumber} · Celular: {request.proposedPhone}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewRequest(request.id, true)}
                          disabled={reviewingRequestId === request.id}
                          className="ui-btn ui-btn-primary !py-2"
                        >
                          {reviewingRequestId === request.id ? 'Procesando...' : 'Aceptar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewRequest(request.id, false)}
                          disabled={reviewingRequestId === request.id}
                          className="ui-btn ui-btn-danger !py-2"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && showDeleteRequests && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">Solicitudes de eliminación</p>
                <p className="mt-1 text-sm text-slate-500">Gestiona las solicitudes pendientes de eliminación.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteRequests(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              {loadingDeleteRequests ? (
                <p className="text-slate-500 text-sm">Cargando solicitudes...</p>
              ) : pendingDeleteRequests.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay solicitudes pendientes.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {pendingDeleteRequests.map((request) => (
                    <div key={request.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-sm font-bold text-rose-800 mb-1">
                        Cliente: {request.customer?.firstName} {request.customer?.lastName}
                      </p>
                      <p className="text-xs text-rose-700">
                        Cédula: {request.customer?.idNumber} · Celular: {request.customer?.phone}
                      </p>
                      <p className="text-xs text-rose-700 mt-2">
                        Solicitado por: {request.requestedBy?.name || request.requestedBy?.username || 'Empleado'}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewDeleteRequest(request.id, true)}
                          disabled={reviewingDeleteRequestId === request.id}
                          className="ui-btn ui-btn-danger !py-2"
                        >
                          {reviewingDeleteRequestId === request.id ? 'Procesando...' : 'Aceptar y eliminar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewDeleteRequest(request.id, false)}
                          disabled={reviewingDeleteRequestId === request.id}
                          className="ui-btn !py-2"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="ui-card p-5 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-xl font-bold text-slate-900">Historial de clientes eliminados</h3>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
              {deletedCustomers.length} en historial
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-slate-500 text-sm">
              Consulta el detalle y restaura clientes desde la vista de eliminados.
            </p>
            <button
              type="button"
              onClick={() => setShowDeletedHistory(true)}
              className="ui-btn ui-btn-primary !py-2 !px-4"
            >
              Ver eliminados
            </button>
          </div>
        </div>
      )}

      {isAdmin && showDeletedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">Clientes eliminados</p>
                <p className="mt-1 text-sm text-slate-500">Aquí puedes revisar y restaurar clientes eliminados.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeletedHistory(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              {deletedCustomers.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay clientes eliminados para restaurar.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {deletedCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{customer.firstName} {customer.lastName}</p>
                        <p className="text-sm text-slate-600">Cédula: {customer.idNumber} · Celular: {customer.phone}</p>
                        <p className="text-xs text-slate-500">Eliminado: {customer.deletedAt ? new Date(customer.deletedAt).toLocaleString('es-CO') : 'Sin fecha'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreCustomer(customer)}
                        disabled={restoringCustomerId === customer.id}
                        className="ui-btn ui-btn-primary !py-2 !px-3 text-xs"
                      >
                        {restoringCustomerId === customer.id ? 'Restaurando...' : 'Restaurar'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="ui-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-slate-900">Clientes registrados</h3>
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o celular"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ui-input w-full sm:max-w-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay clientes registrados.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
            {filtered.map((c) => {
              const isEditing = editingCustomerId === c.id;
              return (
                <div key={c.id} className="ui-card rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{c.firstName} {c.lastName}</p>
                      <p className="text-sm text-slate-600">Cédula: {c.idNumber}</p>
                      <p className="text-sm text-slate-600">Celular: {c.phone}</p>
                    </div>
                    {canEditCustomers && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => (isEditing ? cancelEdit() : startEdit(c))}
                          className="ui-btn ui-btn-primary !py-1 !px-3 text-xs"
                        >
                          {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c)}
                          disabled={deletingCustomerId === c.id}
                          className="ui-btn ui-btn-danger !py-1 !px-3 text-xs"
                        >
                          {deletingCustomerId === c.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && canEditCustomers && (
                    <form onSubmit={(e) => handleUpdateCustomer(e, c.id)} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                        className="ui-input"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                        className="ui-input"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Número de celular"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="ui-input"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Número de cédula"
                        value={editForm.idNumber}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                        className="ui-input"
                        required
                      />
                      <div className="md:col-span-2 flex gap-2">
                        <button type="submit" disabled={savingEdit} className="ui-btn ui-btn-primary !py-2">
                          {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button type="button" onClick={cancelEdit} className="ui-btn !py-2">
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
