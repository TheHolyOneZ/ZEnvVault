import React, { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { VariableRow } from './VariableRow';
import { EmptyState } from './EmptyState';
import type { Variable } from '@/types';

export function VariableTable() {
  const variables = useProjectStore((s) => s.variables);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const filterType = useUiStore((s) => s.filterType);
  const sortBy = useUiStore((s) => s.sortBy);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectColor = activeProject?.color ?? 'var(--accent)';

  const filtered = useMemo(() => {
    let vars = [...variables];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      vars = vars.filter((v) => v.key.toLowerCase().includes(q) || (v.description ?? '').toLowerCase().includes(q));
    }

    if (filterType === 'secrets') vars = vars.filter((v) => v.is_secret);
    if (filterType === 'non-secrets') vars = vars.filter((v) => !v.is_secret);

    if (sortBy === 'az') vars.sort((a, b) => a.key.localeCompare(b.key));
    else if (sortBy === 'za') vars.sort((a, b) => b.key.localeCompare(a.key));
    else if (sortBy === 'newest') vars.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sortBy === 'oldest') vars.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else vars.sort((a, b) => a.sort_order - b.sort_order);

    return vars;
  }, [variables, searchQuery, filterType, sortBy]);

  if (variables.length === 0) return <EmptyState />;

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr auto',
        alignItems: 'center', gap: '8px',
        padding: '0 12px', height: 32, flexShrink: 0,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        <div />
        <span>Key</span>
        <span>Value</span>
        <span>Description</span>
        <span>Actions</span>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No variables match your search
        </div>
      )}

      {filtered.map((variable, i) => (
        <div
          key={variable.id}
          style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}
        >
          <VariableRow variable={variable} projectColor={projectColor} />
        </div>
      ))}
    </div>
  );
}
