import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, action?: ToastAction) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, dismissToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type, action }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), action ? 5500 : 3500);
  }, []);

  const config: Record<ToastType, { border: string; iconBg: string; iconColor: string; bar: string; Icon: React.ElementType }> = {
    success: { border: 'rgba(52,201,122,0.25)',  iconBg: 'var(--green-sub)',   iconColor: 'var(--green)',   bar: 'var(--green)',   Icon: Check         },
    error:   { border: 'rgba(255,69,58,0.25)',   iconBg: 'var(--red-sub)',     iconColor: 'var(--red)',     bar: 'var(--red)',     Icon: X             },
    warning: { border: 'rgba(245,166,35,0.25)',  iconBg: 'var(--amber-sub)',   iconColor: 'var(--amber)',   bar: 'var(--amber)',   Icon: AlertTriangle },
    info:    { border: 'var(--accent-border)',   iconBg: 'var(--accent-sub)',  iconColor: 'var(--accent)',  bar: 'var(--accent)',  Icon: Info          },
  };

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const c = config[t.type];
          const duration = t.action ? 5.5 : 3.5;
          return (
            <div
              key={t.id}
              className="animate-slide-right"
              style={{
                position: 'relative', overflow: 'hidden',
                padding: '10px 14px 12px',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-up)',
                border: `1px solid ${c.border}`,
                boxShadow: 'var(--shadow-md)',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '13px', maxWidth: '340px', minWidth: '220px',
                pointerEvents: 'auto',
              }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 'var(--r-md)',
                background: c.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: c.iconColor,
              }}>
                <c.Icon size={13} strokeWidth={2.5} />
              </span>

              <span style={{ color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>{t.message}</span>

              {t.action && (
                <button
                  onClick={() => { t.action!.onClick(); dismissToast(t.id); }}
                  style={{
                    padding: '3px 10px', borderRadius: 'var(--r-sm)',
                    background: 'var(--surface-hover)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  {t.action.label}
                </button>
              )}

              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                height: '2px',
                background: c.bar,
                borderRadius: '0 0 var(--r-md) var(--r-md)',
                opacity: 0.6,
                animation: `toastProgress ${duration}s linear forwards`,
              }} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
