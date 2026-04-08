import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { createProject, updateProject, deleteProject, listTiers } from '@/lib/tauri';
import { useToast } from '@/components/ui/Toast';
import { PRESET_COLORS } from '@/lib/constants';
import { PROJECT_ICONS, ProjectIcon } from '@/components/ui/ProjectIcon';

export function ProjectModal() {
  const modal = useUiStore((s) => s.modal);
  const editId = useUiStore((s) => s.editingProjectId);
  const closeModal = useUiStore((s) => s.closeModal);
  const projects = useProjectStore((s) => s.projects);
  const upsertProject = useProjectStore((s) => s.upsertProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const setTiers = useProjectStore((s) => s.setTiers);
  const setActiveTier = useProjectStore((s) => s.setActiveTier);
  const setVariables = useProjectStore((s) => s.setVariables);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('');
  const [loading, setLoading] = useState(false);

  const isOpen = modal === 'project';
  const isEditing = !!editId;
  const existing = editId ? projects.find((p) => p.id === editId) : null;

  useEffect(() => {
    if (!isOpen) return;
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setColor(existing.color);
      setIcon(existing.icon ?? '');
    } else {
      setName(''); setDescription(''); setColor(PRESET_COLORS[0]); setIcon('');
    }
  }, [isOpen, editId]);

  async function handleSave() {
    if (!name.trim()) { toast('Name is required', 'warning'); return; }
    setLoading(true);
    try {
      if (isEditing && editId) {
        const updated = await updateProject(editId, name.trim(), description || undefined, color, icon || undefined);
        upsertProject(updated);
        toast('Project updated', 'success');
      } else {
        const created = await createProject(name.trim(), description || undefined, color, icon || undefined);
        upsertProject(created);

        setActiveProject(created.id);
        const tiers = await listTiers(created.id);
        setTiers(created.id, tiers);
        if (tiers.length > 0) { setActiveTier(tiers[0].id); } else { setActiveTier(null); setVariables([]); }
        toast('Project created', 'success');
      }
      closeModal();
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editId || !existing) return;
    if (!confirm(`Delete project "${existing.name}" and ALL its data?`)) return;
    setLoading(true);
    try {
      await deleteProject(editId);
      removeProject(editId);
      setActiveProject(null);
      setActiveTier(null);
      setVariables([]);
      toast('Project deleted', 'info');
      closeModal();
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={closeModal} title={isEditing ? 'Edit Project' : 'New Project'} width={460} dataTour="project-modal">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Project"
          autoFocus
        />

        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project?"
        />

        <div>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', marginBottom: '8px' }}>Accent color</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: '50%', background: c,
                  border: `2px solid ${color === c ? '#fff' : 'transparent'}`,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '1px', cursor: 'pointer', transition: 'all 100ms',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', marginBottom: '8px' }}>Icon <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>

            <button
              onClick={() => setIcon('')}
              title="No icon"
              style={{
                width: 32, height: 32, borderRadius: 'var(--r-md)',
                background: icon === '' ? 'var(--accent-sub)' : 'var(--surface-hover)',
                border: `1px solid ${icon === '' ? 'var(--accent-border)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 80ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-mono)',
              }}
            >—</button>
            {PROJECT_ICONS.map(({ name: iconName, label, Icon }) => (
              <button
                key={iconName}
                onClick={() => setIcon(icon === iconName ? '' : iconName)}
                title={label}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--r-md)',
                  background: icon === iconName ? 'var(--accent-sub)' : 'var(--surface-hover)',
                  border: `1px solid ${icon === iconName ? 'var(--accent-border)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 80ms',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: icon === iconName ? 'var(--accent)' : 'var(--text-dim)',
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: '8px', justifyContent: 'space-between',
      }}>
        <div>
          {isEditing && (
            <Button variant="danger" onClick={handleDelete} loading={loading}>Delete project</Button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={loading}>
            {isEditing ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
