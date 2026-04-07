import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ZLogo } from '@/components/ui/ZLogo';
import { useUiStore } from '@/store/uiStore';
import { useConfigStore } from '@/store/configStore';
import { getConfig, updateConfig, changeMasterPassword, getDbPath, getAuditLog } from '@/lib/tauri';
import { useToast } from '@/components/ui/Toast';
import type { AuditEntry } from '@/types';
import {
  ShieldCheck, Database, ClipboardList, Info, Keyboard,
  Lock, KeyRound, Folder, RefreshCw, ScrollText, Key,
  AlertTriangle,
} from 'lucide-react';

type Section = 'security' | 'data' | 'audit' | 'shortcuts' | 'about';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_variable:    { label: 'Variable created',   color: 'var(--green)' },
  update_variable:    { label: 'Variable updated',   color: 'var(--accent)' },
  delete_variable:    { label: 'Variable deleted',   color: 'var(--red)' },
  reveal_variable:    { label: 'Value revealed',     color: 'var(--amber)' },
  copy_variable:      { label: 'Value copied',       color: 'var(--amber)' },
  create_project:     { label: 'Project created',    color: 'var(--green)' },
  delete_project:     { label: 'Project deleted',    color: 'var(--red)' },
  create_tier:        { label: 'Env created',        color: 'var(--green)' },
  delete_tier:        { label: 'Env deleted',        color: 'var(--red)' },
  import_env:         { label: 'Imported .env',      color: 'var(--accent)' },
  export_env:         { label: 'Exported .env',      color: 'var(--accent)' },
  unlock:             { label: 'Vault unlocked',     color: 'var(--text-muted)' },
  lock:               { label: 'Vault locked',       color: 'var(--text-muted)' },
  change_password:    { label: 'Password changed',   color: 'var(--amber)' },
  reset_password:     { label: 'Password reset',     color: 'var(--amber)' },
  wipe_vault:         { label: 'Vault wiped',        color: 'var(--red)' },
};

function fmtAction(action: string) {
  return ACTION_LABELS[action] ?? { label: action.replace(/_/g, ' '), color: 'var(--text-muted)' };
}

function fmtTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60)    return 'just now';
    if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

