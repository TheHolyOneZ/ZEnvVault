import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ZLogo } from '@/components/ui/ZLogo';
import { useUiStore } from '@/store/uiStore';
import { useConfigStore } from '@/store/configStore';
import { getConfig, updateConfig, changeMasterPassword, getDbPath, getAuditLog, backupVault } from '@/lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';
import { useToast } from '@/components/ui/Toast';
import type { AuditEntry } from '@/types';
import {
  ShieldCheck, Database, ClipboardList, Info, Keyboard,
  Lock, KeyRound, Folder, RefreshCw, ScrollText, Key,
  Copy, Check, Eye, Plus, Trash2, Download, Upload, Unlock, Pencil, Sun, Moon,
  HardDrive,
} from 'lucide-react';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';

type Section = 'security' | 'data' | 'backup' | 'audit' | 'shortcuts' | 'about';

const ACTION_META: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  create_variable:  { label: 'Created',          color: 'var(--green)',      bg: 'var(--green-sub)',    Icon: Plus      },
  update_variable:  { label: 'Updated',          color: 'var(--accent)',     bg: 'var(--accent-sub)',   Icon: Pencil    },
  delete_variable:  { label: 'Deleted',          color: 'var(--red)',        bg: 'var(--red-sub)',      Icon: Trash2    },
  reveal_variable:  { label: 'Revealed',         color: 'var(--amber)',      bg: 'var(--amber-sub)',    Icon: Eye       },
  copy_variable:    { label: 'Copied',           color: 'var(--amber)',      bg: 'var(--amber-sub)',    Icon: Copy      },
  create_project:   { label: 'New project',      color: 'var(--green)',      bg: 'var(--green-sub)',    Icon: Plus      },
  delete_project:   { label: 'Project deleted',  color: 'var(--red)',        bg: 'var(--red-sub)',      Icon: Trash2    },
  create_tier:      { label: 'New env',          color: 'var(--green)',      bg: 'var(--green-sub)',    Icon: Plus      },
  delete_tier:      { label: 'Env deleted',      color: 'var(--red)',        bg: 'var(--red-sub)',      Icon: Trash2    },
  import_env:       { label: 'Imported',         color: 'var(--accent)',     bg: 'var(--accent-sub)',   Icon: Download  },
  export_env:       { label: 'Exported',         color: 'var(--accent)',     bg: 'var(--accent-sub)',   Icon: Upload    },
  unlock:           { label: 'Unlocked',         color: 'var(--text-dim)',   bg: 'var(--surface-hover)',Icon: Unlock    },
  lock:             { label: 'Locked',           color: 'var(--text-dim)',   bg: 'var(--surface-hover)',Icon: Lock      },
  change_password:  { label: 'Password changed', color: 'var(--amber)',      bg: 'var(--amber-sub)',    Icon: KeyRound  },
  reset_password:   { label: 'Password reset',   color: 'var(--amber)',      bg: 'var(--amber-sub)',    Icon: KeyRound  },
  wipe_vault:       { label: 'Vault wiped',      color: 'var(--red)',        bg: 'var(--red-sub)',      Icon: Trash2    },
};

const FILTER_GROUPS: Record<string, string[] | null> = {
  all:    null,
  reads:  ['reveal_variable', 'copy_variable'],
  writes: ['create_variable', 'update_variable', 'delete_variable', 'create_project', 'delete_project', 'create_tier', 'delete_tier', 'import_env', 'export_env'],
  auth:   ['unlock', 'lock', 'change_password', 'reset_password', 'wipe_vault'],
};

function fmtAction(action: string) {
  const m = ACTION_META[action];
  return m ? { label: m.label, color: m.color } : { label: action.replace(/_/g, ' '), color: 'var(--text-muted)' };
}

