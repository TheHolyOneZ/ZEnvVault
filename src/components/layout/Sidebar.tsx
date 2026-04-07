import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { listTiers, listVariables, lock } from '@/lib/tauri';
import { useAuthStore } from '@/store/authStore';
import { colorWithAlpha } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { Pencil } from 'lucide-react';

export function Sidebar() {
  const [search, setSearch] = useState('');
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const tiers = useProjectStore((s) => s.tiers);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const setActiveTier = useProjectStore((s) => s.setActiveTier);
  const setTiers = useProjectStore((s) => s.setTiers);
  const setVariables = useProjectStore((s) => s.setVariables);
  const openModal = useUiStore((s) => s.openModal);
  const setLocked = useAuthStore((s) => s.setLocked);
  const clearRevealed = useUiStore((s) => s.clearRevealed);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelectProject(id: string) {
    setActiveProject(id);
    clearRevealed();
    if (!tiers[id]) {
      const t = await listTiers(id);
      setTiers(id, t);
    }
    const projectTiers = tiers[id] ?? [];
    if (projectTiers.length > 0) {
      await handleSelectTier(projectTiers[0].id);
    } else {
      setActiveTier(null);
      setVariables([]);
    }
  }

  async function handleSelectTier(tierId: string) {
    setActiveTier(tierId);
    clearRevealed();
    const vars = await listVariables(tierId);
    setVariables(vars);
  }

  async function handleLock() {
    await lock();
    setLocked(true);
  }

  return (
    <aside
      data-tour="sidebar-projects"
      style={{
        width: 'var(--sidebar-w)', flexShrink: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
      
      <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          style={{
            flex: 1, padding: '6px 8px', background: 'var(--surface-input)',
            border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
            fontSize: '12px', color: 'var(--text)', lineHeight: '1',
          }}
        />
        <button
          onClick={() => openModal('project')}
          title="New project (Ctrl+Shift+N)"
          style={{
            width: 32, height: 32, borderRadius: 'var(--r-md)', flexShrink: 0,
            background: 'var(--accent-sub)', color: 'var(--accent)',
            border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/>
          </svg>
        </button>
      </div>

      
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            {projects.length === 0 ? 'No projects yet.\nClick + to create one.' : 'No results'}
          </div>
        )}
        {filtered.map((project) => {
          const isActive = project.id === activeProjectId;
          const projectTiers = tiers[project.id] ?? [];
          return (
            <div key={project.id}>
              <div
                onClick={() => handleSelectProject(project.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px 7px 12px', cursor: 'pointer',
                  borderLeft: `3px solid ${isActive ? project.color : 'transparent'}`,
                  background: isActive ? colorWithAlpha(project.color, 0.06) : 'transparent',
                  transition: 'all 80ms',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? project.color : 'var(--text-muted)', flexShrink: 0 }}>
                  <ProjectIcon name={project.icon || 'Folder'} size={14} strokeWidth={1.8} />
                </span>
                <span style={{
                  flex: 1, fontSize: '13px', fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--text)' : 'var(--text-dim)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{project.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); openModal('project', project.id); }}
                  style={{
                    width: 20, height: 20, borderRadius: 4, opacity: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', color: 'var(--text-muted)',
                  }}
                  className="project-edit-btn"
                ><Pencil size={11} strokeWidth={1.8} /></button>
              </div>

              
              {isActive && projectTiers.map((tier) => {
                const isTierActive = tier.id === activeTierId;
                return (
                  <div
                    key={tier.id}
                    onClick={() => handleSelectTier(tier.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 10px 5px 28px', cursor: 'pointer',
                      background: isTierActive ? 'var(--surface-hover)' : 'transparent',
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={(e) => { if (!isTierActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { if (!isTierActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isTierActive ? project.color : 'var(--border)', flexShrink: 0 }} />
                    <span style={{
                      flex: 1, fontSize: '12px', fontFamily: 'var(--font-mono)',
                      color: isTierActive ? 'var(--text)' : 'var(--text-dim)',
                    }}>{tier.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{tier.variable_count}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      
      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 10px', display: 'flex', gap: '4px' }}>
        <SidebarAction label="Lock" onClick={handleLock}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </SidebarAction>
        <SidebarAction label="Settings" onClick={() => openModal('settings')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </SidebarAction>
      </div>
    </aside>
  );
}

function SidebarAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        flex: 1, padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        borderRadius: 'var(--r-md)', color: 'var(--text-muted)', fontSize: '11px',
        transition: 'all 100ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
    >
      {children} {label}
    </button>
  );
}
