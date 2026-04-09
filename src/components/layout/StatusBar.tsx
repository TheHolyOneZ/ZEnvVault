import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useConfigStore } from '@/store/configStore';
import { Lock } from 'lucide-react';

function fmtRemaining(secs: number): string {
  if (secs <= 0) return '0s';
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function StatusBar() {
  const projects      = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeTierId  = useProjectStore((s) => s.activeTierId);
  const tiers         = useProjectStore((s) => s.tiers);
  const variables     = useProjectStore((s) => s.variables);
  const config        = useConfigStore((s) => s.config);

  const [remaining, setRemaining] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  const autoLockSecs   = config.auto_lock_minutes * 60;
  const showCountdown  = config.show_lock_countdown && config.auto_lock_minutes > 0;

  useEffect(() => {
    const update = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', update, { passive: true });
    window.addEventListener('keydown',   update, { passive: true });
    window.addEventListener('click',     update, { passive: true });
    return () => {
      window.removeEventListener('mousemove', update);
      window.removeEventListener('keydown',   update);
      window.removeEventListener('click',     update);
    };
  }, []);

  useEffect(() => {
    if (!showCountdown) { setRemaining(null); return; }
    lastActivityRef.current = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setRemaining(Math.max(0, autoLockSecs - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showCountdown, autoLockSecs]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeTier    = activeProjectId
    ? (tiers[activeProjectId] ?? []).find((t) => t.id === activeTierId)
    : undefined;

  const isUrgent = remaining !== null && remaining <= 60;
  const isWarning = remaining !== null && remaining <= 300 && remaining > 60;

  return (
    <div style={{
      height: 'var(--statusbar-h)', background: 'rgba(8,8,9,0.8)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 14px',
      gap: '12px', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0,
    }}>
      {activeProject ? (
        <>
          <span>{activeProject.name}</span>
          {activeTier && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{activeTier.name}</span>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span>{variables.length} variable{variables.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </>
      ) : (
        <span>No project selected</span>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showCountdown && remaining !== null && (
          <span
            title={`Auto-locks after ${config.auto_lock_minutes} minute${config.auto_lock_minutes !== 1 ? 's' : ''} of inactivity`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: isUrgent ? 'var(--red)' : isWarning ? 'var(--amber)' : 'var(--text-muted)',
              transition: 'color 500ms',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Lock size={10} strokeWidth={2.2} />
            {fmtRemaining(remaining)}
          </span>
        )}

        <span>ZVault v0.4.0</span>
      </div>
    </div>
  );
}
