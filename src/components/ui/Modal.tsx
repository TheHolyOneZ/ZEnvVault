import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number | string;
  children: React.ReactNode;
  dataTour?: string;
}

export function Modal({ open, onClose, title, width = 500, children, dataTour }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 150ms ease both',
      }}
    >
      <div
        className="animate-modal-in"
        data-tour={dataTour}
        style={{
          width, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 80px)',
          background: 'var(--surface-up)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {title && (
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>{title}</span>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--r-md)', color: 'var(--text-muted)', transition: 'all 100ms',
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.background = 'var(--surface-hover)'); (e.currentTarget.style.color = 'var(--text)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-muted)'); }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
