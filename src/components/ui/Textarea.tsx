import React, { useState } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
  label?: string;
}

export function Textarea({ mono, label, style, ...props }: TextareaProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>{label}</label>}
      <textarea
        style={{
          width: '100%', padding: '7px 10px', minHeight: '72px',
          background: 'var(--surface-input)',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)',
          color: 'var(--text)', fontSize: '13px', resize: 'vertical',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
          transition: 'border-color 100ms ease', lineHeight: 1.5,
          ...style,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </div>
  );
}
