import React from 'react';
import { scorePassword } from '@/lib/passwordStrength';

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  const result = scorePassword(password);
  if (!password) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 99,
              background: i <= result.score ? result.color : 'var(--border)',
              transition: 'background 300ms',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '11px', color: result.color, transition: 'color 300ms' }}>
        {result.label}
      </span>
    </div>
  );
}
