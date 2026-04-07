import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const colors: Record<ToastType, { bg: string; border: string; iconColor: string; Icon: React.ElementType }> = {
    success: { bg: 'var(--green-sub)',   border: 'rgba(52,201,122,0.3)',  iconColor: 'var(--green)',   Icon: Check         },
    error:   { bg: 'var(--red-sub)',     border: 'rgba(255,69,58,0.3)',   iconColor: 'var(--red)',     Icon: X             },
    warning: { bg: 'var(--amber-sub)',   border: 'rgba(245,166,35,0.3)', iconColor: 'var(--amber)',   Icon: AlertTriangle },
    info:    { bg: 'var(--accent-sub)', border: 'var(--accent-border)',  iconColor: 'var(--accent)',  Icon: Info          },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const c = colors[t.type];
          return (
            <div key={t.id} className="animate-slide-right" style={{
              padding: '10px 14px', borderRadius: 'var(--r-md)',
              background: 'var(--surface-up)', border: `1px solid ${c.border}`,
              boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', maxWidth: '320px', pointerEvents: 'auto',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', background: c.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: c.iconColor,
              }}><c.Icon size={11} strokeWidth={2.5} /></span>
              <span style={{ color: 'var(--text)' }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
