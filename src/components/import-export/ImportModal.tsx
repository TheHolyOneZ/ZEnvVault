import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { previewImport, importEnvFile, listVariables, linkTierFile } from '@/lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { ImportPreviewItem, MergeStrategy } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { FileText, Upload, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function ImportModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const tiers = useProjectStore((s) => s.tiers);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setVariables = useProjectStore((s) => s.setVariables);
  const upsertTier = useProjectStore((s) => s.upsertTier);
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [filePath, setFilePath] = useState('');
  const [preview, setPreview] = useState<ImportPreviewItem[]>([]);
  const [strategy, setStrategy] = useState<MergeStrategy>('skip');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [linkFile, setLinkFile] = useState(false);
  const [autoSync, setAutoSync] = useState(false);

  const isOpen = modal === 'import';

  const projectTiers = activeProjectId ? (tiers[activeProjectId] ?? []) : [];
  const activeTier = projectTiers.find((t) => t.id === activeTierId);


  useEffect(() => {
    if (!isOpen) return;
    let unlisten: (() => void) | undefined;

    getCurrentWindow().onDragDropEvent((event) => {
      const type = event.payload.type;
      if (type === 'enter' || type === 'over') {
        setDragging(true);
      } else if (type === 'leave') {
        setDragging(false);
      } else if (type === 'drop') {
        setDragging(false);
        const paths = (event.payload as { type: string; paths?: string[] }).paths;
        if (paths && paths.length > 0) {
          setFilePath(paths[0]);
        }
      }
    }).then((fn) => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, [isOpen]);

  function handleClose() {
    closeModal();
    setStep(1);
    setFilePath('');
    setPreview([]);
    setStrategy('skip');
    setLinkFile(false);
    setAutoSync(false);
  }

  async function handleBrowse() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Env files', extensions: ['env', 'txt'] }],
    });
    if (typeof selected === 'string') setFilePath(selected);
  }

  async function handlePreview() {
    if (!filePath) { toast('Select a file first', 'warning'); return; }
    if (!activeTierId) {
      toast('Select an environment first — use the tabs above the variable table', 'warning');
      return;
    }
    setLoading(true);
    try {
      const items = await previewImport(filePath, activeTierId);
      setPreview(items);
      setStep(2);
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!activeTierId || !activeProjectId) return;
    setLoading(true);
    try {
      const result = await importEnvFile(filePath, activeTierId, strategy);
      const vars = await listVariables(activeTierId);
      setVariables(vars);


      if (linkFile && filePath) {
        const updatedTier = await linkTierFile(activeTierId, filePath, autoSync);
        upsertTier(activeProjectId, updatedTier);
      }

      toast(
        `Imported: +${result.added} added, ${result.updated} updated, ${result.skipped} skipped${linkFile ? ' · file linked' : ''}`,
        'success'
      );
      handleClose();
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  const newCount = preview.filter((p) => p.status === 'new').length;
  const conflictCount = preview.filter((p) => p.status === 'conflict').length;

  return (
    <Modal open={isOpen} onClose={handleClose} title="Import .env File" width={560}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>


        <div style={{
          padding: '8px 12px', borderRadius: 'var(--r-md)',
          background: 'var(--surface-hover)', border: '1px solid var(--border)',
          fontSize: '12px', color: 'var(--text-dim)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Importing into:</span>
          {activeTier ? (
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{activeTier.name}</span>
          ) : (
            <span style={{ color: 'var(--amber)', fontWeight: 500 }}>
              No environment selected — click a tab above first
            </span>
          )}
        </div>

        {step === 1 && (
          <>

            <div
              onClick={handleBrowse}
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--r-lg)',
                padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'var(--accent-sub)' : 'transparent',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ marginBottom: '10px', color: dragging ? 'var(--accent)' : 'var(--text-muted)', opacity: dragging ? 1 : 0.5 }}>
                {dragging ? <Upload size={28} strokeWidth={1.5}/> : <FileText size={28} strokeWidth={1.5}/>}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dim)' }}>
                {dragging ? 'Drop to import' : 'Drop your .env file here'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>or click to browse</p>
            </div>

            {filePath && (
              <div style={{
                padding: '9px 12px', background: 'var(--surface-hover)',
                borderRadius: 'var(--r-md)', fontSize: '12px',
                fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Check size={12} strokeWidth={2.5} color="var(--green)" style={{ flexShrink: 0 }}/>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filePath}</span>
                <button onClick={(e) => { e.stopPropagation(); setFilePath(''); }}
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={12} strokeWidth={2}/></button>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="success">{newCount} new</Badge>
              <Badge variant="warning">{conflictCount} conflicts</Badge>
              <Badge variant="default">{preview.filter((p) => p.status === 'unchanged').length} unchanged</Badge>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', maxHeight: 180, overflowY: 'auto' }}>
              {preview.map((item, i) => {
                const color = item.status === 'new' ? 'var(--green)' : item.status === 'conflict' ? 'var(--amber)' : 'var(--text-muted)';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--mono-text)', flex: 1 }}>{item.key}</span>
                    <span style={{ fontSize: '10px', fontWeight: 500, color }}>{item.status}</span>
                  </div>
                );
              })}
            </div>


            <div>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', marginBottom: '8px' }}>How to handle existing keys?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {([
                  { value: 'skip', label: 'Skip existing', desc: 'Only add new keys, leave existing untouched' },
                  { value: 'overwrite', label: 'Overwrite existing', desc: 'Add new + update conflicting keys' },
                  { value: 'replace', label: 'Replace all', desc: 'Delete everything in this environment, then import' },
                ] as { value: MergeStrategy; label: string; desc: string }[]).map((opt) => (
                  <label key={opt.value} style={{
                    display: 'flex', gap: '8px', cursor: 'pointer', padding: '7px 10px',
                    borderRadius: 'var(--r-md)',
                    background: strategy === opt.value ? 'var(--accent-sub)' : 'transparent',
                    border: `1px solid ${strategy === opt.value ? 'var(--accent-border)' : 'transparent'}`,
                  }}>
                    <input type="radio" value={opt.value} checked={strategy === opt.value} onChange={() => setStrategy(opt.value)} style={{ accentColor: 'var(--accent)', marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: strategy === opt.value ? 'var(--accent)' : 'var(--text-dim)' }}>{opt.label}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>


            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={linkFile} onChange={(e) => setLinkFile(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-dim)' }}>
                    Link this file to the environment
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Remembers where this file lives so you can sync changes back to it later
                  </p>
                </div>
              </label>

              {linkFile && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', paddingLeft: '20px' }}>
                  <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)}
                    style={{ accentColor: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: autoSync ? 'var(--accent)' : 'var(--text-dim)' }}>
                      Auto-sync on every change
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Every time you add, edit, or delete a variable — the .env file on disk updates instantly
                    </p>
                  </div>
                </label>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
        {step === 1 && (
          <Button variant="primary" onClick={handlePreview} loading={loading} disabled={!filePath}>
            Preview →
          </Button>
        )}
        {step === 2 && (
          <>
            <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
            <Button variant="primary" onClick={handleImport} loading={loading}>
              Import {preview.length} variables
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
