import React, { useMemo, useState, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { VariableRow } from './VariableRow';
import { EmptyState } from './EmptyState';
import { ChevronUp, ChevronDown, ChevronsUpDown, Pin, ChevronRight, GripVertical } from 'lucide-react';
import type { Variable } from '@/types';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reorderVariables } from '@/lib/tauri';

function SortableVarRow({ variable, projectColor }: { variable: Variable; projectColor: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: variable.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative', zIndex: isDragging ? 999 : 'auto' }}>
      <VariableRow variable={variable} projectColor={projectColor} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function SortableGroupBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 999 : 'auto' }}>
      {children}
    </div>
  );
}

export function VariableTable() {
  const variables = useProjectStore((s) => s.variables);
  const setVariables = useProjectStore((s) => s.setVariables);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const filterType = useUiStore((s) => s.filterType);
  const sortBy = useUiStore((s) => s.sortBy);
  const setSortBy = useUiStore((s) => s.setSortBy);

  const [keyHovered, setKeyHovered] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [groupOrder, setGroupOrder] = useState<string[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectColor = activeProject?.color ?? 'var(--accent)';
  const isDraggable = sortBy === 'custom' && !searchQuery && filterType === 'all';

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let vars = [...variables];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      vars = vars.filter((v) =>
        v.key.toLowerCase().includes(q) ||
        (v.description ?? '').toLowerCase().includes(q) ||
        (v.group_name ?? '').toLowerCase().includes(q)
      );
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

  const pinned = useMemo(() => filtered.filter((v) => v.pinned), [filtered]);
  const unpinned = useMemo(() => filtered.filter((v) => !v.pinned), [filtered]);

  const groups = useMemo(() => {
    const map = new Map<string, Variable[]>();
    for (const v of unpinned) {
      const g = v.group_name ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(v);
    }
    return map;
  }, [unpinned]);

  const derivedGroupOrder = useMemo(() => {
    const named: string[] = [];
    for (const [g] of groups) { if (g !== '') named.push(g); }
    named.sort();
    return named;
  }, [groups]);

  const orderedNamedGroups = useMemo(() => {
    const current = groupOrder.filter((g) => derivedGroupOrder.includes(g));
    const added = derivedGroupOrder.filter((g) => !current.includes(g));
    const merged = [...current, ...added];
    if (JSON.stringify(merged) !== JSON.stringify(groupOrder)) {
      setTimeout(() => setGroupOrder(merged), 0);
    }
    return merged;
  }, [derivedGroupOrder, groupOrder]);

  const ungrouped = useMemo(() => groups.get('') ?? [], [groups]);

  const persistOrder = useCallback(async (newVars: Variable[]) => {
    const withOrder = newVars.map((v, i) => ({ ...v, sort_order: i }));
    setVariables(withOrder);
    try { await reorderVariables(withOrder.map((v) => v.id)); } catch {}
  }, [setVariables]);

  async function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = orderedNamedGroups.indexOf(active.id as string);
    const newIdx = orderedNamedGroups.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const newGroupOrder = arrayMove(orderedNamedGroups, oldIdx, newIdx);
    setGroupOrder(newGroupOrder);
    const flat: Variable[] = [
      ...pinned,
      ...newGroupOrder.flatMap((g) => groups.get(g) ?? []),
      ...ungrouped,
    ];
    await persistOrder(flat);
  }

  async function handleVarDragEnd(event: DragEndEvent, groupName: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const groupVars = groups.get(groupName) ?? [];
    const oldIdx = groupVars.findIndex((v) => v.id === active.id);
    const newIdx = groupVars.findIndex((v) => v.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reorderedGroup = arrayMove(groupVars, oldIdx, newIdx);
    const flat: Variable[] = [
      ...pinned,
      ...orderedNamedGroups.flatMap((g) => g === groupName ? reorderedGroup : (groups.get(g) ?? [])),
      ...ungrouped,
    ];
    await persistOrder(flat);
  }

  async function handleUngroupedDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ungrouped.findIndex((v) => v.id === active.id);
    const newIdx = ungrouped.findIndex((v) => v.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reorderedUngrouped = arrayMove(ungrouped, oldIdx, newIdx);
    const flat: Variable[] = [
      ...pinned,
      ...orderedNamedGroups.flatMap((g) => groups.get(g) ?? []),
      ...reorderedUngrouped,
    ];
    await persistOrder(flat);
  }

  if (variables.length === 0) return <EmptyState />;

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

      <div style={{
        display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr auto',
        alignItems: 'center', gap: '8px',
        padding: '0 12px', height: 32, flexShrink: 0,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        fontSize: '11px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        <div />
        <span
          onClick={() => setSortBy(sortBy === 'az' ? 'za' : 'az')}
          onMouseEnter={() => setKeyHovered(true)}
          onMouseLeave={() => setKeyHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
            color: (sortBy === 'az' || sortBy === 'za') ? 'var(--accent)' : keyHovered ? 'var(--text-dim)' : 'var(--text-muted)',
            transition: 'color 100ms', userSelect: 'none',
          }}
        >
          Key
          {sortBy === 'az' ? <ChevronUp size={11} strokeWidth={2.5} />
            : sortBy === 'za' ? <ChevronDown size={11} strokeWidth={2.5} />
            : <ChevronsUpDown size={10} strokeWidth={2} style={{ opacity: keyHovered ? 0.6 : 0.3 }} />}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>Value</span>
        <span style={{ color: 'var(--text-muted)' }}>Description</span>
        <span style={{ color: 'var(--text-muted)' }}>Actions</span>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No variables match your search
        </div>
      )}

      {pinned.length > 0 && (
        <div style={{ borderBottom: '2px solid var(--border)' }}>
          <GroupHeader
            label="Pinned" count={pinned.length}
            icon={<Pin size={10} strokeWidth={2.5} />}
            color="var(--accent)"
            collapsed={collapsed.has('__pinned__')}
            onToggle={() => toggleCollapse('__pinned__')}
            draggable={false}
          />
          {!collapsed.has('__pinned__') && pinned.map((variable, i) => (
            <div key={variable.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}>
              <VariableRow variable={variable} projectColor={projectColor} />
            </div>
          ))}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
        <SortableContext items={orderedNamedGroups} strategy={verticalListSortingStrategy}>
          {orderedNamedGroups.map((groupName) => {
            const groupVars = groups.get(groupName) ?? [];
            const isCollapsed = collapsed.has(groupName);
            return (
              <SortableGroupBlock key={groupName} id={groupName}>
                <div style={{ borderBottom: '2px solid var(--border)', borderLeft: '2px solid var(--border-strong)' }}>
                  <GroupHeader
                    label={groupName}
                    count={groupVars.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleCollapse(groupName)}
                    draggable={isDraggable}
                    groupId={groupName}
                  />
                  {!isCollapsed && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleVarDragEnd(e, groupName)}>
                      <SortableContext items={groupVars.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                        {groupVars.map((variable, i) => (
                          <div key={variable.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}>
                            {isDraggable
                              ? <SortableVarRow variable={variable} projectColor={projectColor} />
                              : <VariableRow variable={variable} projectColor={projectColor} />
                            }
                          </div>
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </SortableGroupBlock>
            );
          })}
        </SortableContext>
      </DndContext>

      {ungrouped.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleUngroupedDragEnd}>
          <SortableContext items={ungrouped.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            {ungrouped.map((variable, i) => (
              <div key={variable.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }}>
                {isDraggable
                  ? <SortableVarRow variable={variable} projectColor={projectColor} />
                  : <VariableRow variable={variable} projectColor={projectColor} />
                }
              </div>
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function GroupHeader({ label, count, icon, color, collapsed, onToggle, draggable, groupId }: {
  label: string;
  count: number;
  icon?: React.ReactNode;
  color?: string;
  collapsed: boolean;
  onToggle: () => void;
  draggable: boolean;
  groupId?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const sortable = useSortable({ id: groupId ?? label, disabled: !draggable });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '0 12px 0 0', height: 30,
        background: hovered ? 'var(--surface-hover)' : 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        fontSize: '10px', fontWeight: 600,
        letterSpacing: '0.07em', textTransform: 'uppercase',
        color: color ?? 'var(--text-dim)',
        userSelect: 'none',
        transition: 'background 80ms',
      }}
    >
      {draggable && (
        <div
          {...sortable.attributes}
          {...sortable.listeners}
          style={{
            cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: '100%', flexShrink: 0,
            color: hovered ? 'var(--text-muted)' : 'transparent',
            transition: 'color 80ms',
          }}
        >
          <GripVertical size={14} strokeWidth={1.8} />
        </div>
      )}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1, height: '100%', paddingLeft: draggable ? 0 : 8 }}
      >
        <ChevronRight
          size={11} strokeWidth={2.5}
          style={{ transition: 'transform 150ms', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', flexShrink: 0, opacity: 0.6 }}
        />
        {icon}
        {label}
        <span style={{ fontSize: '9px', fontWeight: 500, opacity: 0.55, letterSpacing: '0.04em', marginLeft: 2 }}>{count}</span>
      </div>
    </div>
  );
}
