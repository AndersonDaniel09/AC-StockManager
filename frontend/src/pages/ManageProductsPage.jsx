import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/product.service';
import { getCategories } from '../services/category.service';
import { getBranches } from '../services/branch.service';
import { useAuth } from '../store/AuthContext';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

const EMPTY_FORM = { name: '', price: '', stock: '', imageUrl: '', categoryId: '' };

function ProductSilhouette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white/90">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 8.5 12 13l8-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function ManageProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null); // product id siendo editado
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(localStorage.getItem('activeBranchId') || '');
  const { user } = useAuth();
  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const productPromise = getProducts(user?.role === 'ADMIN' ? (activeBranchId || undefined) : undefined);
    const categoriesPromise = getCategories();
    const branchesPromise = user?.role === 'ADMIN' ? getBranches() : Promise.resolve({ data: [] });

    Promise.all([productPromise, categoriesPromise, branchesPromise]).then(([p, c, b]) => {
      setProducts(p.data);
      setCategories(c.data);
      setBranches(b.data || []);

      if (user?.role === 'ADMIN' && !activeBranchId && b.data?.[0]?.id) {
        const id = String(b.data[0].id);
        setActiveBranchId(id);
        localStorage.setItem('activeBranchId', id);
      }
    });
  }, [user?.role, activeBranchId]);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get('new') === '1';
    if (!shouldOpenCreate) return;

    const categoryId = searchParams.get('categoryId') || '';
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId });
    setShowForm(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(product) {
    setEditing(product.id);
    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: product.imageUrl || '',
      categoryId: String(product.categoryId),
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const data = {
      name: form.name,
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
      imageUrl: form.imageUrl || null,
      categoryId: parseInt(form.categoryId, 10),
      branchId: user?.role === 'ADMIN' ? Number(activeBranchId) : undefined,
    };
    try {
      if (editing) {
        const res = await updateProduct(editing, data);
        setProducts((prev) => prev.map((p) => (p.id === editing ? res.data : p)));
      } else {
        const res = await createProduct(data);
        setProducts((prev) => [...prev, res.data]);
      }
      setShowForm(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const ok = await showConfirm('El producto será eliminado permanentemente del inventario.', {
      title: '¿Eliminar producto?',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    await deleteProduct(id, user?.role === 'ADMIN' ? (activeBranchId || undefined) : undefined);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Producto eliminado.', 'success');
  }

  return (
    <AppLayout
      title="Gestionar productos"
      subtitle="Administra inventario, precios y stock"
      actions={
        (user?.role === 'ADMIN' || user?.canEditProducts) && (
          <div className="flex items-center gap-2">
            {user?.role === 'ADMIN' && (
              <select
                value={activeBranchId}
                onChange={(e) => {
                  setActiveBranchId(e.target.value);
                  localStorage.setItem('activeBranchId', e.target.value);
                }}
                className="ui-input min-w-52"
              >
                <option value="">Todas las sedes</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            )}
            <button onClick={openCreate} className="ui-btn ui-btn-primary" disabled={user?.role === 'ADMIN' && !activeBranchId}>
              Crear producto
            </button>
          </div>
        )
      }
    >
      {products.length === 0 ? (
        <p className="text-slate-700 font-medium">No hay productos aún.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 max-w-6xl place-items-start">
          {products.map((product) => (
            <div
              key={product.id}
              className="relative rounded-2xl overflow-hidden w-full max-w-[250px] aspect-[3/4] border border-slate-300 shadow"
              style={{
                backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!product.imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />}
              <div className="absolute inset-0 bg-black/40" />

              <div className="absolute top-3 left-3 ui-glass-tag">
                <ProductSilhouette />
                <span className="text-white text-xs font-semibold tracking-wide">{product.category?.name || 'Producto'}</span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="font-bold text-white text-xl leading-tight truncate">{product.name}</p>
                <p className="text-cyan-300 font-extrabold text-lg mt-1">${product.price.toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    product.stock <= 3 ? 'bg-rose-600/95 text-white' : 'bg-emerald-600/95 text-white'
                  }`}>
                    Stock: {product.stock}
                  </span>
                </div>

                {(user?.role === 'ADMIN' || user?.canEditProducts) && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="ui-btn ui-btn-info !px-3 !py-1.5"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="ui-btn ui-btn-danger !px-3 !py-1.5"
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {showForm && (
        <div className="ui-modal-backdrop">
          <div className="ui-modal-card max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nombre del producto"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="ui-input"
                required
              />
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="ui-input"
                required
              >
                <option value="">Selecciona categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Precio"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="ui-input"
                min="0"
                step="0.01"
                required
              />
              <input
                type="number"
                placeholder="Stock inicial"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="ui-input"
                min="0"
                required
              />
              <input
                type="url"
                placeholder="URL de imagen (opcional)"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="ui-input"
              />
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
