import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/auth.service';
import { getUsers, updateUser, updateUserPermissions, deleteUser, getUserSales } from '../services/user.service';
import { getBranches, createBranch } from '../services/branch.service';
import { useAuth } from '../store/AuthContext';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

const EMPTY_EMPLOYEE = { firstName: '', lastName: '', email: '', password: '', branchId: '', canSell: true, canEditProducts: false };
const EMPTY_EDIT_EMPLOYEE = { name: '', email: '', password: '', branchId: '', canSell: true, canEditProducts: false };

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [newEmployee, setNewEmployee] = useState(EMPTY_EMPLOYEE);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editEmployee, setEditEmployee] = useState(EMPTY_EDIT_EMPLOYEE);
  const [savingEditEmployee, setSavingEditEmployee] = useState(false);
  const [salesCache, setSalesCache] = useState({});
  const [loadingSalesFor, setLoadingSalesFor] = useState(null);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const { showToast } = useToast();
  const showConfirm = useConfirm();

  useEffect(() => {
    async function loadData() {
      try {
        if (isAdmin) {
          const [usersRes, branchesRes] = await Promise.all([getUsers(), getBranches()]);
          setUsers(usersRes.data);
          setBranches(branchesRes.data || []);

          const saved = localStorage.getItem('activeBranchId');
          const defaultId = saved || String(branchesRes.data?.[0]?.id || '');
          if (defaultId) {
            setActiveBranchId(defaultId);
            localStorage.setItem('activeBranchId', defaultId);
            setNewEmployee((prev) => ({ ...prev, branchId: defaultId }));
          }
          return;
        }

        const usersRes = await getUsers();
        setUsers(usersRes.data);
      } catch (err) {
        showToast(err.response?.data?.message || 'Error cargando usuarios', 'error');
      }
    }

    loadData();
  }, [isAdmin, showToast]);

  async function handleCreateBranch() {
    if (!newBranchName.trim()) return;
    try {
      const res = await createBranch({ name: newBranchName.trim() });
      const nextBranches = [...branches, res.data].sort((a, b) => a.name.localeCompare(b.name));
      setBranches(nextBranches);
      setNewBranchName('');
      if (!activeBranchId) {
        const id = String(res.data.id);
        setActiveBranchId(id);
        localStorage.setItem('activeBranchId', id);
      }
      showToast('Sede creada correctamente.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al crear sede', 'error');
    }
  }

  async function togglePermission(u, key) {
    if (!isAdmin) return;
    const updated = await updateUserPermissions(u.id, {
      canSell: key === 'canSell' ? !u.canSell : u.canSell,
      canEditProducts: key === 'canEditProducts' ? !u.canEditProducts : u.canEditProducts,
    });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated.data : x)));
  }

  async function handleCreateEmployee(e) {
    if (!isAdmin) return;
    e.preventDefault();
    setSavingEmployee(true);
    try {
      const res = await register({
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        email: newEmployee.email,
        password: newEmployee.password,
        branchId: Number(newEmployee.branchId),
        role: 'SELLER',
        canSell: newEmployee.canSell,
        canEditProducts: newEmployee.canEditProducts,
      });
      setUsers((prev) => [...prev, res.data.user].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Empleado creado correctamente.', 'success');
      setNewEmployee({ ...EMPTY_EMPLOYEE, branchId: activeBranchId || '' });
      setShowCreateEmployee(false);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Error al crear empleado', 'error');
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleDelete(id) {
    const ok = await showConfirm('El empleado y todos sus datos serán eliminados permanentemente.', {
      title: '¿Eliminar empleado?',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('Empleado eliminado.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'No se pudo eliminar el usuario', 'error');
    }
  }

  function startEditUser(targetUser) {
    setEditingUserId(targetUser.id);
    setEditEmployee({
      name: targetUser.name || '',
      email: targetUser.email || '',
      password: '',
      branchId: String(targetUser.branchId || activeBranchId || ''),
      canSell: !!targetUser.canSell,
      canEditProducts: !!targetUser.canEditProducts,
    });
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditEmployee(EMPTY_EDIT_EMPLOYEE);
  }

  async function handleEditUser(e, id) {
    if (!isAdmin) return;
    e.preventDefault();
    setSavingEditEmployee(true);
    try {
      const payload = {
        name: editEmployee.name,
        email: editEmployee.email,
        branchId: Number(editEmployee.branchId),
        canSell: editEmployee.canSell,
        canEditProducts: editEmployee.canEditProducts,
      };

      if (editEmployee.password.trim()) {
        payload.password = editEmployee.password.trim();
      }

      const res = await updateUser(id, payload);
      setUsers((prev) => prev.map((u) => (u.id === id ? res.data : u)));
      showToast('Usuario actualizado correctamente.', 'success');
      cancelEditUser();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar usuario', 'error');
    } finally {
      setSavingEditEmployee(false);
    }
  }

  async function toggleUserSales(userId) {
    if (!isAdmin) return;
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (salesCache[userId] !== undefined) return;
    setLoadingSalesFor(userId);
    try {
      const res = await getUserSales(userId, activeBranchId || undefined);
      setSalesCache((prev) => ({ ...prev, [userId]: res.data }));
    } catch {
      setSalesCache((prev) => ({ ...prev, [userId]: [] }));
    } finally {
      setLoadingSalesFor(null);
    }
  }

  return (
    <AppLayout
      title="Gestión de usuarios"
      subtitle={isAdmin ? 'Administra usuarios y permisos del sistema' : 'Elimina usuarios registrados autorizados'}
      actions={null}
    >
      {isAdmin && (
      <div className="ui-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Sede activa</label>
          <select
            value={activeBranchId}
            onChange={(e) => {
              setActiveBranchId(e.target.value);
              localStorage.setItem('activeBranchId', e.target.value);
              setSalesCache({});
              setNewEmployee((prev) => ({ ...prev, branchId: prev.branchId || e.target.value }));
            }}
            className="ui-input"
          >
            <option value="">Todas las sedes</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <input
            type="text"
            placeholder="Nueva sede (ej: Hotel SFR 2)"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            className="ui-input"
          />
          <button type="button" onClick={handleCreateBranch} className="ui-btn ui-btn-primary whitespace-nowrap">
            Crear sede
          </button>
        </div>
      </div>
      )}

      {isAdmin && (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowCreateEmployee((prev) => !prev)}
          className="ui-btn ui-btn-primary"
        >
          {showCreateEmployee ? 'Cerrar formulario' : 'Crear empleado'}
        </button>
      </div>
      )}

      {isAdmin && showCreateEmployee && (
        <div className="ui-card p-5 mb-6">
          <h3 className="text-xl font-bold text-slate-900 mb-1">Nuevo empleado</h3>
          <p className="text-slate-600 mb-4">El correo se guarda como dato de contacto y acceso.</p>

          <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombres"
              value={newEmployee.firstName}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, firstName: e.target.value }))}
              className="ui-input focus:ring-sky-400"
              required
            />
            <input
              type="text"
              placeholder="Apellidos"
              value={newEmployee.lastName}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, lastName: e.target.value }))}
              className="ui-input focus:ring-sky-400"
              required
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={newEmployee.email}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
              className="ui-input focus:ring-sky-400"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={newEmployee.password}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, password: e.target.value }))}
              className="ui-input focus:ring-sky-400"
              required
            />
            <select
              value={newEmployee.branchId}
              onChange={(e) => setNewEmployee((prev) => ({ ...prev, branchId: e.target.value }))}
              className="ui-input focus:ring-sky-400"
              required
            >
              <option value="">Selecciona sede</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <div className="rounded-xl border border-slate-300 px-4 py-3 flex items-center justify-between">
              <span className="text-slate-800 font-semibold">Autorizar ventas</span>
              <button
                type="button"
                onClick={() => setNewEmployee((prev) => ({ ...prev, canSell: !prev.canSell }))}
                className={`w-12 h-6 rounded-full transition ${newEmployee.canSell ? 'bg-emerald-600' : 'bg-slate-400'}`}
              >
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${newEmployee.canSell ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="rounded-xl border border-slate-300 px-4 py-3 flex items-center justify-between">
              <span className="text-slate-800 font-semibold">Autorizar edición de productos</span>
              <button
                type="button"
                onClick={() => setNewEmployee((prev) => ({ ...prev, canEditProducts: !prev.canEditProducts }))}
                className={`w-12 h-6 rounded-full transition ${newEmployee.canEditProducts ? 'bg-sky-600' : 'bg-slate-400'}`}
              >
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${newEmployee.canEditProducts ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <button
              type="submit"
              disabled={savingEmployee}
              className="md:col-span-2 ui-btn ui-btn-primary !py-3"
            >
              {savingEmployee ? 'Creando cuenta...' : 'Crear empleado'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/categories')}
            className="rounded-2xl border border-blue-800 bg-blue-700 text-white p-5 font-bold text-left shadow hover:bg-blue-800 transition"
          >
            <p className="text-2xl mb-1 text-white">Categorías</p>
            <p className="text-white/90 text-sm font-semibold">Crear y editar categorías</p>
          </button>
        )}
        <button
          onClick={() => navigate('/admin/products')}
          className="rounded-2xl border border-emerald-800 bg-emerald-700 text-white p-5 font-bold text-left shadow hover:bg-emerald-800 transition"
        >
          <p className="text-2xl mb-1 text-white">Productos</p>
          <p className="text-white/90 text-sm font-semibold">Gestionar inventario</p>
        </button>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-4">Usuarios</h3>
      <div className="flex flex-col gap-3">
        {users.map((u) => {
          const isExpanded = expandedUserId === u.id;
          const isEditing = editingUserId === u.id;
          const sales = salesCache[u.id] || [];
          const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
          return (
            <div key={u.id} className="ui-card overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => isAdmin && u.role !== 'ADMIN' && toggleUserSales(u.id)}
                  className="text-left flex-1 min-w-0"
                >
                  <p className="font-bold text-slate-900">{u.name}</p>
                  <p className="text-slate-700 text-sm">@{u.username} · {u.role}</p>
                  {u.email && <p className="text-slate-500 text-xs">{u.email}</p>}
                  {u.branch?.name && <p className="text-slate-500 text-xs">Sede: {u.branch.name}</p>}
                  {isAdmin && u.role !== 'ADMIN' && (
                    <p className="text-sky-600 text-xs mt-1 font-semibold">{isExpanded ? '▲ Ocultar ventas' : '▼ Ver ventas'}</p>
                  )}
                </button>
                {u.role !== 'ADMIN' && u.id !== user?.id && (
                  <div className="flex items-center gap-3 shrink-0">
                    {isAdmin && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-700 font-semibold">Vender</span>
                          <button
                            onClick={() => togglePermission(u, 'canSell')}
                            className={`w-12 h-6 rounded-full transition ${u.canSell ? 'bg-emerald-600' : 'bg-slate-400'}`}
                          >
                            <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${u.canSell ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-700 font-semibold">Editar</span>
                          <button
                            onClick={() => togglePermission(u, 'canEditProducts')}
                            className={`w-12 h-6 rounded-full transition ${u.canEditProducts ? 'bg-sky-600' : 'bg-slate-400'}`}
                          >
                            <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${u.canEditProducts ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => (isEditing ? cancelEditUser() : startEditUser(u))}
                          className="ui-btn ui-btn-primary !py-1 !px-3 text-xs"
                        >
                          {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="ui-btn ui-btn-danger !py-1 !px-3 text-xs"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isAdmin && isEditing && u.role !== 'ADMIN' && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <form onSubmit={(e) => handleEditUser(e, u.id)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={editEmployee.name}
                      onChange={(e) => setEditEmployee((prev) => ({ ...prev, name: e.target.value }))}
                      className="ui-input"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Correo electrónico"
                      value={editEmployee.email}
                      onChange={(e) => setEditEmployee((prev) => ({ ...prev, email: e.target.value }))}
                      className="ui-input"
                      required
                    />
                    <select
                      value={editEmployee.branchId}
                      onChange={(e) => setEditEmployee((prev) => ({ ...prev, branchId: e.target.value }))}
                      className="ui-input"
                      required
                    >
                      <option value="">Selecciona sede</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                    <input
                      type="password"
                      placeholder="Nueva contraseña (opcional)"
                      value={editEmployee.password}
                      onChange={(e) => setEditEmployee((prev) => ({ ...prev, password: e.target.value }))}
                      className="ui-input"
                    />

                    <div className="rounded-xl border border-slate-300 px-4 py-3 flex items-center justify-between">
                      <span className="text-slate-800 font-semibold">Autorizar ventas</span>
                      <button
                        type="button"
                        onClick={() => setEditEmployee((prev) => ({ ...prev, canSell: !prev.canSell }))}
                        className={`w-12 h-6 rounded-full transition ${editEmployee.canSell ? 'bg-emerald-600' : 'bg-slate-400'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${editEmployee.canSell ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="rounded-xl border border-slate-300 px-4 py-3 flex items-center justify-between">
                      <span className="text-slate-800 font-semibold">Autorizar edición de productos</span>
                      <button
                        type="button"
                        onClick={() => setEditEmployee((prev) => ({ ...prev, canEditProducts: !prev.canEditProducts }))}
                        className={`w-12 h-6 rounded-full transition ${editEmployee.canEditProducts ? 'bg-sky-600' : 'bg-slate-400'}`}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${editEmployee.canEditProducts ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={savingEditEmployee}
                        className="ui-btn ui-btn-primary !py-2"
                      >
                        {savingEditEmployee ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditUser}
                        className="ui-btn !py-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {isAdmin && isExpanded && u.role !== 'ADMIN' && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {loadingSalesFor === u.id ? (
                    <p className="text-slate-500 text-sm">Cargando ventas...</p>
                  ) : sales.length === 0 ? (
                    <p className="text-slate-500 text-sm">Este empleado no ha realizado ventas aún.</p>
                  ) : (
                    <>
                      <div className="flex gap-6 mb-4">
                        <div className="ui-card rounded-xl px-4 py-3 text-center">
                          <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
                          <p className="text-xs text-slate-500">Ventas realizadas</p>
                        </div>
                        <div className="ui-card rounded-xl px-4 py-3 text-center">
                          <p className="text-2xl font-bold text-emerald-700">${totalRevenue.toLocaleString('es')}</p>
                          <p className="text-xs text-slate-500">Total vendido</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {sales.map((sale) => (
                          <div key={sale.id} className="ui-card rounded-xl p-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-semibold text-slate-800">
                                {new Date(sale.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-sm font-bold text-emerald-700">${sale.total.toLocaleString('es')}</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {sale.items.map((item) => `${item.product.name} x${item.quantity}`).join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
