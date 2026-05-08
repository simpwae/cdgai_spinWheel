import React, { useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => React.useContext(ToastContext);

let _nextId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++_nextId;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), 4000);
    timers.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast stack — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto transition-all animate-in slide-in-from-right-4 max-w-sm ${
              t.type === 'success'
                ? 'bg-white border-green-200 text-green-800'
                : t.type === 'error'
                  ? 'bg-white border-red-200 text-red-800'
                  : 'bg-white border-amber-200 text-amber-800'
            }`}
          >
            {t.type === 'success' && <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-green-600" />}
            {t.type === 'error' && <XCircle size={16} className="flex-shrink-0 mt-0.5 text-red-600" />}
            {t.type === 'warning' && <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-600" />}
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
