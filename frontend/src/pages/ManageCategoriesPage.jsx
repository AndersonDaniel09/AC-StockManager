import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/category.service';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

const EMPTY_FORM = { name: '', imageUrl: '' };
const PROTECTED_FREE_SALE_CATEGORY_NAME = 'venta de varios productos';

function isProtectedCategory(category) {
  return String(category?.name || '').trim().toLowerCase() === PROTECTED_FREE_SALE_CATEGORY_NAME;
}

function CategorySilhouette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white/90">
      <path d="M8 3h8l-1 4v3.5a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3V7L8 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 20h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProtected, setEditingProtected] = useState(false);
  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data));
  }, []);

  function openCreate() {
    setEditing(null);
    setEditingProtected(false);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(cat) {
    setEditing(cat.id);
    setEditingProtected(isProtectedCategory(cat));
    setForm({ name: cat.name, imageUrl: cat.imageUrl || '' });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const data = { name: form.name, imageUrl: form.imageUrl || null };
    try {
      if (editing) {
        const res = await updateCategory(editing, data);
        setCategories((prev) => prev.map((c) => (c.id === editing ? res.data : c)));
      } else {
        const res = await createCategory(data);
        setCategories((prev) => [...prev, res.data]);
      }
      setShowForm(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const ok = await showConfirm('La categoría y todos sus productos serán eliminados permanentemente.', {
      title: '¿Eliminar categoría?',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Categoría eliminada.', 'success');
  }

  return (
    <AppLayout
      title="Gestionar categorías"
      subtitle="Configura categorías visibles en el panel de venta"
      actions={
        <button onClick={openCreate} className="ui-btn ui-btn-primary">
          Crear categoría
        </button>
      }
    >
      {categories.length === 0 ? (
        <p className="text-slate-700 font-medium">No hay categorías aún.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 max-w-6xl">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="relative rounded-2xl overflow-hidden h-56 border border-slate-300 shadow"
              style={{
                backgroundImage: cat.imageUrl ? `url(${cat.imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!cat.imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />}
              <div className="absolute inset-0 bg-black/40" />

              <div className="absolute top-3 left-3 ui-glass-tag">
                <CategorySilhouette />
                <span className="text-white text-xs font-semibold tracking-wide">Categoría</span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="font-bold text-white text-2xl leading-tight truncate">{cat.name}</p>

                {isProtectedCategory(cat) && (
                  <span className="inline-flex mt-2 bg-slate-900/80 text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/30">
                    Categoría protegida
                  </span>
                )}

                <div className="mt-3 flex gap-2">
                  {!isProtectedCategory(cat) && (
                    <button
                      onClick={() => navigate(`/admin/products?new=1&categoryId=${cat.id}`)}
                      className="ui-btn ui-btn-success !px-3 !py-1.5"
                    >
                      Nuevo producto
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(cat)}
                    className="ui-btn ui-btn-info !px-3 !py-1.5"
                  >
                    Editar
                  </button>
                  {!isProtectedCategory(cat) && (
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="ui-btn ui-btn-danger !px-3 !py-1.5"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {showForm && (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-card">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nombre de la categoría"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="ui-input"
                disabled={editingProtected}
                required
              />
              {editingProtected && (
                <p className="text-xs text-slate-500">El nombre de esta categoría está protegido. Solo puedes cambiar la imagen.</p>
              )}
              <input
                type="url"
                placeholder="URL de imagen de fondo (opcional)"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="ui-input"
              />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="preview" className="w-full h-32 object-cover rounded-xl" onError={(e) => e.target.style.display='none'} />
              )}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 ui-btn ui-btn-neutral !py-3">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 ui-btn ui-btn-primary !py-3">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
