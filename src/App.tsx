import React, { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isFirstRun, isLocked, listProjects, getConfig } from '@/lib/tauri';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { useConfigStore } from '@/store/configStore';

import { SetupScreen } from '@/components/auth/SetupScreen';
import { LockScreen } from '@/components/auth/LockScreen';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { Titlebar } from '@/components/layout/Titlebar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainPanel } from '@/components/layout/MainPanel';
import { StatusBar } from '@/components/layout/StatusBar';

import { ProjectModal } from '@/components/projects/ProjectModal';
import { VariableModal } from '@/components/variables/VariableModal';
import { ImportModal } from '@/components/import-export/ImportModal';
import { ExportDialog } from '@/components/import-export/ExportDialog';
import { TierDiffView } from '@/components/diff/TierDiffView';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { CommandPalette } from '@/components/search/CommandPalette';

export default function App() {
  const { isLocked: locked, isFirstRun: firstRun, setLocked, setFirstRun } = useAuthStore();
  const setProjects = useProjectStore((s) => s.setProjects);
  const setConfig = useConfigStore((s) => s.setConfig);
  const openModal = useUiStore((s) => s.openModal);
  const clearRevealed = useUiStore((s) => s.clearRevealed);
  const initialized = useRef(false);


  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        const firstRunResult = await isFirstRun();
        if (firstRunResult) { setFirstRun(true); setLocked(false); return; }
        const lockedResult = await isLocked();
        setLocked(lockedResult);
      } catch {
        setLocked(true);
      }
    })();
  }, []);


  useEffect(() => {
    if (locked || firstRun) return;
    (async () => {
      try {
        const [projects, config] = await Promise.all([listProjects(), getConfig()]);
        setProjects(projects);
        setConfig(config);
      } catch {}
    })();
  }, [locked, firstRun]);


  useEffect(() => {
    const unlisten = listen('vault-locked', () => {
      setLocked(true);
      clearRevealed();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);


  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (locked || firstRun) return;

      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); openModal('command-palette'); }
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); import('@/lib/tauri').then(({ lock }) => { lock(); setLocked(true); clearRevealed(); }); }
      if (e.ctrlKey && e.key === ',') { e.preventDefault(); openModal('settings'); }
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey) { e.preventDefault(); openModal('variable'); }
      if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); openModal('project'); }
      if (e.ctrlKey && e.key === 'i') { e.preventDefault(); openModal('import'); }
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); openModal('export'); }

      if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        const projects = useProjectStore.getState().projects;
        const target = projects[idx];
        if (target) {
          const { setActiveProject, tiers, setTiers, setActiveTier, setVariables } = useProjectStore.getState();
          setActiveProject(target.id);
          clearRevealed();
          import('@/lib/tauri').then(async ({ listTiers, listVariables }) => {
            let projectTiers = tiers[target.id];
            if (!projectTiers) {
              projectTiers = await listTiers(target.id);
              setTiers(target.id, projectTiers);
            }
            if (projectTiers.length > 0) {
              setActiveTier(projectTiers[0].id);
              const vars = await listVariables(projectTiers[0].id);
              setVariables(vars);
            } else {
              setActiveTier(null);
              setVariables([]);
            }
          });
        }
      }

      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const { activeProjectId, activeTierId, tiers, setActiveTier, setVariables } = useProjectStore.getState();
        if (!activeProjectId) return;
        const projectTiers = tiers[activeProjectId] ?? [];
        if (projectTiers.length < 2) return;
        const currentIdx = projectTiers.findIndex((t) => t.id === activeTierId);
        const nextIdx = e.key === 'ArrowRight'
          ? (currentIdx + 1) % projectTiers.length
          : (currentIdx - 1 + projectTiers.length) % projectTiers.length;
        const nextTier = projectTiers[nextIdx];
        if (!nextTier) return;
        setActiveTier(nextTier.id);
        clearRevealed();
        import('@/lib/tauri').then(async ({ listVariables }) => {
          const vars = await listVariables(nextTier.id);
          setVariables(vars);
        });
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [locked, firstRun]);

  if (firstRun) return <SetupScreen />;
  if (locked) return <LockScreen />;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Titlebar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <MainPanel />
      </div>
      <StatusBar />


      <ProjectModal />
      <VariableModal />
      <ImportModal />
      <ExportDialog />
      <TierDiffView />
      <SettingsModal />
      <CommandPalette />


      <TourOverlay />
    </div>
  );
}
