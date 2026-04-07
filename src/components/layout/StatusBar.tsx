import React from 'react';
import { useProjectStore } from '@/store/projectStore';

export function StatusBar() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTierId = useProjectStore((s) => s.activeTierId);
  const tiers = useProjectStore((s) => s.tiers);
  const variables = useProjectStore((s) => s.variables);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeTier = activeProjectId
    ? (tiers[activeProjectId] ?? []).find((t) => t.id === activeTierId)
    : undefined;

  return (
    <div style={{
      height: 'var(--statusbar-h)', background: 'rgba(8,8,9,0.8)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      gap: '16px', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0,
    }}>
      {activeProject ? (
        <>
          <span>{activeProject.name}</span>
          {activeTier && (
            <>
              <span>·</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{activeTier.name}</span>
              <span>·</span>
              <span>{variables.length} variable{variables.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </>
      ) : (
        <span>No project selected</span>
      )}
      <span style={{ marginLeft: 'auto' }}>ZVault v0.1.0</span>
    </div>
  );
}
