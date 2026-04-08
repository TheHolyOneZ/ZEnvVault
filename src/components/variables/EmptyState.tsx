import React from 'react';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { Layers, KeyRound } from 'lucide-react';

export function EmptyState() {
  const openModal = useUiStore((s) => s.openModal);
  const activeTierId = useProjectStore((s) => s.activeTierId);

  if (!activeTierId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--r-lg)',
          background: 'var(--surface-hover)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)',
        }}>
          <Layers size={20} strokeWidth={1.6} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 6px' }}>
            No environments yet
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: 300, margin: 0 }}>
            Environments separate your variables by context —{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--mono-text)', fontSize: '11px' }}>dev</code>,{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--mono-text)', fontSize: '11px' }}>staging</code>,{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--mono-text)', fontSize: '11px' }}>prod</code>.{' '}
            Click the <strong style={{ color: 'var(--accent)' }}>+</strong> in the tab bar above to add one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 'var(--r-lg)',
        background: 'var(--accent-sub)', border: '1px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <KeyRound size={24} strokeWidth={1.6} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)', margin: '0 0 6px' }}>
          No variables yet
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4, margin: 0 }}>
          Add variables manually or import a <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--mono-text)' }}>.env</code> file
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => openModal('import')}
          style={{
            padding: '7px 16px', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 500,
            background: 'var(--surface-hover)', color: 'var(--text-dim)',
            border: '1px solid var(--border)', cursor: 'pointer',
            transition: 'all 120ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
        >
          Import .env
        </button>
        <button
          onClick={() => openModal('variable')}
          style={{
            padding: '7px 16px', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 500,
            background: 'var(--accent)', color: '#fff',
            border: '1px solid transparent', cursor: 'pointer',
            transition: 'background 120ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          Add variable
        </button>
      </div>
    </div>
  );
}