function groupByDate(entries: AuditEntry[]) {
  const groups = new Map<string, AuditEntry[]>();
  const todayStr = new Date().toDateString();
  const yestStr  = new Date(Date.now() - 86400000).toDateString();
  for (const entry of entries) {
    const ds = new Date(entry.timestamp).toDateString();
    const label = ds === todayStr ? 'Today' : ds === yestStr ? 'Yesterday'
      : new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(entry);
  }
  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
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
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [copiedCode, setCopiedCode]   = useState(false);


  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOffset, setAuditOffset]   = useState(0);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditFilter, setAuditFilter]   = useState<'all' | 'reads' | 'writes' | 'auth'>('all');
  const AUDIT_PAGE = 50;

  const isOpen = modal === 'settings';

  useEffect(() => {
    if (!isOpen) return;
    setLocalConfig(config);
    getDbPath().then(setDbPath).catch(() => {});
    setAuditEntries([]);
    setAuditOffset(0);
    setNewRecoveryCode('');
    setCopiedCode(false);
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
      const code = await changeMasterPassword(oldPw, newPw);
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setNewRecoveryCode(code);
    } catch {
      toast('Incorrect current password', 'error');
    } finally {
      setChangingPw(false);
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(newRecoveryCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  }

  const sections: { id: Section; label: string; Icon: React.ElementType }[] = [
    { id: 'security',  label: 'Security',   Icon: ShieldCheck  },
    { id: 'data',      label: 'Data',       Icon: Database     },
    { id: 'backup',    label: 'Backup',     Icon: HardDrive    },
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
                {localConfig.auto_lock_minutes > 0 && (
                  <Toggle
                    checked={localConfig.show_lock_countdown}
                    onChange={(v) => setLocalConfig({ ...localConfig, show_lock_countdown: v })}
                    label="Show lock countdown in status bar"
                  />
                )}
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

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p className="label-section">Appearance</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', flex: 1 }}>Theme</span>
                  <div style={{ display: 'flex', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {(['dark', 'light'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setLocalConfig({ ...localConfig, theme: t })}
                        style={{
                          padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 5,
                          background: localConfig.theme === t ? 'var(--surface-hover)' : 'transparent',
                          color: localConfig.theme === t ? 'var(--text)' : 'var(--text-muted)',
                          borderRight: t === 'dark' ? '1px solid var(--border)' : 'none',
                          transition: 'all 100ms', cursor: 'pointer',
                        }}
                      >
                        {t === 'dark' ? <Moon size={11} strokeWidth={1.8} /> : <Sun size={11} strokeWidth={1.8} />}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <Toggle
                  checked={localConfig.minimize_to_tray}
                  onChange={(v) => setLocalConfig({ ...localConfig, minimize_to_tray: v })}
                  label="Minimize to tray on close"
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p className="label-section">Change master password</p>
                {newRecoveryCode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'rgba(52,201,122,0.06)', border: '1px solid rgba(52,201,122,0.25)', fontSize: '11px', color: 'var(--green)', lineHeight: 1.5 }}>
                      Password changed. A new recovery code was generated — save it now.
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--text)', userSelect: 'all' }}>
                        {newRecoveryCode}
                      </div>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      style={{
                        padding: '8px', borderRadius: 'var(--r-md)',
                        background: copiedCode ? 'rgba(52,201,122,0.12)' : 'var(--surface-hover)',
                        border: `1px solid ${copiedCode ? 'var(--green)' : 'var(--border)'}`,
                        color: copiedCode ? 'var(--green)' : 'var(--text-dim)',
                        fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms',
                        display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                      }}
                    >
                      {copiedCode ? <><Check size={12} strokeWidth={2.5} /> Copied</> : <><Copy size={12} strokeWidth={1.8} /> Copy code</>}
                    </button>
                    <button onClick={() => setNewRecoveryCode('')} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <Input type="password" label="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
                    <Input type="password" label="New password (min. 12 chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                    <PasswordStrengthMeter password={newPw} />
                    <Input type="password" label="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                    <Button variant="ghost" onClick={handleChangePassword} loading={changingPw}>Change password</Button>
                  </>
                )}
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


          {section === 'backup' && (
            <BackupSection
              localConfig={localConfig}
              setLocalConfig={setLocalConfig}
            />
          )}


          {section === 'audit' && (() => {
            const filterSet = FILTER_GROUPS[auditFilter];
            const filtered  = filterSet ? auditEntries.filter(e => filterSet.includes(e.action)) : auditEntries;
            const groups    = groupByDate(filtered);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1 }}>
                      {localConfig.audit_enabled
                        ? auditEntries.length > 0
                          ? <><strong style={{ color: 'var(--text-dim)' }}>{auditEntries.length}{auditHasMore ? '+' : ''}</strong> events recorded</>
                          : 'Most recent first'
                        : 'Audit logging is off — enable in Settings → Data'}
                    </span>
                    <button
                      onClick={() => { setAuditEntries([]); setAuditOffset(0); loadAudit(0, false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '3px 8px', borderRadius: 'var(--r-md)', transition: 'all 120ms' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <RefreshCw size={10} strokeWidth={2.2} />
                      Refresh
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 5 }}>
                    {(['all', 'reads', 'writes', 'auth'] as const).map(f => (
                      <button key={f} onClick={() => setAuditFilter(f)} style={{
                        padding: '2px 10px', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 500,
                        background: auditFilter === f ? 'var(--surface-hover)' : 'transparent',
                        border: `1px solid ${auditFilter === f ? 'var(--border-strong)' : 'var(--border)'}`,
                        color: auditFilter === f ? 'var(--text)' : 'var(--text-muted)',
                        cursor: 'pointer', transition: 'all 120ms',
                      }}>
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {auditLoading && auditEntries.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--text-muted)', borderRadius: '50%', animation: 'spin 600ms linear infinite', display: 'block' }} />
                      Loading entries…
                    </div>
                  ) : filtered.length === 0 ? (
                    <div style={{ padding: 44, textAlign: 'center' }}>
                      <ClipboardList size={30} strokeWidth={1.2} style={{ color: 'var(--border-strong)', margin: '0 auto 12px', display: 'block' }} />
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                        {!localConfig.audit_enabled ? 'Audit logging is disabled' : auditFilter !== 'all' ? `No ${auditFilter} events` : 'No events yet'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, opacity: 0.6 }}>
                        {!localConfig.audit_enabled ? 'Enable it in Settings → Data' : 'Actions appear here as you use the vault'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {groups.map(({ label: dateLabel, entries: group }) => (
                        <div key={dateLabel}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px 5px', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{dateLabel}</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          </div>

                          {group.map((entry, i) => {
                            const meta = ACTION_META[entry.action] ?? { label: entry.action.replace(/_/g, ' '), color: 'var(--text-muted)', bg: 'var(--surface-hover)', Icon: ClipboardList };
                            const ActionIcon = meta.Icon;
                            const detail = entry.detail || entry.entity_type;
                            const suffix = entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : '';
                            return (
                              <div key={entry.id}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderBottom: i < group.length - 1 ? '1px solid rgba(42,42,46,0.5)' : 'none', transition: 'background 80ms', cursor: 'default' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <div style={{ width: 26, height: 26, borderRadius: 'var(--r-md)', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <ActionIcon size={12} strokeWidth={2.2} style={{ color: meta.color }} />
                                </div>

                                <span style={{ fontSize: '12px', fontWeight: 600, color: meta.color, minWidth: 86, flexShrink: 0 }}>
                                  {meta.label}
                                </span>

                                <span style={{ flex: 1, fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {detail}{suffix}
                                </span>

                                <span title={new Date(entry.timestamp).toLocaleString()} style={{ flexShrink: 0, fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                  {fmtTimestamp(entry.timestamp)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {auditHasMore && (
                        <button
                          onClick={() => loadAudit(auditOffset, true)}
                          disabled={auditLoading}
                          style={{ width: '100%', padding: '10px', fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', transition: 'color 100ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          {auditLoading
                            ? <><span style={{ width: 11, height: 11, border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--text-muted)', borderRadius: '50%', animation: 'spin 600ms linear infinite', display: 'inline-block' }} /> Loading…</>
                            : 'Load more ↓'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })()}


          {section === 'about' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>


              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ZLogo size={48} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>ZVault</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>v0.4.0</span>
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

function BackupSection({ localConfig, setLocalConfig }: {
  localConfig: import('@/types').AppConfig;
  setLocalConfig: (c: import('@/types').AppConfig) => void;
}) {
  const { toast } = useToast();
  const [backing, setBacking] = React.useState(false);

  async function pickFolder() {
    const folder = await open({ directory: true, multiple: false });
    if (typeof folder === 'string') {
      setLocalConfig({ ...localConfig, backup_folder: folder });
    }
  }

  async function handleBackupNow() {
    setBacking(true);
    try {
      const path = await backupVault();
      toast(`Backup saved: ${path}`, 'success');
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setBacking(false);
    }
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p className="label-section">Automatic backup</p>

      <Toggle
        checked={localConfig.backup_enabled}
        onChange={(v) => setLocalConfig({ ...localConfig, backup_enabled: v })}
        label="Enable automatic backups"
      />

      {localConfig.backup_enabled && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)', flex: 1 }}>Backup every</span>
            <select
              value={localConfig.backup_interval_days}
              onChange={(e) => setLocalConfig({ ...localConfig, backup_interval_days: Number(e.target.value) })}
              style={{ padding: '5px 8px', background: 'var(--surface-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '12px', color: 'var(--text-dim)' }}
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Backup folder</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <code style={{
                flex: 1, padding: '6px 10px', borderRadius: 'var(--r-md)',
                background: 'var(--surface-hover)', fontSize: '11px', color: 'var(--text-dim)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {localConfig.backup_folder || 'Not set'}
              </code>
              <Button size="sm" variant="ghost" onClick={pickFolder} icon={<Folder size={12} strokeWidth={1.8} />}>
                Browse
              </Button>
            </div>
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <p className="label-section" style={{ marginBottom: 10 }}>Manual backup</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          Creates a timestamped copy of the encrypted database in the backup folder. The backup is safe to store — values remain encrypted.
        </p>
        <Button
          variant="ghost"
          onClick={handleBackupNow}
          loading={backing}
          disabled={!localConfig.backup_folder}
          icon={<HardDrive size={13} strokeWidth={1.8} />}
        >
          Back up now
        </Button>
        {!localConfig.backup_folder && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 6 }}>Set a backup folder first</p>
        )}
      </div>
    </div>
  );
}
