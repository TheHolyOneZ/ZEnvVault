import React, { useEffect, useState } from 'react';
import { Dices } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import {
  createVariable, updateVariable, checkAutoSecret,
  generateRandomValue, revealVariable,
} from '@/lib/tauri';
import { useToast } from '@/components/ui/Toast';
import type { RandomKind } from '@/types';

const RANDOM_OPTIONS: { label: string; kind: RandomKind }[] = [
  { label: 'Hex 32', kind: 'hex32' },
  { label: 'Hex 64', kind: 'hex64' },
  { label: 'Hex 128', kind: 'hex128' },
  { label: 'Base64 32', kind: 'base64_32' },
  { label: 'Base64 64', kind: 'base64_64' },
  { label: 'Alphanumeric', kind: 'alphanumeric' },
  { label: 'UUID v4', kind: 'uuid' },
];

export function VariableModal() {
  const modal = useUiStore((s) => s.modal);
  const editId = useUiStore((s) => s.editingVariableId);
  const closeModal = useUiStore((s) => s.closeModal);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const variables = useProjectStore((s) => s.variables);
  const upsertVariable = useProjectStore((s) => s.upsertVariable);
  const { toast } = useToast();

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isSecret, setIsSecret] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [loadingRandom, setLoadingRandom] = useState(false);

  const isOpen = modal === 'variable';
  const isEditing = !!editId;

  useEffect(() => {
    if (!isOpen) return;
    if (editId) {
      const v = variables.find((x) => x.id === editId);
      if (v) {
        setKey(v.key);
        setDescription(v.description ?? '');
        setIsSecret(v.is_secret);

        revealVariable(editId).then(setValue).catch(() => setValue(''));
      }
    } else {
      setKey(''); setValue(''); setDescription(''); setIsSecret(true);
    }
    setShowGenerator(false);
  }, [isOpen, editId]);

  async function handleKeyChange(k: string) {
    setKey(k);
    if (!isEditing) {
      const auto = await checkAutoSecret(k).catch(() => true);
      setIsSecret(auto);
    }
  }

  async function handleGenerate(kind: RandomKind) {
    setLoadingRandom(true);
    try {
      const v = await generateRandomValue(kind);
      setValue(v);
    } catch {
      toast('Failed to generate value', 'error');
    } finally {
      setLoadingRandom(false);
      setShowGenerator(false);
    }
  }

  async function handleSave() {
    if (!key.trim()) { toast('Key is required', 'warning'); return; }
    if (!activeTierId) { toast('No tier selected', 'warning'); return; }
    setLoading(true);
    try {
      if (isEditing && editId) {
        const updated = await updateVariable(editId, key.trim(), value, description || undefined, isSecret);
        upsertVariable(updated);
        toast('Variable updated', 'success');
      } else {
        const created = await createVariable(activeTierId, key.trim(), value, description || undefined, isSecret);
        upsertVariable(created);
        toast('Variable created', 'success');
      }
      closeModal();
    } catch (err: unknown) {
      const msg = String(err);
      toast(msg.includes('DuplicateKey') ? 'Key already exists in this tier' : 'Failed to save variable', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={closeModal} title={isEditing ? 'Edit Variable' : 'Add Variable'} width={520} dataTour="variable-modal">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Key — the variable name (e.g. DATABASE_URL, API_KEY)"
          value={key}
          onChange={(e) => handleKeyChange(e.target.value)}
          mono
          placeholder="MY_VARIABLE"
          autoFocus={!isEditing}
          style={{ textTransform: 'uppercase' } as React.CSSProperties}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>Value</label>
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Dices size={11} strokeWidth={1.8}/> Generate</span>
            </button>
          </div>

          {showGenerator && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px',
              background: 'var(--surface-hover)', borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
            }}>
              {RANDOM_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  onClick={() => handleGenerate(opt.kind)}
                  disabled={loadingRandom}
                  style={{
                    padding: '3px 8px', borderRadius: 'var(--r-sm)', fontSize: '11px',
                    background: 'var(--surface-up)', color: 'var(--text-dim)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          )}

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isSecret ? '••••••••' : 'Value'}
            rows={3}
            style={{
              width: '100%', padding: '7px 10px',
              background: 'var(--surface-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', color: 'var(--text)',
              fontFamily: 'var(--font-mono)', fontSize: '13px', resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
        </div>

        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this for?"
        />

        <Toggle
          checked={isSecret}
          onChange={setIsSecret}
          label="Mark as secret (blur value in UI)"
        />
      </div>

      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'flex-end', gap: '8px',
      }}>
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} loading={loading}>
          {isEditing ? 'Save changes' : 'Add variable'}
        </Button>
      </div>
    </Modal>
  );
}
