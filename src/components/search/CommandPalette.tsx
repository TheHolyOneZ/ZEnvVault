import React, { useEffect, useState, useRef } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import type { SearchResult } from '@/types';
import { searchVariables } from '@/lib/tauri';
import { Plus, FolderOpen, Download, Upload, Settings, Lock, Key } from 'lucide-react';

interface Action {
  label: string;
  description?: string;
  Icon: React.ElementType;
  shortcut?: string[];
  action: () => void;
}

export function CommandPalette() {
  const modal      = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal  = useUiStore((s) => s.openModal);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const setActiveTier    = useProjectStore((s) => s.setActiveTier);
  const setLocked        = useAuthStore((s) => s.setLocked);

  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<SearchResult[]>([]);
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

  const allActions: Action[] = [
    { label: 'New variable',    description: 'Add a variable to the active env', Icon: Plus,       shortcut: ['N'],         action: () => { closeModal(); openModal('variable'); } },
    { label: 'New project',     description: 'Create a new project',              Icon: FolderOpen, shortcut: ['P'],         action: () => { closeModal(); openModal('project'); } },
    { label: 'Import .env',     description: 'Import from a .env file',           Icon: Download,                            action: () => { closeModal(); openModal('import'); } },
    { label: 'Export .env',     description: 'Export to a .env file',             Icon: Upload,                              action: () => { closeModal(); openModal('export'); } },
    { label: 'Settings',        description: 'Open app settings',                 Icon: Settings,   shortcut: [','],         action: () => { closeModal(); openModal('settings'); } },
    { label: 'Lock vault',      description: 'Lock immediately',                  Icon: Lock,       shortcut: ['L'],         action: () => { closeModal(); setLocked(true); } },
  ];

  const filteredActions = allActions.filter((a) =>
    !query || a.label.toLowerCase().includes(query.toLowerCase()) || (a.description?.toLowerCase().includes(query.toLowerCase()))
  );

  function navigateToResult(r: SearchResult) {
    setActiveProject(r.project_id);
    setActiveTier(r.tier_id);
    closeModal();
  }

  const totalItems = filteredActions.length + results.length;

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, totalItems - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        if (selectedIdx < filteredActions.length) {
          filteredActions[selectedIdx]?.action();
        } else {
          const r = results[selectedIdx - filteredActions.length];
          if (r) navigateToResult(r);
        }
      }
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filteredActions, results, selectedIdx, closeModal]);

  if (!isOpen) return null;

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
        width: 540, maxHeight: 440, background: 'var(--surface-up)',
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
            placeholder="Search variables or actions…"
            style={{ flex: 1, fontSize: '14px', color: 'var(--text)', background: 'none' }}
          />
          <kbd style={{ fontSize: '10px', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 5px' }}>ESC</kbd>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filteredActions.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '4px 14px 4px' }}>
                {query ? 'Actions' : 'Quick actions'}
              </p>
              {filteredActions.map((a, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <div
                    key={a.label}
                    onClick={a.action}
                    onMouseEnter={() => setSelectedIdx(i)}
                    style={{
                      padding: '7px 14px', fontSize: '13px', cursor: 'pointer',
                      background: isSelected ? 'var(--surface-hover)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background 60ms',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 'var(--r-sm)',
                      background: isSelected ? 'var(--surface)' : 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 60ms',
                    }}>
                      <a.Icon size={13} strokeWidth={1.8} style={{ color: 'var(--text-dim)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: isSelected ? 'var(--text)' : 'var(--text-dim)', fontWeight: 500 }}>{a.label}</div>
                      {a.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 1 }}>{a.description}</div>
                      )}
                    </div>
                    {a.shortcut && (
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {a.shortcut.map((k) => (
                          <kbd key={k} style={{
                            fontSize: '10px', color: 'var(--text-muted)',
                            border: '1px solid var(--border)', borderRadius: 3,
                            padding: '1px 5px', background: 'var(--surface)',
                            fontFamily: 'var(--font-mono)',
                          }}>{k}</kbd>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {results.length > 0 && (
            <div style={{ padding: '8px 0', borderTop: filteredActions.length > 0 ? '1px solid var(--border)' : undefined }}>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '4px 14px 4px' }}>Variables</p>
              {results.map((r, i) => {
                const idx = filteredActions.length + i;
                const isSelected = selectedIdx === idx;
                return (
                  <div
                    key={r.variable_id}
                    onClick={() => navigateToResult(r)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    style={{
                      padding: '8px 14px', cursor: 'pointer',
                      background: isSelected ? 'var(--surface-hover)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background 60ms',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 'var(--r-sm)',
                      background: isSelected ? 'var(--surface)' : 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 60ms',
                    }}>
                      <Key size={12} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, color: isSelected ? 'var(--mono-text)' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.key}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.project_name} › {r.tier_name}
                        {r.description && <span style={{ marginLeft: 6 }}>· {r.description}</span>}
                      </div>
                    </div>
                    <kbd style={{
                      fontSize: '10px', color: 'var(--text-muted)',
                      border: '1px solid var(--border)', borderRadius: 3,
                      padding: '1px 5px', background: 'var(--surface)', flexShrink: 0,
                    }}>↵</kbd>
                  </div>
                );
              })}
            </div>
          )}

          {query && results.length === 0 && filteredActions.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No results for "<span style={{ color: 'var(--text-dim)' }}>{query}</span>"
            </div>
          )}

          {!query && (
            <div style={{ padding: '8px 14px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                <kbd style={{ fontSize: '10px', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>↑↓</kbd>navigate
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                <kbd style={{ fontSize: '10px', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>↵</kbd>select
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                <kbd style={{ fontSize: '10px', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>ESC</kbd>close
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
