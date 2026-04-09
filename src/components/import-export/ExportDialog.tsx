import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { exportEnvFile, exportAsFormat } from '@/lib/tauri';
import { save } from '@tauri-apps/plugin-dialog';
import { useToast } from '@/components/ui/Toast';
import { TriangleAlert } from 'lucide-react';

const FORMATS = [
  { id: 'env',    label: '.env',      ext: 'env',  desc: 'KEY=VALUE pairs' },
  { id: 'json',   label: 'JSON',      ext: 'json', desc: '{ "KEY": "VALUE" }' },
  { id: 'yaml',   label: 'YAML',      ext: 'yaml', desc: 'KEY: VALUE' },
  { id: 'docker', label: 'Docker',    ext: 'env',  desc: '--env-file format' },
] as const;

type FormatId = typeof FORMATS[number]['id'];

export function ExportDialog() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const tiers = useProjectStore((s) => s.tiers);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [format, setFormat] = useState<FormatId>('env');

  const isOpen = modal === 'export';
  const tier = activeProjectId
    ? (tiers[activeProjectId] ?? []).find((t) => t.id === activeTierId)
    : undefined;

  const selectedFormat = FORMATS.find((f) => f.id === format)!;

  async function handleExport() {
    if (!activeTierId) return;
    const defaultName = format === 'env'
      ? `.env.${tier?.name ?? 'export'}`
      : `${tier?.name ?? 'export'}-vars.${selectedFormat.ext}`;
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: selectedFormat.label, extensions: [selectedFormat.ext] }],
    });
    if (!path) return;
    setLoading(true);
    try {
      if (format === 'env') {
        await exportEnvFile(activeTierId, path);
      } else {
        await exportAsFormat(activeTierId, path, format);
      }
      toast('Exported successfully', 'success');
      closeModal();
      setConfirmed(false);
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={() => { closeModal(); setConfirmed(false); }} title="Export Variables" width={460}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ padding: '12px', background: 'var(--amber-sub)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 'var(--r-md)' }}>
          <p style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 6 }}><TriangleAlert size={13} strokeWidth={2}/> Security warning</p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            This will write all decrypted variable values to disk. Do not commit this file to version control.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>Format</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--r-md)', fontSize: '12px', fontWeight: 500,
                  background: format === f.id ? 'var(--accent-sub)' : 'var(--surface-hover)',
                  border: `1px solid ${format === f.id ? 'var(--accent-border)' : 'var(--border)'}`,
                  color: format === f.id ? 'var(--accent)' : 'var(--text-dim)',
                  cursor: 'pointer', transition: 'all 100ms',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span>{f.label}</span>
                <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 400 }}>{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
          Exporting <strong style={{ color: 'var(--text)' }}>{tier?.name ?? activeTierId}</strong> tier with{' '}
          <strong style={{ color: 'var(--text)' }}>{tier?.variable_count ?? 0}</strong> variables.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>I understand this writes decrypted values to disk</span>
        </label>
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => { closeModal(); setConfirmed(false); }}>Cancel</Button>
        <Button variant="primary" onClick={handleExport} loading={loading} disabled={!confirmed}>
          Export as {selectedFormat.label}
        </Button>
      </div>
    </Modal>
  );
}
