import React, { useState, useEffect } from 'react';
import { revealVariable } from '@/lib/tauri';
import { useUiStore } from '@/store/uiStore';
import { useToast } from '@/components/ui/Toast';
import { copyVariableValue } from '@/lib/tauri';

interface RevealValueProps {
  variableId: string;
  isSecret: boolean;
}

export function RevealValue({ variableId, isSecret }: RevealValueProps) {
  const revealed = useUiStore((s) => s.revealedValues[variableId]);
  const isRevealed = useUiStore((s) => s.revealedIds.has(variableId));
  const setRevealed = useUiStore((s) => s.setRevealed);
  const unreveal = useUiStore((s) => s.unreveal);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  
  useEffect(() => {
    if (!isRevealed) return;
    const timer = setTimeout(() => unreveal(variableId), 30_000);
    return () => clearTimeout(timer);
  }, [isRevealed, variableId, unreveal]);

  async function handleReveal() {
    if (isRevealed) { unreveal(variableId); return; }
    setLoading(true);
    try {
      const value = await revealVariable(variableId);
      setRevealed(variableId, value);
    } catch {
      toast('Failed to reveal value', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await copyVariableValue(variableId);
      toast('Copied to clipboard', 'success');
    } catch {
      toast('Failed to copy', 'error');
    }
  }

  if (!isSecret && revealed) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-dim)' }}>
        {revealed}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '12px',
        color: isRevealed ? 'var(--text-dim)' : 'var(--text-muted)',
        filter: isRevealed ? 'none' : 'blur(3px)',
        userSelect: isRevealed ? 'text' : 'none',
        transition: 'filter 100ms',
        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {isRevealed ? revealed : '••••••••••••'}
      </span>
      <button
        onClick={handleReveal}
        disabled={loading}
        style={{
          fontSize: '10px', padding: '1px 6px', borderRadius: 'var(--r-sm)',
          background: 'var(--surface-hover)', color: 'var(--text-muted)',
          border: '1px solid var(--border)', cursor: 'pointer',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? '…' : isRevealed ? 'hide' : 'show'}
      </button>
    </div>
  );
}
