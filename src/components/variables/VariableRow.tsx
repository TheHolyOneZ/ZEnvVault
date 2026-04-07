import React, { useState } from 'react';
import type { Variable } from '@/types';
import { RevealValue } from './RevealValue';
import { useUiStore } from '@/store/uiStore';
import { copyVariableValue, deleteVariable, revealVariable } from '@/lib/tauri';
import { useProjectStore } from '@/store/projectStore';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { Copy, Pencil, Trash2, Check, Terminal, Hash, FileText, Braces } from 'lucide-react';

interface VariableRowProps {
  variable: Variable;
  projectColor: string;
}

export function VariableRow({ variable, projectColor }: VariableRowProps) {
  const [hovered, setHovered] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const openModal = useUiStore((s) => s.openModal);
  const toggleSelect = useUiStore((s) => s.toggleSelectVariable);
  const selectedIds = useUiStore((s) => s.selectedVariableIds);
  const removeVariable = useProjectStore((s) => s.removeVariable);
  const { toast } = useToast();

  const isSelected = selectedIds.has(variable.id);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await copyVariableValue(variable.id);
      toast('Copied to clipboard', 'success');
    } catch {
      toast('Failed to copy', 'error');
    }
  }

  async function handleDelete(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm(`Delete "${variable.key}"?`)) return;
    try {
      await deleteVariable(variable.id);
      removeVariable(variable.id);
      toast('Variable deleted', 'info');
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  async function copyAsSnippet(format: string) {
    let value: string;
    try {
      value = await revealVariable(variable.id);
    } catch {
      toast('Failed to reveal value', 'error');
      return;
    }
    const needsQuotes = value.includes(' ') || value.includes('"') || value.includes("'") || value.length === 0;
    const q = (v: string) => `"${v.replace(/"/g, '\\"')}"`;
    const snippets: Record<string, string> = {
      bash:       `export ${variable.key}=${needsQuotes ? q(value) : value}`,
      powershell: `$env:${variable.key} = ${q(value)}`,
      python:     `os.environ['${variable.key}'] = ${q(value)}`,
      node:       `process.env.${variable.key} = ${q(value)}`,
      csharp:     `Environment.SetEnvironmentVariable("${variable.key}", ${q(value)});`,
      dotenv:     `${variable.key}=${needsQuotes ? q(value) : value}`,
    };
    const snippet = snippets[format] ?? '';
    try {
      await navigator.clipboard.writeText(snippet);
      toast(`Copied as ${format}`, 'success');
    } catch {
      toast('Clipboard write failed', 'error');
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const menuItems: ContextMenuItem[] = [
    { label: 'Copy value',        icon: <Copy size={12} strokeWidth={1.8}/>, action: () => copyVariableValue(variable.id).then(() => toast('Copied', 'success')).catch(() => toast('Failed', 'error')) },
    { label: 'Edit',              icon: <Pencil size={12} strokeWidth={1.8}/>, action: () => openModal('variable', variable.id) },
    { label: '', separator: true, action: () => {} },
    { label: 'Copy as bash export', icon: <Terminal size={12} strokeWidth={1.8}/>, action: () => copyAsSnippet('bash') },
    { label: 'Copy as PowerShell',  icon: <Hash size={12} strokeWidth={1.8}/>,     action: () => copyAsSnippet('powershell') },
    { label: 'Copy as Python',      icon: <Braces size={12} strokeWidth={1.8}/>,   action: () => copyAsSnippet('python') },
    { label: 'Copy as Node.js',     icon: <Braces size={12} strokeWidth={1.8}/>,   action: () => copyAsSnippet('node') },
    { label: 'Copy as .env line',   icon: <FileText size={12} strokeWidth={1.8}/>, action: () => copyAsSnippet('dotenv') },
    { label: '', separator: true, action: () => {} },
    { label: 'Delete', icon: <Trash2 size={12} strokeWidth={1.8}/>, action: () => handleDelete(), danger: true },
  ];

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => openModal('variable', variable.id)}
        onContextMenu={handleContextMenu}
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 1fr 1fr auto',
          alignItems: 'center', gap: '8px',
          padding: '0 12px', height: 44, cursor: 'pointer',
          background: isSelected ? 'var(--accent-sub)' : hovered ? 'var(--surface-hover)' : 'transparent',
          borderLeft: `2px solid ${isSelected ? 'var(--accent)' : hovered ? projectColor : 'transparent'}`,
          transition: 'all 80ms',
          userSelect: 'none',
        }}
      >
        
        <div onClick={(e) => { e.stopPropagation(); toggleSelect(variable.id); }}
          style={{
            width: 16, height: 16, borderRadius: 4, border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
            background: isSelected ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            transition: 'all 100ms',
          }}
        >{isSelected && <Check size={10} strokeWidth={3} />}</div>

        
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
          color: 'var(--mono-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{variable.key}</span>

        
        <div onClick={(e) => e.stopPropagation()}>
          <RevealValue variableId={variable.id} isSecret={variable.is_secret} />
        </div>

        
        <span style={{
          fontSize: '12px', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{variable.description || ''}</span>

        
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            opacity: hovered || isSelected ? 1 : 0, transition: 'opacity 80ms',
          }}
        >
          {variable.is_secret && (
            <Badge variant="accent" style={{ marginRight: '4px' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </Badge>
          )}
          <ActionBtn onClick={handleCopy} title="Copy value">
            <Copy size={12} strokeWidth={1.8} />
          </ActionBtn>
          <ActionBtn onClick={(e) => { e.stopPropagation(); openModal('variable', variable.id); }} title="Edit">
            <Pencil size={12} strokeWidth={1.8} />
          </ActionBtn>
          <ActionBtn onClick={handleDelete} title="Delete" danger>
            <Trash2 size={12} strokeWidth={1.8} />
          </ActionBtn>
        </div>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x} y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

function ActionBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; title: string; danger?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 24, height: 24, borderRadius: 'var(--r-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: h ? (danger ? 'var(--red)' : 'var(--text)') : 'var(--text-muted)',
        background: h ? 'var(--surface-hover)' : 'transparent', transition: 'all 80ms',
      }}
    >{children}</button>
  );
}
