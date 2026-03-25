import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
      <path d="M12 3L2 21h20L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const TYPES = {
  success: {
    bar: 'bg-emerald-500',
    icon: CheckIcon,
    iconBg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    label: 'Éxito',
    labelColor: 'text-emerald-700',
  },
  error: {
    bar: 'bg-rose-500',
    icon: ErrorIcon,
    iconBg: 'bg-rose-100 text-rose-700',
    border: 'border-rose-200',
    label: 'Error',
    labelColor: 'text-rose-700',
  },
  warning: {
    bar: 'bg-amber-400',
    icon: WarningIcon,
    iconBg: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    label: 'Advertencia',
    labelColor: 'text-amber-700',
  },
  info: {
    bar: 'bg-sky-500',
    icon: InfoIcon,
    iconBg: 'bg-sky-100 text-sky-700',
    border: 'border-sky-200',
    label: 'Info',
    labelColor: 'text-sky-700',
  },
};

function ToastItem({ toast, onRemove }) {
  const t = TYPES[toast.type] || TYPES.info;
  const Icon = t.icon;
  return (
    <div
      className={`relative flex items-start gap-3 bg-white border ${t.border} rounded-2xl shadow-xl px-4 pt-4 pb-3 w-full overflow-hidden toast-enter`}
    >
      {/* colored top bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${t.bar} rounded-t-2xl`} />

      {/* icon */}
      <div className={`mt-0.5 p-1.5 rounded-xl ${t.iconBg}`}>
        <Icon />
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${t.labelColor}`}>{t.label}</p>
        <p className="text-slate-800 text-sm font-medium leading-snug">{toast.message}</p>
      </div>

      {/* close */}
      <button
        onClick={() => onRemove(toast.id)}
        className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-3 left-3 sm:top-5 sm:right-5 sm:left-auto z-[9999] flex flex-col gap-2 pointer-events-none sm:w-auto sm:max-w-[400px]">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
