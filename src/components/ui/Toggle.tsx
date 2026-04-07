import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, label, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const thumb = size === 'sm' ? 12 : 16;
  const gap = (h - thumb) / 2;

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', display: 'inline-flex', width: w, height: h, flexShrink: 0,
          borderRadius: 'var(--r-full)',
          background: checked ? 'var(--accent)' : 'var(--border)',
          transition: 'background 150ms ease',
        }}
      >
        <span
          style={{
            position: 'absolute', top: gap, left: checked ? w - thumb - gap : gap,
            width: thumb, height: thumb, borderRadius: '50%',
            background: checked ? '#fff' : 'var(--text-muted)',
            transition: 'left 150ms ease, background 150ms ease',
          }}
        />
      </span>
      {label && <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{label}</span>}
    </label>
  );
}
