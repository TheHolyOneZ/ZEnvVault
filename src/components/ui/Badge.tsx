import React from 'react';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const colors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    default: { bg: 'rgba(42,42,46,0.7)', text: 'var(--text-dim)', border: 'var(--border)' },
    accent: { bg: 'var(--accent-sub)', text: 'var(--accent)', border: 'var(--accent-border)' },
    success: { bg: 'var(--green-sub)', text: 'var(--green)', border: 'rgba(52,201,122,0.3)' },
    warning: { bg: 'var(--amber-sub)', text: 'var(--amber)', border: 'rgba(245,166,35,0.3)' },
    danger: { bg: 'var(--red-sub)', text: 'var(--red)', border: 'rgba(255,69,58,0.3)' },
  };
  const c = colors[variant];

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 7px', borderRadius: 'var(--r-sm)',
        fontSize: '11px', fontWeight: 500,
        background: c.bg, color: c.text,
        border: `1px solid ${c.border}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
