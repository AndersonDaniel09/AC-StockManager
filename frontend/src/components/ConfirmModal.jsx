import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-rose-600">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-sky-600">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8c0-1.1.9-2 2-2a2 2 0 0 1 0 4c-1.1 0-2 .9-2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(null);
  const resolveRef = useRef(null);

  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfig({ message, ...options });
    });
  }, []);

  function handleResult(result) {
    setConfig(null);
    if (resolveRef.current) resolveRef.current(result);
  }

  const Icon = config?.danger ? TrashIcon : QuestionIcon;
  const iconRing = config?.danger ? 'bg-rose-50 ring-rose-100' : 'bg-sky-50 ring-sky-100';
  const confirmBg = config?.danger
    ? 'bg-rose-600 hover:bg-rose-700'
    : 'bg-slate-900 hover:bg-slate-700';

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {config && (
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 confirm-enter">
            {/* icon */}
            <div className={`w-12 h-12 rounded-2xl ${iconRing} ring-4 flex items-center justify-center mb-4`}>
              <Icon />
            </div>

            <p className="text-slate-900 font-bold text-lg leading-tight mb-1">
              {config.title || '¿Confirmar acción?'}
            </p>
            <p className="text-slate-500 text-sm mb-6">{config.message}</p>

            <div className="flex gap-3">
              <button
                onClick={() => handleResult(false)}
                className="flex-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleResult(true)}
                className={`flex-1 text-white py-3 rounded-xl font-semibold transition ${confirmBg}`}
              >
                {config.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext).showConfirm;
}
