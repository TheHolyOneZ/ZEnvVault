import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { Eye, EyeOff } from 'lucide-react';
import { getTierDiff } from '@/lib/tauri';
import type { DiffRow } from '@/types';
import { useToast } from '@/components/ui/Toast';

export function TierDiffView() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const tiers = useProjectStore((s) => s.tiers);
  const { toast } = useToast();

  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [rows, setRows] = useState<DiffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const isOpen = modal === 'diff';
  const projectTiers = activeProjectId ? (tiers[activeProjectId] ?? []) : [];

  async function handleCompare() {
    if (!leftId || !rightId || leftId === rightId) {
      toast('Select two different environments', 'warning');
      return;
    }
    setLoading(true);
    setRevealed(new Set());
    setShowAll(false);
    try {
      const result = await getTierDiff(leftId, rightId);
      setRows(result);
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleReveal(key: string, side: 'left' | 'right') {
    const id = `${key}:${side}`;
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function isRevealed(key: string, side: 'left' | 'right') {
    return showAll || revealed.has(`${key}:${side}`);
  }

  const leftName = projectTiers.find((t) => t.id === leftId)?.name ?? 'Left';
  const rightName = projectTiers.find((t) => t.id === rightId)?.name ?? 'Right';

  const statusColor = (status: DiffRow['status']) => {
    switch (status) {
      case 'left-only': return 'var(--red)';
      case 'right-only': return 'var(--green)';
      case 'different': return 'var(--amber)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <Modal open={isOpen} onClose={closeModal} title="Environment Diff" width={740}>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Left environment</p>
            <select value={leftId} onChange={(e) => setLeftId(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text-dim)' }}>
              <option value="">Select…</option>
              {projectTiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <span style={{ color: 'var(--text-muted)', paddingBottom: '8px' }}>vs</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Right environment</p>
            <select value={rightId} onChange={(e) => setRightId(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text-dim)' }}>
              <option value="">Select…</option>
              {projectTiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Button variant="primary" onClick={handleCompare} loading={loading}>Compare</Button>
        </div>

        {rows.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
              background: 'var(--surface-hover)', padding: '6px 10px',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{leftName}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{rightName}</span>
              <button
                onClick={() => { setShowAll((v) => !v); setRevealed(new Set()); }}
                style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--r-sm)',
                  background: showAll ? 'var(--accent-sub)' : 'var(--surface-input)',
                  color: showAll ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${showAll ? 'var(--accent-border)' : 'var(--border)'}`,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {showAll ? <><EyeOff size={11} strokeWidth={2}/> Hide all</> : <><Eye size={11} strokeWidth={2}/> Reveal all</>}
                </span>
              </button>
            </div>

            
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {rows.map((row, i) => (
                <div key={row.key} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px',
                  padding: '6px 10px', alignItems: 'center',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, color: 'var(--mono-text)' }}>
                    {row.key}
                  </span>

                  
                  <DiffCell
                    value={row.left_value}
                    status={row.status}
                    side="left"
                    revealed={isRevealed(row.key, 'left')}
                    onToggle={() => toggleReveal(row.key, 'left')}
                    statusColor={statusColor(row.status)}
                  />

                  
                  <DiffCell
                    value={row.right_value}
                    status={row.status}
                    side="right"
                    revealed={isRevealed(row.key, 'right')}
                    onToggle={() => toggleReveal(row.key, 'right')}
                    statusColor={statusColor(row.status)}
                  />

                  
                  <button
                    onClick={() => {
                      const bothRevealed = isRevealed(row.key, 'left') && isRevealed(row.key, 'right');
                      if (bothRevealed) {
                        setRevealed((prev) => {
                          const next = new Set(prev);
                          next.delete(`${row.key}:left`);
                          next.delete(`${row.key}:right`);
                          return next;
                        });
                      } else {
                        setRevealed((prev) => {
                          const next = new Set(prev);
                          next.add(`${row.key}:left`);
                          next.add(`${row.key}:right`);
                          return next;
                        });
                      }
                    }}
                    style={{
                      fontSize: '11px', color: 'var(--text-muted)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '2px 4px',
                      opacity: 0.6,
                    }}
                    title={isRevealed(row.key, 'left') ? 'Hide' : 'Reveal this row'}
                  >
                    {isRevealed(row.key, 'left') ? <EyeOff size={11} strokeWidth={2}/> : <Eye size={11} strokeWidth={2}/>}
                  </button>
                </div>
              ))}
            </div>

            
            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span><span style={{ color: 'var(--red)' }}>●</span> Left only</span>
              <span><span style={{ color: 'var(--green)' }}>●</span> Right only</span>
              <span><span style={{ color: 'var(--amber)' }}>●</span> Different</span>
              <span><span style={{ color: 'var(--text-muted)' }}>●</span> Same</span>
              <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Click a value to reveal it</span>
            </div>
          </div>
        )}

        {rows.length === 0 && !loading && leftId && rightId && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>
            Click Compare to see differences
          </p>
        )}
      </div>
    </Modal>
  );
}

function DiffCell({
  value, status, side, revealed, onToggle, statusColor,
}: {
  value?: string; status: DiffRow['status']; side: 'left' | 'right';
  revealed: boolean; onToggle: () => void; statusColor: string;
}) {
  if (!value) {
    return (
      <span style={{ fontSize: '12px', fontStyle: 'italic', color: statusColor, fontFamily: 'var(--font-mono)' }}>
        missing
      </span>
    );
  }

  return (
    <button
      onClick={onToggle}
      title={revealed ? 'Click to hide' : 'Click to reveal'}
      style={{
        fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'left',
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
        borderRadius: 'var(--r-sm)', width: '100%', overflow: 'hidden',
        color: 'var(--text-dim)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
    >
      {revealed ? (
        <span style={{ color: status === 'different' ? statusColor : 'var(--text-dim)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </span>
      ) : (
        <span style={{ filter: 'blur(4px)', userSelect: 'none', color: 'var(--text-muted)' }}>
          {value.replace(/./g, '•')}
        </span>
      )}
    </button>
  );
}
