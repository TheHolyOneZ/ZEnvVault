import { create } from 'zustand';
import type { Project, Tier, Variable } from '@/types';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  activeTierId: string | null;
  tiers: Record<string, Tier[]>;       
  variables: Variable[];
  setProjects: (projects: Project[]) => void;
  setActiveProject: (id: string | null) => void;
  setActiveTier: (id: string | null) => void;
  setTiers: (projectId: string, tiers: Tier[]) => void;
  setVariables: (variables: Variable[]) => void;
  upsertProject: (project: Project) => void;
  removeProject: (id: string) => void;
  upsertTier: (projectId: string, tier: Tier) => void;
  removeTier: (projectId: string, tierId: string) => void;
  upsertVariable: (variable: Variable) => void;
  removeVariable: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProjectId: null,
  activeTierId: null,
  tiers: {},
  variables: [],

  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setActiveTier: (id) => set({ activeTierId: id }),
  setTiers: (projectId, tiers) => set((s) => ({ tiers: { ...s.tiers, [projectId]: tiers } })),
  setVariables: (variables) => set({ variables }),

  upsertProject: (project) => set((s) => {
    const idx = s.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      const arr = [...s.projects];
      arr[idx] = project;
      return { projects: arr };
    }
    return { projects: [...s.projects, project] };
  }),

  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

  upsertTier: (projectId, tier) => set((s) => {
    const existing = s.tiers[projectId] ?? [];
    const idx = existing.findIndex((t) => t.id === tier.id);
    let updated;
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = tier;
    } else {
      updated = [...existing, tier];
    }
    return { tiers: { ...s.tiers, [projectId]: updated } };
  }),

  removeTier: (projectId, tierId) => set((s) => ({
    tiers: {
      ...s.tiers,
      [projectId]: (s.tiers[projectId] ?? []).filter((t) => t.id !== tierId),
    },
  })),

  upsertVariable: (variable) => set((s) => {
    const idx = s.variables.findIndex((v) => v.id === variable.id);
    if (idx >= 0) {
      const arr = [...s.variables];
      arr[idx] = variable;
      return { variables: arr };
    }
    return { variables: [...s.variables, variable] };
  }),

  removeVariable: (id) => set((s) => ({ variables: s.variables.filter((v) => v.id !== id) })),
}));
