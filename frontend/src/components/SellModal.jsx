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

export default function SellModal({ product, onClose, onSuccess }) {
  const [mode, setMode] = useState(null); // 'sell' | 'credit'
  const [quantity, setQuantity] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });
  const recognitionRef = useRef(null);
  const { showToast } = useToast();
  const { user } = useAuth();

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

  useEffect(() => {
    if (mode !== 'credit') return;
    getCustomers(customerSearch)
      .then((res) => setCustomers(res.data || []))
      .catch(() => setCustomers([]));
  }, [mode, customerSearch]);

  async function handleConfirm() {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      showToast('La cantidad debe ser un número entero mayor o igual a 1', 'warning');
      return;
    }

    if (mode === 'credit' && !selectedCustomer?.id) {
      showToast('Debes seleccionar un cliente registrado para fiar', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'sell') {
        await createSale({
          items: [{ productId: product.id, quantity: qty }],
          branchId: user?.role === 'ADMIN' ? Number(localStorage.getItem('activeBranchId') || 0) || undefined : undefined,
        });
      } else {
        await createCredit({
          customerId: selectedCustomer.id,
          note: note.trim() || null,
          items: [{ productId: product.id, quantity: qty }],
          branchId: user?.role === 'ADMIN' ? Number(localStorage.getItem('activeBranchId') || 0) || undefined : undefined,
        });
      }
      onSuccess(product.id, qty);
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
            <p className="text-sky-700 font-bold text-3xl mt-1">${product.price.toLocaleString()}</p>
          </div>
        </div>

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
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad a vender</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (errorDialog.open) {
                    setErrorDialog({ open: false, title: '', message: '' });
                  }
                }}
                className="ui-input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Total estimado: ${(Number(product.price || 0) * (Number(quantity) || 0)).toLocaleString()}
              </p>
            </div>
            <p className="text-center text-slate-700 mb-4">¿Confirmar venta de <strong>{product.name}</strong>?</p>
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
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad a fiar</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (errorDialog.open) {
                    setErrorDialog({ open: false, title: '', message: '' });
                  }
                }}
                className="ui-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente (nombre o cédula)</label>
              <input
                type="text"
                placeholder="Buscar por nombre o cédula"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomer(null);
                }}
                className="ui-input"
              />
              <div className="mt-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl">
                {customers.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3">No se encontraron clientes.</p>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(`${c.firstName} ${c.lastName} · ${c.idNumber}`);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <p className="text-sm font-semibold text-slate-800">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-slate-500">Cédula: {c.idNumber} · Cel: {c.phone}</p>
                    </button>
                  ))
                )}
              </div>
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
