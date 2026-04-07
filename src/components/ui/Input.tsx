import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  label?: string;
  error?: string;
  suffix?: React.ReactNode;
}

export function Input({ mono, label, error, suffix, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  const wrapStyle: React.CSSProperties = {
    position: 'relative', display: 'flex', alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px',
    background: 'var(--surface-input)',
    border: `1px solid ${error ? 'var(--red)' : focused ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--r-md)',
    color: 'var(--text)', fontSize: '13px',
    fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
    transition: 'border-color 100ms ease',
    paddingRight: suffix ? '36px' : '10px',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>{label}</label>}
      <div style={wrapStyle}>
        <input
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <span style={{ fontSize: '11px', color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}
