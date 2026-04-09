import React, { useState, useEffect, useRef } from 'react';
import { revealVariable, revealSensitiveVariable } from '@/lib/tauri';
import { useUiStore } from '@/store/uiStore';
import { useToast } from '@/components/ui/Toast';
import { copyVariableValue } from '@/lib/tauri';
import { ShieldAlert } from 'lucide-react';

interface RevealValueProps {
  variableId: string;
  isSecret: boolean;
  sensitive?: boolean;
}

export function RevealValue({ variableId, isSecret, sensitive }: RevealValueProps) {
  const revealed = useUiStore((s) => s.revealedValues[variableId]);
  const isRevealed = useUiStore((s) => s.revealedIds.has(variableId));
  const setRevealed = useUiStore((s) => s.setRevealed);
  const unreveal = useUiStore((s) => s.unreveal);
  const [loading, setLoading] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [pw, setPw] = useState('');
  const pwRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isRevealed) return;
    const timer = setTimeout(() => unreveal(variableId), 30_000);
    return () => clearTimeout(timer);
  }, [isRevealed, variableId, unreveal]);

  useEffect(() => {
    if (prompting) setTimeout(() => pwRef.current?.focus(), 50);
  }, [prompting]);

  async function handleReveal() {
    if (isRevealed) { unreveal(variableId); return; }
    if (sensitive) { setPrompting(true); return; }
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

  async function handleSensitiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    try {
      const value = await revealSensitiveVariable(variableId, pw);
      setRevealed(variableId, value);
      setPrompting(false);
      setPw('');
    } catch (err) {
      const msg = String(err);
      if (msg.includes('InvalidPassword') || msg.includes('invalid password')) {
        toast('Wrong password', 'error');
      } else {
        toast('Failed to reveal', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  if (prompting) {
    return (
      <form onSubmit={handleSensitiveSubmit} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <ShieldAlert size={11} strokeWidth={2} style={{ color: 'var(--amber)', flexShrink: 0 }} />
        <input
          ref={pwRef}
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Master password…"
          onKeyDown={(e) => { if (e.key === 'Escape') { setPrompting(false); setPw(''); } }}
          style={{
            fontSize: '11px', padding: '2px 6px', width: 130,
            background: 'var(--surface-input)', border: '1px solid var(--amber)',
            borderRadius: 'var(--r-sm)', color: 'var(--text)', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !pw.trim()}
          style={{
            fontSize: '10px', padding: '2px 6px', borderRadius: 'var(--r-sm)',
            background: 'var(--amber)', color: '#000', fontWeight: 600,
            cursor: 'pointer', opacity: loading ? 0.5 : 1,
          }}
        >{loading ? '…' : 'OK'}</button>
        <button
          type="button"
          onClick={() => { setPrompting(false); setPw(''); }}
          style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
        >✕</button>
      </form>
    );
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
      {sensitive && !isRevealed && (
        <ShieldAlert size={11} strokeWidth={2} style={{ color: 'var(--amber)', flexShrink: 0, opacity: 0.7 }} />
      )}
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
          background: sensitive && !isRevealed ? 'var(--amber-sub)' : 'var(--surface-hover)',
          color: sensitive && !isRevealed ? 'var(--amber)' : 'var(--text-muted)',
          border: `1px solid ${sensitive && !isRevealed ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
          cursor: 'pointer', opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? '…' : isRevealed ? 'hide' : 'show'}
      </button>
    </div>
  );
}
