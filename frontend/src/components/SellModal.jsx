import { useState, useRef, useEffect } from 'react';
import { createSale } from '../services/sale.service';
import { createCredit } from '../services/credit.service';
import { getCustomers } from '../services/customer.service';
import { useToast } from './Toast';
import { useAuth } from '../store/AuthContext';

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-slate-700">
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 8.5 12 13l8-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-emerald-700">
      <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-700">
      <path d="M7 4h8l4 4v12H7V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 13h6M10 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 10v1a6 6 0 1 0 12 0v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17v4M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SellModal({ product, products = [], allowMultiProduct = false, onClose, onSuccess }) {
  const [mode, setMode] = useState(null); // 'sell' | 'credit'
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([{ productId: product.id, quantity: 1 }]);
  const [productToAdd, setProductToAdd] = useState(String(product.id));
  const [customerIdNumber, setCustomerIdNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  const recognitionRef = useRef(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  const productCatalog = products.length > 0 ? products.filter((item) => Number(item.stock || 0) > 0) : [product];

  useEffect(() => {
    setQuantity(1);
    setCartItems([{ productId: product.id, quantity: 1 }]);
    setProductToAdd(String(product.id));
  }, [product.id]);

  function getProductById(productId) {
    return productCatalog.find((item) => item.id === Number(productId));
  }

  function getItemTotal(item) {
    const selected = getProductById(item.productId);
    return Number(selected?.price || 0) * Number(item.quantity || 0);
  }

  function addProductToCart() {
    const selectedId = Number(productToAdd);
    const selected = getProductById(selectedId);
    if (!selected) return;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === selectedId);
      if (existing) {
        return prev.map((item) => item.productId === selectedId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: selectedId, quantity: 1 }];
    });
  }

  function updateCartQuantity(productId, value) {
    setCartItems((prev) => prev.map((item) => item.productId === productId ? { ...item, quantity: value } : item));
    if (errorDialog.open) {
      setErrorDialog({ open: false, title: '', message: '' });
    }
  }

  function removeFromCart(productId) {
    setCartItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.productId !== productId);
    });
  }

  const maxSingleQuantity = Math.max(1, Number(product?.stock || 1));

  function setSingleQuantity(nextQuantity) {
    const parsed = Number(nextQuantity);
    const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : 1;
    const clamped = Math.min(Math.max(normalized, 1), maxSingleQuantity);
    setQuantity(clamped);
    if (errorDialog.open) {
      setErrorDialog({ open: false, title: '', message: '' });
    }
  }

  function increaseSingleQuantity() {
    setSingleQuantity(Number(quantity || 1) + 1);
  }

  function decreaseSingleQuantity() {
    setSingleQuantity(Number(quantity || 1) - 1);
  }

  function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Tu navegador no soporta reconocimiento de voz', 'warning');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNote((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
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

  async function handleConfirm() {
    const normalizedItems = allowMultiProduct
      ? cartItems.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        }))
      : [{ productId: Number(product.id), quantity: Number(quantity) }];

    if (normalizedItems.length === 0) {
      showToast('Debes agregar al menos un producto', 'warning');
      return;
    }

    if (normalizedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      showToast('Todas las cantidades deben ser números enteros mayores o iguales a 1', 'warning');
      return;
    }

    let customerForCredit = selectedCustomer;
    if (mode === 'credit') {
      const normalizedId = String(customerIdNumber || '').trim();
      if (!normalizedId) {
        showToast('Debes ingresar la cédula del cliente', 'warning');
        return;
      }

      if (!customerForCredit || String(customerForCredit.idNumber || '').trim() !== normalizedId) {
        customerForCredit = await resolveCustomerByIdNumber(normalizedId);
      }

      if (!customerForCredit?.id) {
        showToast('No existe un cliente registrado con esa cédula', 'warning');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'sell') {
        await createSale({
          items: normalizedItems,
          branchId: user?.role === 'ADMIN' ? Number(localStorage.getItem('activeBranchId') || 0) || undefined : undefined,
        });
      } else {
        await createCredit({
          customerId: customerForCredit.id,
          note: note.trim() || null,
          items: normalizedItems,
          branchId: user?.role === 'ADMIN' ? Number(localStorage.getItem('activeBranchId') || 0) || undefined : undefined,
        });
      }
      onSuccess(normalizedItems);
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || 'Error al procesar';
      const stockError = /stock insuficiente/i.test(message);

      if (stockError) {
        setErrorDialog({
          open: true,
          title: 'Cantidad superior al stock',
          message: `${message}. Ajusta la cantidad para continuar.`,
        });
      } else {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ui-modal-backdrop bg-slate-950/50">
      <div className="ui-modal-card">
        {/* Producto */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center">
              <BoxIcon />
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900 text-2xl leading-tight">{product.name}</p>
            <p className="text-slate-500 text-sm mt-1">Puedes agregar más productos antes de confirmar.</p>
          </div>
        </div>

        {allowMultiProduct && (
        <div className="rounded-xl border border-slate-200 p-3 mb-4 bg-slate-50">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Agregar producto</label>
          <div className="flex gap-2">
            <select
              value={productToAdd}
              onChange={(e) => setProductToAdd(e.target.value)}
              className="ui-input"
            >
              {productCatalog.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · ${Number(item.price || 0).toLocaleString()}</option>
              ))}
            </select>
            <button type="button" onClick={addProductToCart} className="ui-btn ui-btn-primary !py-2 whitespace-nowrap">Agregar</button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {cartItems.map((item) => {
              const selected = getProductById(item.productId);
              return (
                <div key={item.productId} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-800">{selected?.name || 'Producto'}</p>
                    {cartItems.length > 1 && (
                      <button type="button" onClick={() => removeFromCart(item.productId)} className="text-xs font-bold text-red-600 hover:text-red-700">Quitar</button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateCartQuantity(item.productId, e.target.value)}
                      className="ui-input"
                    />
                    <p className="text-xs font-semibold text-slate-600 min-w-[110px] text-right">
                      Total: ${getItemTotal(item).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between text-sm font-bold text-slate-800">
            <span>Total general</span>
            <span>${cartItems.reduce((sum, item) => sum + getItemTotal(item), 0).toLocaleString()}</span>
          </div>
        </div>
        )}

        {/* Selección vender / fiar */}
        {!mode && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('sell')}
              className="flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-4 rounded-xl text-3xl transition"
            >
              <SellIcon />
              <span className="text-base">Vender</span>
            </button>
            <button
              onClick={() => setMode('credit')}
              className="flex items-center justify-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-4 rounded-xl text-3xl transition"
            >
              <CreditIcon />
              <span className="text-base">Fiar</span>
            </button>
          </div>
        )}

        {/* Confirmar venta */}
        {mode === 'sell' && (
          <div>
            {!allowMultiProduct && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad a vender</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={decreaseSingleQuantity}
                    className="ui-btn ui-btn-neutral !py-2"
                  >
                    -
                  </button>
                  <div className="rounded-xl border border-slate-300 bg-white text-slate-900 text-center font-bold flex items-center justify-center">
                    {Number(quantity) || 1}
                  </div>
                  <button
                    type="button"
                    onClick={increaseSingleQuantity}
                    className="ui-btn ui-btn-primary !py-2"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Total estimado: ${(Number(product.price || 0) * (Number(quantity) || 1)).toLocaleString()}
                </p>
              </div>
            )}

            <p className="text-center text-slate-700 mb-4">
              {allowMultiProduct ? '¿Confirmar venta de los productos seleccionados?' : <>¿Confirmar venta de <strong>{product.name}</strong>?</>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setMode(null)} className="flex-1 ui-btn ui-btn-neutral !py-3">
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={loading} className="flex-1 ui-btn ui-btn-success !py-3">
                {loading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}

        {/* Formulario fiar */}
        {mode === 'credit' && (
          <div className="flex flex-col gap-3">
            {!allowMultiProduct && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad a fiar</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={decreaseSingleQuantity}
                    className="ui-btn ui-btn-neutral !py-2"
                  >
                    -
                  </button>
                  <div className="rounded-xl border border-slate-300 bg-white text-slate-900 text-center font-bold flex items-center justify-center">
                    {Number(quantity) || 1}
                  </div>
                  <button
                    type="button"
                    onClick={increaseSingleQuantity}
                    className="ui-btn ui-btn-primary !py-2"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cédula del cliente</label>
              <input
                type="text"
                placeholder="Ingresa la cédula"
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
                className="ui-input"
              />
              {checkingCustomer && (
                <p className="text-xs text-slate-500 mt-2">Verificando cliente...</p>
              )}
              {!checkingCustomer && selectedCustomer?.id && (
                <p className="text-xs text-emerald-700 mt-2 font-semibold">
                  Cliente encontrado: {selectedCustomer.firstName} {selectedCustomer.lastName}
                </p>
              )}
            </div>
            <div className="relative">
              <textarea
                placeholder="Nota (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="ui-input text-base focus:ring-amber-400 resize-none"
              />
              <button
                type="button"
                onClick={() => startVoiceRecognition()}
                disabled={listening}
                className={`absolute bottom-3 right-3 p-1 ${listening ? 'animate-pulse text-red-500' : 'text-slate-400 hover:text-slate-600'}`}
                title="Hablar nota"
              >
                <MicIcon />
              </button>
            </div>
            {listening && <p className="text-red-500 text-sm text-center animate-pulse">Escuchando...</p>}
            <div className="flex gap-3">
              <button onClick={() => setMode(null)} className="flex-1 ui-btn ui-btn-neutral !py-3">
                Cancelar
              </button>
              <button onClick={handleConfirm} disabled={loading} className="flex-1 ui-btn ui-btn-warning !py-3">
                {loading ? 'Procesando...' : 'Confirmar fiado'}
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} className="mt-3 w-full ui-btn ui-btn-neutral !py-3 text-base">
          Cerrar
        </button>
      </div>

      {errorDialog.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white shadow-2xl">
            <div className="px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-extrabold text-lg">!</div>
                <div>
                  <p className="text-lg font-extrabold text-red-800">{errorDialog.title}</p>
                  <p className="text-sm text-red-700 mt-1">{errorDialog.message}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setErrorDialog({ open: false, title: '', message: '' })}
                className="ui-btn ui-btn-danger !px-5 !py-2"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
