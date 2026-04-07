import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  
  const menuWidth = 200;
  const estHeight = items.length * 32;
  const left = Math.min(x, window.innerWidth - menuWidth - 8);
  const top = Math.min(y, window.innerHeight - estHeight - 8);

  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed', left, top, zIndex: 9999,
        width: menuWidth,
        background: 'var(--surface-up)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', padding: '4px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        animation: 'scaleIn 100ms ease-out',
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />;
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.action(); onClose(); }}
            style={{
              width: '100%', padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: '8px',
              borderRadius: 'var(--r-sm)', fontSize: '12px', textAlign: 'left',
              color: item.danger ? 'var(--red)' : item.disabled ? 'var(--text-muted)' : 'var(--text-dim)',
              background: 'transparent', transition: 'background 80ms',
              cursor: item.disabled ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {item.icon && <span style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