export function SettingsModal() {
  const modal       = useUiStore((s) => s.modal);
  const closeModal  = useUiStore((s) => s.closeModal);
  const config      = useConfigStore((s) => s.config);
  const setConfig   = useConfigStore((s) => s.setConfig);
  const { toast }   = useToast();

  const [localConfig, setLocalConfig] = useState(config);
  const [section, setSection]         = useState<Section>('security');
  const [oldPw, setOldPw]             = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [changingPw, setChangingPw]   = useState(false);
  const [dbPath, setDbPath]           = useState('');

  
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOffset, setAuditOffset]   = useState(0);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const AUDIT_PAGE = 50;

  const isOpen = modal === 'settings';

  useEffect(() => {
    if (!isOpen) return;
    setLocalConfig(config);
    getDbPath().then(setDbPath).catch(() => {});
    setAuditEntries([]);
    setAuditOffset(0);
  }, [isOpen]);

  const loadAudit = useCallback(async (offset: number, append: boolean) => {
    setAuditLoading(true);
    try {
      const entries = await getAuditLog(AUDIT_PAGE + 1, offset);
      const page = entries.slice(0, AUDIT_PAGE);
      setAuditEntries((prev) => append ? [...prev, ...page] : page);
      setAuditHasMore(entries.length > AUDIT_PAGE);
      setAuditOffset(offset + page.length);
    } catch {
      toast('Could not load audit log', 'error');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && section === 'audit') {
      setAuditEntries([]);
      setAuditOffset(0);
      loadAudit(0, false);
    }
  }, [isOpen, section]);

  async function handleSave() {
    try {
      await updateConfig(localConfig);
      setConfig(localConfig);
      toast('Settings saved', 'success');
      closeModal();
    } catch (err) {
      toast(String(err), 'error');
    }
  }

  async function handleChangePassword() {
    if (newPw.length < 12) { toast('New password must be at least 12 characters', 'warning'); return; }
    if (newPw !== confirmPw) { toast('Passwords do not match', 'warning'); return; }
    setChangingPw(true);
    try {
      await changeMasterPassword(oldPw, newPw);
      toast('Password changed. Regenerate your recovery code in the next session.', 'success');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      toast('Incorrect current password', 'error');
    } finally {
      setChangingPw(false);
    }
  }

  const sections: { id: Section; label: string; Icon: React.ElementType }[] = [
    { id: 'security',  label: 'Security',   Icon: ShieldCheck  },
    { id: 'data',      label: 'Data',       Icon: Database     },
    { id: 'audit',     label: 'Audit log',  Icon: ClipboardList },
    { id: 'shortcuts', label: 'Shortcuts',  Icon: Keyboard     },
    { id: 'about',     label: 'About',      Icon: Info         },
  ];

  return (
    <Modal open={isOpen} onClose={closeModal} title="Settings" width={600}>
      <div style={{ display: 'flex', height: 440 }}>

        
        <div style={{ width: 148, borderRight: '1px solid var(--border)', padding: '8px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '7px 10px',
                borderRadius: 'var(--r-md)', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: 8,
                color: section === s.id ? 'var(--text)' : 'var(--text-dim)',
                background: section === s.id ? 'var(--surface-hover)' : 'transparent',
                transition: 'all 80ms',
              }}
            >
              <s.Icon size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {s.label}
            </button>
          ))}
        </div>

        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          
          {section === 'security' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p className="label-section">Auto-lock</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', flex: 1 }}>Lock after inactivity</span>
                  <select
                    value={localConfig.auto_lock_minutes}
                    onChange={(e) => setLocalConfig({ ...localConfig, auto_lock_minutes: Number(e.target.value) })}
                    style={{ padding: '5px 8px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '12px', color: 'var(--text-dim)' }}
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={0}>Never</option>
                  </select>
                </div>
                <Toggle
                  checked={localConfig.lock_on_focus_loss}
                  onChange={(v) => setLocalConfig({ ...localConfig, lock_on_focus_loss: v })}
                  label="Lock when window loses focus"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', flex: 1 }}>Clipboard auto-clear</span>
                  <select
                    value={localConfig.clipboard_clear_seconds}
                    onChange={(e) => setLocalConfig({ ...localConfig, clipboard_clear_seconds: Number(e.target.value) })}
                    style={{ padding: '5px 8px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '12px', color: 'var(--text-dim)' }}
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={0}>Never</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p className="label-section">Change master password</p>
                <Input type="password" label="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
                <Input type="password" label="New password (min. 12 chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <Input type="password" label="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                <div style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={11} strokeWidth={2}/> Changing your password invalidates the current recovery code. Regenerate it afterwards in Settings → Security.</span>
                </div>
                <Button variant="ghost" onClick={handleChangePassword} loading={changingPw}>Change password</Button>
              </div>
            </div>
          )}

          
          {section === 'data' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p className="label-section">Database</p>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Database location</p>
                <code style={{
                  display: 'block', padding: '8px 10px', borderRadius: 'var(--r-md)',
                  background: 'var(--surface-hover)', fontSize: '11px', color: 'var(--text-dim)',
                  wordBreak: 'break-all', lineHeight: 1.5,
                }}>{dbPath || 'Loading…'}</code>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  SQLite database encrypted at the value level with AES-256-GCM. Keys and metadata are stored in plaintext; only variable values are encrypted.
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p className="label-section" style={{ marginBottom: 10 }}>Audit logging</p>
                <Toggle
                  checked={localConfig.audit_enabled}
                  onChange={(v) => setLocalConfig({ ...localConfig, audit_enabled: v })}
                  label="Enable audit log"
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                  When enabled, every create / update / delete / reveal / copy action is recorded with a timestamp. View the log in Settings → Audit log.
                </p>
              </div>
            </div>
          )}

          
          {section === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              
              <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>
                  {localConfig.audit_enabled
                    ? 'Showing the last 50 actions. Most recent first.'
                    : 'Audit logging is disabled — enable it in Settings → Data.'}
                </span>
                <button
                  onClick={() => { setAuditEntries([]); setAuditOffset(0); loadAudit(0, false); }}
                  style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', borderRadius: 4 }}
                >↺ Refresh</button>
              </div>

              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {auditLoading && auditEntries.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Loading…</div>
                ) : auditEntries.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {localConfig.audit_enabled ? 'No entries yet — actions will appear here as you use the vault.' : 'Enable audit logging to start recording activity.'}
                  </div>
                ) : (
                  <>
                    {auditEntries.map((entry) => {
                      const { label, color } = fmtAction(entry.action);
                      return (
                        <div
                          key={entry.id}
                          style={{
                            display: 'flex', alignItems: 'baseline', gap: 10,
                            padding: '8px 16px',
                            borderBottom: '1px solid var(--border)',
                            fontSize: '12px',
                          }}
                        >
                          
                          <span style={{
                            flexShrink: 0, fontSize: '11px', fontWeight: 600,
                            color, minWidth: 120,
                          }}>
                            {label}
                          </span>

                          
                          <span style={{ flex: 1, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.detail || entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ''}
                          </span>

                          
                          <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {fmtTimestamp(entry.timestamp)}
                          </span>
                        </div>
                      );
                    })}

                    
                    {auditHasMore && (
                      <button
                        onClick={() => loadAudit(auditOffset, true)}
                        disabled={auditLoading}
                        style={{
                          width: '100%', padding: '10px', fontSize: '12px',
                          color: 'var(--text-muted)', background: 'none',
                          border: 'none', borderTop: '1px solid var(--border)',
                          cursor: 'pointer', transition: 'color 100ms',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        {auditLoading ? 'Loading…' : 'Load more entries ↓'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          
          {section === 'about' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ZLogo size={48} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>ZVault</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>v0.1.0</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>by TheHolyOneZ</p>
                </div>
              </div>

              
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.7, borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
                A local-first, encrypted environment variable manager for developers who are tired of losing track of which secret goes where. ZVault stores every variable encrypted with AES-256-GCM — only you can read them, and only while the vault is unlocked.
              </p>

              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  [Lock,        'AES-256-GCM',          'Values encrypted at rest, DEK zeroed on lock'],
                  [KeyRound,    'Argon2id KDF',          'Memory-hard key derivation — brute force is expensive'],
                  [Folder,      'Project → Env → Var',  'Organize secrets across projects and stages'],
                  [RefreshCw,   'Live .env sync',        'Link environments to files on disk'],
                  [ScrollText,  'Audit log',             'Track every access and mutation'],
                  [Key,         'Recovery code',         'Reset password without losing any data'],
                ] as const).map(([Icon, title, sub]) => (
                  <div key={title} style={{
                    padding: '10px 12px', borderRadius: 'var(--r-md)',
                    background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                      <Icon size={13} strokeWidth={1.8} color="var(--accent)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{sub}</div>
                  </div>
                ))}
              </div>

              
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Tauri v2', 'Rust', 'React 18', 'SQLite', 'AES-256-GCM', 'Argon2id', 'Zustand'].map((tag) => (
                  <span key={tag} style={{
                    padding: '2px 8px', borderRadius: 99,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    fontSize: '11px', color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>{tag}</span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  ['Project', 'https://github.com/TheHolyOneZ/ZEnvVault'],
                  ['Author',  'https://github.com/TheHolyOneZ'],
                  ['More projects', 'https://zsync.eu'],
                ] as [string, string][]).map(([label, url]) => (
                  <div key={url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '12px', color: 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {url.replace('https://', '')}
                    </a>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                MIT License · All data is stored locally at the path shown in Settings → Data. No telemetry, no cloud, no accounts.
              </p>
            </div>
          )}

          {section === 'shortcuts' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {([
                {
                  group: 'Global',
                  rows: [
                    ['Ctrl+K', 'Open command palette'],
                    ['Ctrl+L', 'Lock vault immediately'],
                    ['Ctrl+,', 'Open settings'],
                    ['Escape', 'Close modal'],
                  ],
                },
                {
                  group: 'Variables',
                  rows: [
                    ['Ctrl+N', 'New variable'],
                    ['Ctrl+F', 'Focus variable search'],
                  ],
                },
                {
                  group: 'Projects & navigation',
                  rows: [
                    ['Ctrl+Shift+N', 'New project'],
                    ['Ctrl+1 – 9', 'Jump to project 1–9'],
                    ['Alt+← / →', 'Previous / next environment'],
                  ],
                },
                {
                  group: 'Import & Export',
                  rows: [
                    ['Ctrl+I', 'Import .env file'],
                    ['Ctrl+E', 'Export current environment'],
                  ],
                },
              ] as { group: string; rows: [string, string][] }[]).map(({ group, rows }) => (
                <div key={group}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{group}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {rows.map(([key, label]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{label}</span>
                        <kbd style={{
                          fontFamily: 'var(--font-mono)', fontSize: '11px',
                          padding: '2px 8px', borderRadius: 'var(--r-sm)',
                          background: 'var(--surface-hover)', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', whiteSpace: 'nowrap',
                        }}>{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {section !== 'about' && section !== 'audit' && section !== 'shortcuts' && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save settings</Button>
        </div>
      )}
    </Modal>
  );
}
