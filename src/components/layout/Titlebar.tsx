import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useProjectStore } from '@/store/projectStore';
import { lock } from '@/lib/tauri';
import { useAuthStore } from '@/store/authStore';
import { ZLogo } from '@/components/ui/ZLogo';

export function Titlebar() {
  const win = getCurrentWindow();
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const tiers = useProjectStore((s) => s.tiers);
  const setLocked = useAuthStore((s) => s.setLocked);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeTier = activeProjectId
    ? (tiers[activeProjectId] ?? []).find((t) => t.id === activeTierId)
    : undefined;

  async function handleMinimize() { await win.minimize(); }
  async function handleMaximize() { const max = await win.isMaximized(); if (max) win.unmaximize(); else win.maximize(); }
  async function handleClose() { await win.close(); }
  async function handleLock() { await lock(); setLocked(true); }

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 'var(--titlebar-h)', background: 'rgba(8,8,9,0.95)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 0 0 14px', flexShrink: 0, userSelect: 'none',
        zIndex: 100,
      }}
    >
      
      <div data-tour="titlebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 120 }}>
        <ZLogo size={22} radius="5px" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          ZVault
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em', marginLeft: '-2px' }}>by TheHolyOneZ</span>
      </div>

      
      <div data-tauri-drag-region style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', flex: 1, justifyContent: 'center' }}>
        {activeProject ? (
          <>
            <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{activeProject.name}</span>
            {activeTier && (
              <>
                <span>›</span>
                <span style={{
                  padding: '1px 7px', borderRadius: 'var(--r-sm)',
                  background: 'var(--surface-hover)', color: 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                }}>{activeTier.name}</span>
              </>
            )}
          </>
        ) : (
          <span>No project selected</span>
        )}
      </div>

      
      <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', marginLeft: 'auto' }}>
        
        <TitleBtn onClick={handleLock} title="Lock vault (Ctrl+L)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </TitleBtn>

        <div style={{ width: '1px', background: 'var(--border)', margin: '8px 0' }} />

        
        <TitleBtn onClick={handleMinimize} title="Minimize">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </TitleBtn>
        
        <TitleBtn onClick={handleMaximize} title="Maximize / Restore">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="4" y="4" width="16" height="16" rx="1.5"/>
          </svg>
        </TitleBtn>
        
        <TitleBtn onClick={handleClose} danger title="Close to tray">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </TitleBtn>
      </div>
    </div>
  );
}

function TitleBtn({ children, onClick, danger, title }: { children: React.ReactNode; onClick: () => void; danger?: boolean; title?: string }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 46, height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px',
        color: hovered ? (danger ? '#fff' : 'var(--text)') : 'var(--text-muted)',
        background: hovered ? (danger ? '#c42b1c' : 'var(--surface-hover)') : 'transparent',
        transition: 'background 120ms, color 120ms',
      }}
    >
      {children}
    </button>
  );
}
