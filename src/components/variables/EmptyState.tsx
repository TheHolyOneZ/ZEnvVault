import React from 'react';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { Lock } from 'lucide-react';

export function EmptyState() {
  const openModal = useUiStore((s) => s.openModal);
  const activeTierId = useProjectStore((s) => s.activeTierId);

  if (!activeTierId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '32px', opacity: 0.3 }}>↑</div>
        <p style={{ fontSize: '13px', textAlign: 'center' }}>
          Create an environment first
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
          Environments separate your variables by context — e.g. <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--mono-text)' }}>dev</code>, <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--mono-text)' }}>staging</code>, <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--mono-text)' }}>prod</code>. Click the <strong style={{ color: 'var(--accent)' }}>+</strong> in the tab bar above to add one.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: 48, height: 48, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.5 }}><Lock size={22} strokeWidth={1.5} /></div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 500, color: 'var(--text-dim)' }}>No variables yet</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Add variables manually or import a .env file</p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => openModal('import')}
          style={{
            padding: '7px 14px', borderRadius: 'var(--r-md)', fontSize: '13px',
            background: 'var(--surface-hover)', color: 'var(--text-dim)',
            border: '1px solid var(--border)',
          }}
        >Import .env</button>
        <button
          onClick={() => openModal('variable')}
          style={{
            padding: '7px 14px', borderRadius: 'var(--r-md)', fontSize: '13px',
            background: 'var(--accent)', color: '#fff',
          }}
        >Add manually</button>
      </div>
    </div>
  );
}
