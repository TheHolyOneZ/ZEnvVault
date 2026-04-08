import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { listVariables, createTier, deleteTier, syncTierToFile, unlinkTierFile, linkTierFile } from '@/lib/tauri';
import { open } from '@tauri-apps/plugin-dialog';
import { VariableTable } from '@/components/variables/VariableTable';
import { BulkActionBar } from '@/components/variables/BulkActionBar';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ZLogo } from '@/components/ui/ZLogo';
import { X, RefreshCw } from 'lucide-react';

export function MainPanel() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const projects = useProjectStore((s) => s.projects);
  const tiers = useProjectStore((s) => s.tiers);
  const setActiveTier = useProjectStore((s) => s.setActiveTier);
  const setVariables = useProjectStore((s) => s.setVariables);
  const upsertTier = useProjectStore((s) => s.upsertTier);
  const removeTier = useProjectStore((s) => s.removeTier);
  const openModal = useUiStore((s) => s.openModal);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const filterType = useUiStore((s) => s.filterType);
  const setFilterType = useUiStore((s) => s.setFilterType);
  const sortBy = useUiStore((s) => s.sortBy);
  const setSortBy = useUiStore((s) => s.setSortBy);
  const clearRevealed = useUiStore((s) => s.clearRevealed);
  const { toast } = useToast();

  const [addingEnv, setAddingEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const projectTiers = activeProjectId ? (tiers[activeProjectId] ?? []) : [];
  const activeTier = projectTiers.find((t) => t.id === activeTierId);

  async function handleSyncToFile() {
    if (!activeTierId) return;
    setSyncing(true);
    try {
      await syncTierToFile(activeTierId);
      toast('Synced to file', 'success');
    } catch (err) {
      toast(String(err), 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleUnlinkFile() {
    if (!activeTierId || !activeProjectId) return;
    try {
      const updated = await unlinkTierFile(activeTierId);
      upsertTier(activeProjectId, updated);
      toast('File unlinked', 'success');
    } catch {
      toast('Failed to unlink file', 'error');
    }
  }

  async function handleLinkFile() {
    if (!activeTierId || !activeProjectId) return;
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Env files', extensions: ['env', 'txt'] }],
    });
    if (typeof selected !== 'string') return;
    try {
      const updated = await linkTierFile(activeTierId, selected, false);
      upsertTier(activeProjectId, updated);
      toast('File linked — use "Sync now" to push changes', 'success');
    } catch {
      toast('Failed to link file', 'error');
    }
  }

  async function handleSelectTier(tierId: string) {
    setActiveTier(tierId);
    clearRevealed();
    const vars = await listVariables(tierId);
    setVariables(vars);
  }

  async function handleAddEnv() {
    if (!newEnvName.trim() || !activeProjectId) return;
    try {
      const tier = await createTier(activeProjectId, newEnvName.trim());
      upsertTier(activeProjectId, tier);
      setNewEnvName('');
      setAddingEnv(false);
      await handleSelectTier(tier.id);
    } catch {
      toast('Failed to create environment', 'error');
    }
  }

  async function handleDeleteTier(tierId: string, tierName: string) {
    if (!activeProjectId) return;
    if (!confirm(`Delete environment "${tierName}" and all its variables?`)) return;
    try {
      await deleteTier(tierId);
      removeTier(activeProjectId, tierId);
      const remaining = projectTiers.filter((t) => t.id !== tierId);
      if (remaining.length > 0) {
        await handleSelectTier(remaining[0].id);
      } else {
        setActiveTier(null);
        setVariables([]);
      }
    } catch {
      toast('Failed to delete environment', 'error');
    }
  }

  if (!activeProjectId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <ZLogo size={52} radius="var(--r-xl)" style={{ boxShadow: '0 4px 20px rgba(124,106,247,0.25)' }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--text)' }}>
            ZVault
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Select or create a project to get started
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Badge variant="accent">Encrypted</Badge>
          <span style={{ color: 'var(--border-strong)', fontSize: '12px' }}>·</span>
          <Badge variant="default">Offline</Badge>
          <span style={{ color: 'var(--border-strong)', fontSize: '12px' }}>·</span>
          <Badge variant="default">Organized</Badge>
        </div>
        <Button variant="primary" onClick={() => openModal('project')}
          icon={<span style={{ fontSize: '16px', fontWeight: 300 }}>+</span>}
        >
          New project
        </Button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

      <div
        data-tour="main-env-tabs"
        style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          padding: '0 12px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', flexShrink: 0, overflowX: 'auto',
          height: 40,
        }}>

        <span
          title="Environments separate your variables by context — e.g. dev, staging, prod"
          style={{
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
            color: 'var(--text-muted)', textTransform: 'uppercase',
            paddingRight: '10px', cursor: 'default',
            borderRight: '1px solid var(--border)', marginRight: '6px',
            flexShrink: 0, lineHeight: 1,
          }}
        >Envs</span>

        {projectTiers.map((tier) => {
          const isActive = tier.id === activeTierId;
          return (
            <div key={tier.id} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <button
                onClick={() => handleSelectTier(tier.id)}
                style={{
                  padding: '0 14px', height: '100%',
                  fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500,
                  color: isActive ? 'var(--text)' : 'var(--text-dim)',
                  background: 'transparent',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  borderTop: '2px solid transparent',
                  transition: 'all 80ms',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                {tier.name}
                {tier.source_path && (
                  <span
                    title={tier.auto_sync ? 'Auto-syncing to file' : 'Linked to file'}
                    style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: tier.auto_sync ? 'var(--accent)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTier(tier.id, tier.name); }}
                style={{
                  fontSize: '10px', color: 'var(--text-muted)', padding: '0 2px',
                  opacity: isActive ? 0.5 : 0, transition: 'opacity 80ms',
                  lineHeight: 1,
                }}
                title="Delete environment"
              ><X size={9} strokeWidth={2.5} /></button>
            </div>
          );
        })}

        {addingEnv ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddEnv(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '6px' }}
          >
            <input
              autoFocus
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (setAddingEnv(false), setNewEnvName(''))}
              placeholder="e.g. dev"
              style={{
                padding: '4px 8px', borderRadius: 'var(--r-md)', fontSize: '12px',
                fontFamily: 'var(--font-mono)', background: 'var(--surface-input)',
                border: '1px solid var(--accent)', color: 'var(--text)', width: 90,
                lineHeight: 1,
              }}
            />
            <button
              type="submit"
              style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
            >Add</button>
            <button
              type="button"
              onClick={() => { setAddingEnv(false); setNewEnvName(''); }}
              style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
            >Cancel</button>
          </form>
        ) : (
          <button
            onClick={() => setAddingEnv(true)}
            title="Add environment (e.g. dev, staging, prod)"
            style={{
              width: 28, height: 28, borderRadius: 'var(--r-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 300, color: 'var(--text-muted)',
              transition: 'all 80ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >+</button>
        )}


        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>

          {activeTierId && !activeTier?.source_path && (
            <button
              onClick={handleLinkFile}
              title="Link a .env file to this environment for write-back sync"
              style={{
                fontSize: '11px', padding: '3px 8px', borderRadius: 'var(--r-sm)',
                color: 'var(--text-muted)', background: 'transparent',
                border: '1px solid transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                transition: 'all 100ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent)';
                e.currentTarget.style.background = 'var(--accent-sub)';
                e.currentTarget.style.borderColor = 'var(--accent-border)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Link .env
            </button>
          )}
          <Button size="sm" variant="ghost" onClick={() => openModal('import')}>Import</Button>
          <Button size="sm" variant="ghost" onClick={() => openModal('export')}>Export</Button>
          <Button size="sm" variant="ghost" onClick={() => openModal('diff')}>Diff</Button>
        </div>
      </div>


      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>

        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables…"
            style={{
              width: '100%', padding: '5px 8px 5px 28px',
              background: 'var(--surface-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', fontSize: '12px', color: 'var(--text)',
            }}
          />
          <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>


        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {([['all', 'All'], ['secrets', 'Secrets'], ['non-secrets', 'Non-secrets']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterType(val)}
              style={{
                padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 500,
                background: filterType === val ? 'var(--surface-hover)' : 'transparent',
                border: `1px solid ${filterType === val ? 'var(--border-strong)' : 'var(--border)'}`,
                color: filterType === val ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 100ms',
              }}
            >{label}</button>
          ))}
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{
              padding: '4px 26px 4px 10px',
              background: 'var(--surface-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-full)', fontSize: '11px', color: 'var(--text-dim)',
              appearance: 'none', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="custom">Custom</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <svg style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <Button size="sm" variant="primary" onClick={() => openModal('variable')}
          icon={<span style={{ fontSize: '16px', fontWeight: 300 }}>+</span>}
        >
          Add variable
        </Button>
      </div>


      {activeTier?.source_path && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderBottom: '1px solid var(--border)',
          background: activeTier.auto_sync ? 'rgba(124,106,247,0.06)' : 'var(--surface)',
          fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0,
        }}>
          {activeTier.auto_sync && (
            <button
              onClick={async () => {
                if (!activeTierId || !activeProjectId || !activeTier?.source_path) return;
                try {
                  const updated = await linkTierFile(activeTierId, activeTier.source_path, false);
                  upsertTier(activeProjectId, updated);
                } catch { toast('Failed', 'error'); }
              }}
              title="Disable auto-sync (switch to manual)"
              style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}
            ><RefreshCw size={12} strokeWidth={2} /></button>
          )}
          {!activeTier.auto_sync && (
            <span style={{ color: 'var(--text-muted)' }}>⇅</span>
          )}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            {activeTier.auto_sync ? 'Auto-syncing to' : 'Linked to'}: {activeTier.source_path}
          </span>
          {!activeTier.auto_sync && (
            <>
              <button
                onClick={handleSyncToFile}
                disabled={syncing}
                style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--r-sm)',
                  background: 'var(--accent-sub)', color: 'var(--accent)',
                  border: '1px solid var(--accent-border)', cursor: 'pointer',
                  opacity: syncing ? 0.5 : 1, flexShrink: 0,
                }}
              >{syncing ? 'Syncing…' : 'Sync now'}</button>
              <button
                onClick={async () => {
                  if (!activeTierId || !activeProjectId || !activeTier?.source_path) return;
                  try {
                    const updated = await linkTierFile(activeTierId, activeTier.source_path, true);
                    upsertTier(activeProjectId, updated);
                  } catch { toast('Failed', 'error'); }
                }}
                style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--r-sm)',
                  color: 'var(--text-muted)', background: 'transparent',
                  border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0,
                }}
                title="Enable auto-sync on every change"
              >Auto-sync</button>
            </>
          )}
          <button
            onClick={handleUnlinkFile}
            title="Remove file link"
            style={{ display: 'flex', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
          ><X size={12} strokeWidth={2} /></button>
        </div>
      )}


      <div style={{ paddingTop: '8px' }}>
        <BulkActionBar />
      </div>


      <div data-tour="main-var-table" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <VariableTable />
      </div>
    </div>
  );
}
