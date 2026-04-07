import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { exportEnvFile } from '@/lib/tauri';
import { save } from '@tauri-apps/plugin-dialog';
import { useToast } from '@/components/ui/Toast';
import { TriangleAlert } from 'lucide-react';

export function ExportDialog() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const tiers = useProjectStore((s) => s.tiers);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isOpen = modal === 'export';
  const tier = activeProjectId
    ? (tiers[activeProjectId] ?? []).find((t) => t.id === activeTierId)
    : undefined;

  async function handleExport() {
    if (!activeTierId) return;
    const path = await save({
      defaultPath: `.env.${tier?.name ?? 'export'}`,
      filters: [{ name: 'env files', extensions: ['env', 'txt'] }],
    });
    if (!path) return;
    setLoading(true);
    try {
      await exportEnvFile(activeTierId, path);
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
    <Modal open={isOpen} onClose={() => { closeModal(); setConfirmed(false); }} title="Export .env File" width={440}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ padding: '12px', background: 'var(--amber-sub)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 'var(--r-md)' }}>
          <p style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 6 }}><TriangleAlert size={13} strokeWidth={2}/> Security warning</p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            This will write all decrypted variable values to disk. Do not commit this file to version control.
          </p>
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
          Export
        </Button>
      </div>
    </Modal>
  );
}
