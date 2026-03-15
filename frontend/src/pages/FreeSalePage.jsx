import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../services/product.service';
import { getCategories } from '../services/category.service';
import { createSale } from '../services/sale.service';
import { createCredit } from '../services/credit.service';
import { getCustomers } from '../services/customer.service';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../components/Toast';

const PROTECTED_FREE_SALE_CATEGORY_NAME = 'venta de varios productos';

function ProductSilhouette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white/90">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 8.5 12 13l8-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function FreeSalePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(null); // 'sell' | 'credit'
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [creditNote, setCreditNote] = useState('');
  const [processingCheckout, setProcessingCheckout] = useState(false);

  function currency(value) {
    return `$${Number(value || 0).toLocaleString('es-CO')}`;
  }

  useEffect(() => {
    const branchId = user?.role === 'ADMIN' ? (localStorage.getItem('activeBranchId') || undefined) : undefined;
    Promise.all([getCategories(), getProducts(branchId)])
      .then(([categoriesRes, productsRes]) => {
        const rows = categoriesRes.data || [];
        setCategories(rows);
        setProducts(productsRes.data || []);
        if (rows.length > 0) {
          setSelectedCategoryId(rows[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  const filteredProducts = useMemo(() => {
    const byCategory = selectedCategoryId
      ? products.filter((product) => product.categoryId === selectedCategoryId)
      : products;
    return byCategory;
  }, [products, selectedCategoryId]);

  const cartDetailed = useMemo(() => {
    return cartItems
      .map((item) => {
        const product = products.find((row) => row.id === item.productId);
        if (!product) return null;
        return {
          ...item,
          product,
          subtotal: Number(product.price || 0) * Number(item.quantity || 0),
        };
      })
      .filter(Boolean);
  }, [cartItems, products]);

  const cartTotal = useMemo(
    () => cartDetailed.reduce((sum, item) => sum + item.subtotal, 0),
    [cartDetailed]
  );

  const mainCategories = useMemo(
    () => categories.filter((category) => String(category?.name || '').trim().toLowerCase() !== PROTECTED_FREE_SALE_CATEGORY_NAME),
    [categories]
  );

  function addToCart(product) {
    if (!product || Number(product.stock || 0) <= 0) return;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = Math.min(Number(existing.quantity || 0) + 1, Number(product.stock || 0));
        if (nextQty === Number(existing.quantity || 0)) {
          showToast(`No hay más stock disponible para ${product.name}`, 'warning');
          return prev;
        }
        return prev.map((item) => item.productId === product.id ? { ...item, quantity: nextQty } : item);
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  }

  function updateCartQuantity(productId, quantityValue) {
    const product = products.find((row) => row.id === productId);
    if (!product) return;

    const parsed = Number(quantityValue);
    const clamped = Number.isFinite(parsed)
      ? Math.min(Math.max(Math.floor(parsed), 1), Number(product.stock || 0))
      : 1;

    setCartItems((prev) => prev.map((item) => item.productId === productId ? { ...item, quantity: clamped } : item));
  }

  function removeFromCart(productId) {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function clearCheckoutState() {
    setCheckoutMode(null);
    setCustomerIdNumber('');
    setSelectedCustomer(null);
    setCreditNote('');
  }

  function openCheckout() {
    if (cartDetailed.length === 0) {
      showToast('Debes agregar productos al carrito', 'warning');
      return;
    }
    setShowCheckout(true);
    clearCheckoutState();
  }

  function closeCheckout() {
    setShowCheckout(false);
    clearCheckoutState();
  }

  async function resolveCustomerByIdNumber(idNumberInput) {
    const normalized = String(idNumberInput || '').trim();
    if (!normalized) {
      setSelectedCustomer(null);
      return null;
    }

    setCheckingCustomer(true);
    try {
      const res = await getCustomers(normalized);
      const rows = res.data || [];
      const exact = rows.find((customer) => String(customer.idNumber || '').trim() === normalized) || null;
      setSelectedCustomer(exact);
      return exact;
    } catch {
      setSelectedCustomer(null);
      return null;
    } finally {
      setCheckingCustomer(false);
    }
  }

  async function handleConfirmCheckout() {
    if (!checkoutMode) {
      showToast('Debes elegir si será venta o fiado', 'warning');
      return;
    }

    const itemsPayload = cartDetailed.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity || 0),
    }));

    if (itemsPayload.length === 0) {
      showToast('No hay productos en el carrito', 'warning');
      return;
    }

    setProcessingCheckout(true);
    try {
      if (checkoutMode === 'sell') {
        await createSale({
          items: itemsPayload,
          branchId: user?.role === 'ADMIN' ? Number(localStorage.getItem('activeBranchId') || 0) || undefined : undefined,
        });

        setProducts((prev) => prev.map((product) => {
          const item = itemsPayload.find((row) => row.productId === product.id);
          if (!item) return product;
          return { ...product, stock: Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0)) };
        }));
        setCartItems([]);
        showToast(`Venta registrada. Debes cobrar ${currency(cartTotal)}.`, 'success');
        closeCheckout();
        return;
      }

      const normalizedId = String(customerIdNumber || '').trim();
      if (!normalizedId) {
        showToast('Debes ingresar la cédula del cliente', 'warning');
        return;
      }

      let customer = selectedCustomer;
      if (!customer || String(customer.idNumber || '').trim() !== normalizedId) {
        customer = await resolveCustomerByIdNumber(normalizedId);
      }

      if (!customer?.id) {
        showToast('No existe un cliente registrado con esa cédula', 'warning');
        return;
      }

      await createCredit({
        customerId: customer.id,
        note: creditNote.trim() || null,
        items: itemsPayload,
        branchId: user?.role === 'ADMIN' ? Number(localStorage.getItem('activeBranchId') || 0) || undefined : undefined,
      });

      setProducts((prev) => prev.map((product) => {
        const item = itemsPayload.find((row) => row.productId === product.id);
        if (!item) return product;
        return { ...product, stock: Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0)) };
      }));
      setCartItems([]);
      showToast('Fiado registrado correctamente.', 'success');
      closeCheckout();
    } catch (err) {
      showToast(err.response?.data?.message || 'No se pudo procesar la operación', 'error');
    } finally {
      setProcessingCheckout(false);
    }
  }

  function handleProductSold(items = []) {
    setProducts((prev) =>
      prev.map((p) => {
        const soldItem = items.find((item) => item.productId === p.id);
        if (!soldItem) return p;
        return { ...p, stock: Math.max(0, p.stock - Number(soldItem.quantity || 0)) };
      })
    );
  }

  return (
    <AppLayout
      title="Venta de varios productos"
      subtitle="Vende o fía múltiples productos de diferentes categorías"
      actions={
        <button onClick={() => navigate('/sell')} className="ui-btn ui-btn-primary">
          Volver a categorías
        </button>
      }
    >
      {loading ? (
        <p className="text-slate-700 font-medium">Cargando productos...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-5">
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
                {mainCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`relative rounded-2xl overflow-hidden h-36 border text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                      selectedCategoryId === category.id ? 'border-sky-400 shadow-lg' : 'border-slate-300 shadow'
                    }`}
                    style={{
                      backgroundImage: category.imageUrl ? `url(${category.imageUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!category.imageUrl && <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />}
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white text-lg font-bold">{category.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <p className="text-slate-700 font-medium">No hay productos en esta categoría.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 place-items-start">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`relative rounded-2xl overflow-hidden w-full max-w-[250px] aspect-[3/4] border border-slate-300 shadow text-left transition ${
                        product.stock === 0 ? 'opacity-70' : 'hover:-translate-y-0.5 hover:shadow-lg'
                      }`}
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
                        <p className="font-bold text-white text-2xl leading-tight">{product.name}</p>
                        <p className="text-cyan-300 font-extrabold text-lg mt-1">${product.price.toLocaleString()}</p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            product.stock <= 3 ? 'bg-rose-600/95 text-white' : 'bg-emerald-600/95 text-white'
                          }`}>
                            Stock: {product.stock}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            product.stock === 0 ? 'bg-slate-500/95 text-white' : 'bg-sky-600/95 text-white'
                          }`}>
                            {product.stock === 0 ? 'Sin stock' : 'Disponible'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                          className={`mt-3 ui-btn w-full !py-2 ${product.stock === 0 ? 'ui-btn-neutral' : 'ui-btn-primary'}`}
                        >
                          {product.stock === 0 ? 'Sin stock' : 'Agregar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ui-card p-4 h-fit lg:sticky lg:top-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-slate-900">Carrito</h3>
                <span className="text-xs font-bold rounded-full bg-sky-100 text-sky-700 px-3 py-1">
                  {cartDetailed.length} productos
                </span>
              </div>

              {cartDetailed.length === 0 ? (
                <p className="text-slate-500 text-sm">Aún no has agregado productos.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {cartDetailed.map((item) => (
                    <div key={item.productId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-xs font-bold text-red-600 hover:text-red-700"
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.productId, e.target.value)}
                          className="ui-input"
                        />
                        <span className="text-xs font-semibold text-slate-600 min-w-[120px] text-right">
                          {currency(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">Total</p>
                <p className="text-xl font-extrabold text-sky-700">{currency(cartTotal)}</p>
              </div>

              <button
                type="button"
                onClick={openCheckout}
                disabled={cartDetailed.length === 0}
                className="mt-3 w-full ui-btn ui-btn-primary !py-3"
              >
                Finalizar pedido
              </button>
            </div>
          </div>

          {showCheckout && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
              <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="px-6 py-5 border-b border-slate-200">
                  <h3 className="text-xl font-extrabold text-slate-900">Finalizar pedido</h3>
                  <p className="text-sm text-slate-500 mt-1">Total del pedido: {currency(cartTotal)}</p>
                </div>

                <div className="p-6">
                  {!checkoutMode ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutMode('sell')}
                        className="ui-btn ui-btn-success !py-4"
                      >
                        Venta
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutMode('credit')}
                        className="ui-btn ui-btn-warning !py-4"
                      >
                        Fiado
                      </button>
                    </div>
                  ) : checkoutMode === 'sell' ? (
                    <div>
                      <p className="text-slate-800 font-semibold text-center">
                        Debes cobrar al cliente: <span className="text-2xl font-extrabold text-emerald-700">{currency(cartTotal)}</span>
                      </p>
                      <div className="mt-5 flex gap-2">
                        <button type="button" onClick={() => setCheckoutMode(null)} className="ui-btn ui-btn-neutral flex-1">
                          Volver
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmCheckout}
                          disabled={processingCheckout}
                          className="ui-btn ui-btn-success flex-1"
                        >
                          {processingCheckout ? 'Procesando...' : 'Confirmar venta'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Cédula del cliente</label>
                        <input
                          type="text"
                          value={customerIdNumber}
                          onChange={(e) => {
                            setCustomerIdNumber(e.target.value);
                            setSelectedCustomer(null);
                          }}
                          onBlur={() => {
                            const normalized = String(customerIdNumber || '').trim();
                            if (!normalized) return;
                            resolveCustomerByIdNumber(normalized);
                          }}
                          placeholder="Ingresa la cédula"
                          className="ui-input"
                        />
                        {checkingCustomer && <p className="text-xs text-slate-500 mt-2">Verificando cliente...</p>}
                        {!checkingCustomer && selectedCustomer?.id && (
                          <p className="text-xs text-emerald-700 mt-2 font-semibold">
                            Cliente encontrado: {selectedCustomer.firstName} {selectedCustomer.lastName}
                          </p>
                        )}
                      </div>

                      <textarea
                        rows={3}
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        placeholder="Nota (opcional)"
                        className="ui-input resize-none"
                      />

                      <div className="flex gap-2">
                        <button type="button" onClick={() => setCheckoutMode(null)} className="ui-btn ui-btn-neutral flex-1">
                          Volver
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmCheckout}
                          disabled={processingCheckout}
                          className="ui-btn ui-btn-warning flex-1"
                        >
                          {processingCheckout ? 'Procesando...' : 'Confirmar fiado'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-5">
                  <button type="button" onClick={closeCheckout} className="w-full ui-btn ui-btn-neutral">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
