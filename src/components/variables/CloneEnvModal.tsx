import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { cloneTier } from '@/lib/tauri';
import { useToast } from '@/components/ui/Toast';

export function CloneEnvModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);
  const projects = useProjectStore((s) => s.projects);
  const tiers = useProjectStore((s) => s.tiers);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const upsertTier = useProjectStore((s) => s.upsertTier);
  const { toast } = useToast();

  const [sourceProjectId, setSourceProjectId] = useState(activeProjectId ?? '');
  const [sourceTierId, setSourceTierId] = useState(activeTierId ?? '');
  const [targetProjectId, setTargetProjectId] = useState(activeProjectId ?? '');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const isOpen = modal === 'clone-env';

  const sourceTiers = tiers[sourceProjectId] ?? [];

  async function handleClone() {
    if (!sourceTierId) { toast('Select a source environment', 'warning'); return; }
    if (!newName.trim()) { toast('Enter a name for the new environment', 'warning'); return; }
    setLoading(true);
    try {
      const newTier = await cloneTier(sourceTierId, targetProjectId, newName.trim());
      upsertTier(targetProjectId, newTier);
      toast(`Cloned to "${newName.trim()}"`, 'success');
      closeModal();
    } catch (err) {
      toast(String(err).includes('UNIQUE') ? 'Environment name already exists' : 'Clone failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={closeModal} title="Clone environment" width={460}>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>Source project</label>
          <select
            value={sourceProjectId}
            onChange={(e) => { setSourceProjectId(e.target.value); setSourceTierId(''); }}
            style={{ padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: '13px' }}
          >
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>Source environment</label>
          <select
            value={sourceTierId}
            onChange={(e) => setSourceTierId(e.target.value)}
            style={{ padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: '13px' }}
          >
            <option value="">— select —</option>
            {sourceTiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>Clone into project</label>
          <select
            value={targetProjectId}
            onChange={(e) => setTargetProjectId(e.target.value)}
            style={{ padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: '13px' }}
          >
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <Input
          label="New environment name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. staging-clone"
          autoFocus
        />
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button variant="primary" onClick={handleClone} loading={loading}>Clone</Button>
      </div>
    </Modal>
  );
}
