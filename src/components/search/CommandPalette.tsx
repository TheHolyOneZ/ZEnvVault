import React, { useEffect, useState, useRef } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import type { SearchResult } from '@/types';
import { searchVariables } from '@/lib/tauri';

export function CommandPalette() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpen = modal === 'command-palette';

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setResults([]);
    setSelectedIdx(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await searchVariables(query);
        setResults(res);
        setSelectedIdx(0);
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[selectedIdx]) {
        
        closeModal();
      }
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, selectedIdx, closeModal]);

  if (!isOpen) return null;

  const actions = [
    { label: 'New variable', action: () => { closeModal(); openModal('variable'); } },
    { label: 'New project', action: () => { closeModal(); openModal('project'); } },
    { label: 'Import .env file', action: () => { closeModal(); openModal('import'); } },
    { label: 'Export to .env', action: () => { closeModal(); openModal('export'); } },
    { label: 'Settings', action: () => { closeModal(); openModal('settings'); } },
  ].filter((a) => !query || a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && closeModal()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', paddingTop: '15vh',
      }}
    >
      <div className="animate-modal-in" style={{
        width: 520, maxHeight: 400, background: 'var(--surface-up)',
        border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search variables, actions…"
            style={{ flex: 1, fontSize: '14px', color: 'var(--text)', background: 'none' }}
          />
          <kbd style={{ fontSize: '10px', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 5px' }}>ESC</kbd>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!query && (
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '4px 14px 2px' }}>Actions</p>
              {actions.map((a, i) => (
                <div key={i} onClick={a.action} style={{
                  padding: '8px 14px', fontSize: '13px', cursor: 'pointer',
                  color: 'var(--text-dim)',
                  background: selectedIdx === i ? 'var(--surface-hover)' : 'transparent',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >{a.label}</div>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '4px 14px 2px' }}>Variables</p>
              {results.map((r, i) => (
                <div key={r.variable_id} style={{
                  padding: '8px 14px', cursor: 'pointer',
                  background: selectedIdx === i ? 'var(--surface-hover)' : 'transparent',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; setSelectedIdx(i); }}
                  onMouseLeave={(e) => e.currentTarget.style.background = selectedIdx === i ? 'var(--surface-hover)' : 'transparent'}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, color: 'var(--mono-text)' }}>{r.key}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {r.project_name} › {r.tier_name}
                    {r.description && <span style={{ marginLeft: '8px' }}>· {r.description}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {query && results.length === 0 && actions.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
