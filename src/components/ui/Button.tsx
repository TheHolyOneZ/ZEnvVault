import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({ variant = 'ghost', size = 'md', loading, icon, children, style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    borderRadius: 'var(--r-md)', fontFamily: 'var(--font-ui)', fontWeight: 500,
    cursor: 'pointer', transition: 'all 120ms ease', whiteSpace: 'nowrap',
    padding: size === 'sm' ? '4px 10px' : '7px 14px',
    fontSize: size === 'sm' ? '12px' : '13px',
    ...(variant === 'primary' && {
      background: 'var(--accent)', color: '#fff', border: 'none',
    }),
    ...(variant === 'ghost' && {
      background: 'transparent', color: 'var(--text-dim)',
      border: '1px solid var(--border)',
    }),
    ...(variant === 'danger' && {
      background: 'transparent', color: 'var(--red)',
      border: '1px solid rgba(255,69,58,0.3)',
    }),
    ...(variant === 'subtle' && {
      background: 'var(--surface-hover)', color: 'var(--text-dim)', border: 'none',
    }),
    opacity: props.disabled ? 0.5 : 1,
    ...style,
  };

  return (
    <button style={base} {...props}>
      {loading ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> : icon}
      {children}
    </button>
  );
}
