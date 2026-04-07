import React from 'react';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { deleteVariable } from '@/lib/tauri';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

export function BulkActionBar() {
  const selectedIds = useUiStore((s) => s.selectedVariableIds);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const selectAll = useUiStore((s) => s.selectAll);
  const variables = useProjectStore((s) => s.variables);
  const removeVariable = useProjectStore((s) => s.removeVariable);
  const { toast } = useToast();

  const count = selectedIds.size;
  if (count === 0) return null;

  async function handleBulkDelete() {
    if (!confirm(`Delete ${count} variable${count > 1 ? 's' : ''}?`)) return;
    for (const id of selectedIds) {
      try {
        await deleteVariable(id);
        removeVariable(id);
      } catch {
        
      }
    }
    clearSelection();
    toast(`Deleted ${count} variable${count > 1 ? 's' : ''}`, 'info');
  }

  return (
    <div style={{
      padding: '8px 12px', background: 'var(--accent-sub)',
      border: '1px solid var(--accent-border)', borderRadius: 'var(--r-md)',
      display: 'flex', alignItems: 'center', gap: '12px',
      margin: '0 12px 8px',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent)', flex: 1 }}>
        {count} variable{count > 1 ? 's' : ''} selected
      </span>
      <Button size="sm" variant="ghost" onClick={() => selectAll(variables.map((v) => v.id))}>Select all</Button>
      <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete selected</Button>
      <Button size="sm" variant="ghost" onClick={clearSelection}><X size={11} strokeWidth={2.5} style={{ marginRight: 4 }} /> Clear</Button>
    </div>
  );
}
