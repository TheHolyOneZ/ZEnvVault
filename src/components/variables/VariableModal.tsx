import React, { useEffect, useRef, useState } from 'react';
import { Dices, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import {
  createVariable, updateVariable, checkAutoSecret,
  generateRandomValue, revealVariable, revealSensitiveVariable,
} from '@/lib/tauri';
import { useToast } from '@/components/ui/Toast';
import { VALUE_TYPES } from '@/lib/typeValidators';
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
  const [sensitive, setSensitive] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [valueType, setValueType] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [valueEdited, setValueEdited] = useState(false);

  // Sensitive unlock state
  const [valueUnlocked, setValueUnlocked] = useState(false);
  const [unlockPrompting, setUnlockPrompting] = useState(false);
  // 'value' = unlock to view/edit, 'disable' = turn off sensitive toggle
  const [unlockPurpose, setUnlockPurpose] = useState<'value' | 'disable'>('value');
  const [unlockPw, setUnlockPw] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const unlockPwRef = useRef<HTMLInputElement>(null);

  const existingGroups = [...new Set(variables.map((v) => v.group_name).filter(Boolean))] as string[];

  const isOpen = modal === 'variable';
  const isEditing = !!editId;
  const isValueLocked = isEditing && sensitive && !valueUnlocked;

  useEffect(() => {
    if (!isOpen) return;
    if (editId) {
      const v = variables.find((x) => x.id === editId);
      if (v) {
        setKey(v.key);
        setDescription(v.description ?? '');
        setIsSecret(v.is_secret);
        setSensitive(v.sensitive ?? false);
        setGroupName(v.group_name ?? '');
        setValueType(v.value_type ?? '');
        setValueEdited(false);
        setValueUnlocked(false);
        setUnlockPrompting(false);
        setUnlockPw('');
        // Never call revealVariable for sensitive variables
        if (v.sensitive) {
          setValue('');
        } else {
          revealVariable(editId).then(setValue).catch(() => setValue(''));
        }
      }
    } else {
      setKey(''); setValue(''); setDescription(''); setIsSecret(true);
      setSensitive(false); setGroupName(''); setValueType('');
      setValueEdited(false); setValueUnlocked(false); setUnlockPrompting(false); setUnlockPw('');
    }
    setShowGenerator(false);
  }, [isOpen, editId]);

  useEffect(() => {
    if (unlockPrompting) setTimeout(() => unlockPwRef.current?.focus(), 50);
  }, [unlockPrompting]);

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
      setValueEdited(true);
    } catch {
      toast('Failed to generate value', 'error');
    } finally {
      setLoadingRandom(false);
      setShowGenerator(false);
    }
  }

  async function handleUnlockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unlockPw.trim() || !editId) return;
    setUnlockLoading(true);
    try {
      const revealed = await revealSensitiveVariable(editId, unlockPw);
      setValue(revealed);
      setValueUnlocked(true);
      setValueEdited(false);
      setUnlockPrompting(false);
      setUnlockPw('');
      if (unlockPurpose === 'disable') {
        setSensitive(false);
      }
    } catch (err) {
      const msg = String(err);
      toast(msg.includes('InvalidPassword') || msg.includes('invalid password') ? 'Wrong password' : 'Failed to unlock', 'error');
    } finally {
      setUnlockLoading(false);
    }
  }

  function handleSensitiveToggle(next: boolean) {
    if (!next && isEditing && sensitive) {
      // Turning OFF on existing sensitive variable — require master password
      // If already unlocked, user already proved they know the password
      if (valueUnlocked) {
        setSensitive(false);
      } else {
        setUnlockPurpose('disable');
        setUnlockPrompting(true);
      }
      return;
    }
    setSensitive(next);
  }

  async function handleSave() {
    if (!key.trim()) { toast('Key is required', 'warning'); return; }
    if (!activeTierId) { toast('No tier selected', 'warning'); return; }

    if (valueType && value) {
      const { VALUE_TYPES: vt } = await import('@/lib/typeValidators');
      const meta = vt[valueType];
      if (meta && !meta.validate(value)) {
        toast(`Value doesn't look like a ${meta.label} — saved anyway`, 'warning');
      }
    }

    setLoading(true);
    try {
      if (isEditing && editId) {
        // Pass null if sensitive variable wasn't changed (backend keeps existing enc)
        const saveValue = (sensitive && !valueEdited) ? null : value;
        const updated = await updateVariable(editId, key.trim(), saveValue, description || undefined, isSecret, sensitive, groupName || undefined, valueType || undefined);
        upsertVariable(updated);
        toast('Variable updated', 'success');
      } else {
        const created = await createVariable(activeTierId, key.trim(), value, description || undefined, isSecret, sensitive, groupName || undefined, valueType || undefined);
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
            {!isValueLocked && (
              <button
                onClick={() => setShowGenerator(!showGenerator)}
                style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Dices size={11} strokeWidth={1.8}/> Generate</span>
              </button>
            )}
          </div>

          {isValueLocked ? (
            // Sensitive variable — value is locked, require master password to unlock
            unlockPrompting ? (
              <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={13} strokeWidth={2} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <input
                  ref={unlockPwRef}
                  type="password"
                  value={unlockPw}
                  onChange={(e) => setUnlockPw(e.target.value)}
                  placeholder="Master password…"
                  onKeyDown={(e) => { if (e.key === 'Escape') { setUnlockPrompting(false); setUnlockPw(''); } }}
                  style={{
                    flex: 1, padding: '7px 10px',
                    background: 'var(--surface-input)', border: '1px solid var(--amber)',
                    borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: '13px', outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={unlockLoading || !unlockPw.trim()}
                  style={{
                    padding: '7px 14px', background: 'var(--amber)', color: '#000',
                    borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: '12px',
                    cursor: 'pointer', opacity: unlockLoading ? 0.5 : 1, flexShrink: 0,
                  }}
                >{unlockLoading ? '…' : 'Unlock'}</button>
                <button
                  type="button"
                  onClick={() => { setUnlockPrompting(false); setUnlockPw(''); }}
                  style={{ padding: '4px 6px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}
                >✕</button>
              </form>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                background: 'var(--surface-hover)', border: '1px solid rgba(245,166,35,0.25)',
                borderRadius: 'var(--r-md)',
              }}>
                <ShieldAlert size={15} strokeWidth={2} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Value is protected — enter master password to view or change
                </span>
                <button
                  onClick={() => { setUnlockPurpose('value'); setUnlockPrompting(true); }}
                  style={{
                    padding: '5px 12px', background: 'rgba(245,166,35,0.12)', color: 'var(--amber)',
                    border: '1px solid rgba(245,166,35,0.3)', borderRadius: 'var(--r-sm)',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  }}
                >Reveal</button>
              </div>
            )
          ) : (
            <>
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
                onChange={(e) => { setValue(e.target.value); setValueEdited(true); }}
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
            </>
          )}
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

        <Toggle
          checked={sensitive}
          onChange={handleSensitiveToggle}
          label="Require re-auth to reveal"
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>Group</label>
            <input
              list="group-suggestions"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Database"
              style={{ padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: '13px' }}
            />
            <datalist id="group-suggestions">
              {existingGroups.map((g) => <option key={g} value={g} />)}
            </datalist>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>Type hint</label>
            <select
              value={valueType}
              onChange={(e) => setValueType(e.target.value)}
              style={{ padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text)', fontSize: '13px' }}
            >
              <option value="">None</option>
              {Object.entries(VALUE_TYPES).map(([k, meta]) => (
                <option key={k} value={k}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
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
