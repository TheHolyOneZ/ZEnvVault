import { create } from 'zustand';

type Modal = 'project' | 'tier' | 'variable' | 'import' | 'export' | 'diff' | 'settings' | 'command-palette' | null;

interface UiState {
  modal: Modal;
  editingProjectId: string | null;
  editingVariableId: string | null;
  selectedVariableIds: Set<string>;
  searchQuery: string;
  filterType: 'all' | 'secrets' | 'non-secrets';
  sortBy: 'custom' | 'az' | 'za' | 'newest' | 'oldest';
  revealedIds: Set<string>;
  revealedValues: Record<string, string>;

  openModal: (m: Modal, editId?: string) => void;
  closeModal: () => void;
  toggleSelectVariable: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
  setFilterType: (f: UiState['filterType']) => void;
  setSortBy: (s: UiState['sortBy']) => void;
  setRevealed: (id: string, value: string) => void;
  unreveal: (id: string) => void;
  clearRevealed: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  modal: null,
  editingProjectId: null,
  editingVariableId: null,
  selectedVariableIds: new Set(),
  searchQuery: '',
  filterType: 'all',
  sortBy: 'custom',
  revealedIds: new Set(),
  revealedValues: {},

  openModal: (modal, editId) => set({
    modal,
    editingProjectId: modal === 'project' ? (editId ?? null) : null,
    editingVariableId: modal === 'variable' ? (editId ?? null) : null,
  }),
  closeModal: () => set({ modal: null, editingProjectId: null, editingVariableId: null }),

  toggleSelectVariable: (id) => set((s) => {
    const next = new Set(s.selectedVariableIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedVariableIds: next };
  }),
  selectAll: (ids) => set({ selectedVariableIds: new Set(ids) }),
  clearSelection: () => set({ selectedVariableIds: new Set() }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterType: (filterType) => set({ filterType }),
  setSortBy: (sortBy) => set({ sortBy }),

  setRevealed: (id, value) => set((s) => ({
    revealedIds: new Set([...s.revealedIds, id]),
    revealedValues: { ...s.revealedValues, [id]: value },
  })),
  unreveal: (id) => set((s) => {
    const ids = new Set(s.revealedIds);
    ids.delete(id);
    const vals = { ...s.revealedValues };
    delete vals[id];
    return { revealedIds: ids, revealedValues: vals };
  }),
  clearRevealed: () => set({ revealedIds: new Set(), revealedValues: {} }),
}));
