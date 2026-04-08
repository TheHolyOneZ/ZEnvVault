import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTourStore, TourStepId, STEP_ORDER } from '@/store/tourStore';
import { useUiStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { ZLogo } from '@/components/ui/ZLogo';

interface Rect { x: number; y: number; width: number; height: number }
type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface StepDef {
  id: TourStepId;
  target: string | null;
  placement: Placement;
  title: string;
  body: React.ReactNode;
  primaryLabel?: string;
  onEnter?: () => void;
}

const PAD  = 8;
const TIP_W = 310;
const GAP  = 14;

export function TourOverlay() {
  const { active, step, next, skip, goTo } = useTourStore();
  const openModal = useUiStore((s) => s.openModal);
  const closeModal = useUiStore((s) => s.closeModal);
  const modal = useUiStore((s) => s.modal);
  const projects = useProjectStore((s) => s.projects);
  const activeTierId = useProjectStore((s) => s.activeTierId);

  const [spotRect, setSpotRect] = useState<Rect | null>(null);
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });


  const prevModal   = useRef<string | null>(null);
  const prevProjCnt = useRef(projects.length);
  const prevTierId  = useRef(activeTierId);


  const stepDefs: StepDef[] = [
    {
      id: 'welcome',
      target: null,
      placement: 'center',
      title: 'Welcome to ZVault',
      body: (
        <>
          <p>Your vault is set up. Let me show you around — right inside the actual UI.</p>
          <p style={{ marginTop: 8, fontSize: '12px', color: 'var(--text-muted)' }}>
            You can interact with anything normally. Follow the steps or skip whenever.
          </p>
        </>
      ),
      primaryLabel: "Let's go →",
    },
    {
      id: 'sidebar-projects',
      target: 'sidebar-projects',
      placement: 'right',
      title: 'Projects',
      body: (
        <p>
          This sidebar lists your projects. Each project holds environments (dev, prod…) and all their secrets.
          <br/><br/>
          Click <strong style={{ color: 'var(--accent)' }}>+</strong> or the button below to create your first project.
        </p>
      ),
      primaryLabel: 'Create first project →',
    },
    {
      id: 'new-project-modal',
      target: 'project-modal',
      placement: 'right',
      title: 'New project',
      body: <p>Give it a name and a color — then hit <strong style={{ color: 'var(--accent)' }}>Create project</strong>. The tour will continue automatically when you're done.</p>,
      onEnter: () => openModal('project'),
    },
    {
      id: 'env-tabs',
      target: 'main-env-tabs',
      placement: 'bottom',
      title: 'Environments',
      body: (
        <p>
          Environments separate your variables by context —{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>development</code>,{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>staging</code>,{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>production</code>.
          <br/><br/>
          Click <strong style={{ color: 'var(--accent)' }}>+</strong> in the tab bar to add one now.
        </p>
      ),
      primaryLabel: 'Next →',
      onEnter: () => closeModal(),
    },
    {
      id: 'variable-table',
      target: 'main-var-table',
      placement: 'top',
      title: 'Variable table',
      body: (
        <>
          <p>Each row is one encrypted key-value pair. Values are blurred by default — click the eye icon or press <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '0 4px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 3 }}>Space</kbd> to reveal.</p>
          <p style={{ marginTop: 8 }}>Let's add your first variable.</p>
        </>
      ),
      primaryLabel: 'Add variable →',
      onEnter: () => closeModal(),
    },
    {
      id: 'new-variable-modal',
      target: 'variable-modal',
      placement: 'left',
      title: 'New variable',
      body: <p>Enter a <strong>KEY</strong> and its <strong>value</strong>. Check <em>Secret</em> for sensitive values — they'll be extra-blurred in the table. Hit <strong style={{ color: 'var(--accent)' }}>Save</strong> when done.</p>,
      onEnter: () => openModal('variable'),
    },
    {
      id: 'shortcuts',
      target: 'titlebar-logo',
      placement: 'bottom',
      title: "You're all set!",
      body: (
        <>
          <p style={{ marginBottom: 10 }}>A few shortcuts to bookmark:</p>
          {[
            ['Ctrl+K', 'Search everything'],
            ['Ctrl+N', 'New variable'],
            ['Ctrl+I', 'Import .env'],
            ['Ctrl+L', 'Lock vault'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '1px 7px', borderRadius: 4, background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', flexShrink: 0 }}>{k}</kbd>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', paddingLeft: 10 }}>{v}</span>
            </div>
          ))}
        </>
      ),
      primaryLabel: 'Enter vault →',
      onEnter: () => closeModal(),
    },
    { id: 'done', target: null, placement: 'center', title: '', body: null },
  ];

  const currentDef = stepDefs.find((s) => s.id === step);
  const stepIndex  = STEP_ORDER.indexOf(step);

  // ── Measure spotlight target ─────────────────────────────────────────────────
  const measureTarget = useCallback(() => {
    if (!currentDef?.target) { setSpotRect(null); return; }
    const el = document.querySelector(`[data-tour="${currentDef.target}"]`);
    if (!el) { setSpotRect(null); return; }
    const r = el.getBoundingClientRect();
    setSpotRect({ x: r.left, y: r.top, width: r.width, height: r.height });
  }, [currentDef?.target, step]);

  useLayoutEffect(() => { measureTarget(); }, [measureTarget, active]);

  useEffect(() => {
    const onResize = () => {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
      measureTarget();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [measureTarget]);

  // Poll for target element (modals render asynchronously)
  useEffect(() => {
    if (!active || !currentDef?.target) return;
    const id = setInterval(measureTarget, 100);
    return () => clearInterval(id);
  }, [active, currentDef?.target, measureTarget]);

  // ── onEnter when step changes ────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !currentDef) return;
    currentDef.onEnter?.();
  }, [step, active]);

  // ── Auto-advance on real user interactions ───────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const wasProject  = prevModal.current === 'project'  && modal === null;
    const wasTier     = prevModal.current === 'tier'     && modal === null;
    const wasVariable = prevModal.current === 'variable' && modal === null;

    if (step === 'new-project-modal' && wasProject && projects.length > prevProjCnt.current) {
      goTo('env-tabs');
    }
    if (step === 'new-variable-modal' && wasVariable) {
      goTo('shortcuts');
    }

    prevModal.current   = modal;
    prevProjCnt.current = projects.length;
    prevTierId.current  = activeTierId;
  }, [modal, projects.length, activeTierId, step, active]);

  // ── Primary button ───────────────────────────────────────────────────────────
  function handlePrimary() {
    switch (step) {
      case 'sidebar-projects':  goTo('new-project-modal'); break;
      case 'variable-table':    goTo('new-variable-modal'); break;
      case 'shortcuts':         skip(); break;
      default:                  next(); break;
    }
  }

  if (!active || step === 'done') {
    // "Done" celebration badge
    if (step === 'done' && active) {
      return ReactDOM.createPortal(
        <div style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--green)',
          borderRadius: 'var(--r-lg)', padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 10, zIndex: 910,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'tour-fade-in 250ms ease-out',
          fontSize: '13px', color: 'var(--text)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Tour complete — you're all set!
          <style>{`@keyframes tour-fade-in { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
        </div>,
        document.body
      );
    }
    return null;
  }

  // ── Geometry ─────────────────────────────────────────────────────────────────
  const { w: W, h: H } = winSize;
  const sx = spotRect ? spotRect.x - PAD : 0;
  const sy = spotRect ? spotRect.y - PAD : 0;
  const sw = spotRect ? spotRect.width  + PAD * 2 : 0;
  const sh = spotRect ? spotRect.height + PAD * 2 : 0;

  const placement = currentDef?.placement ?? 'center';

  // Tooltip position
  let tipStyle: React.CSSProperties = {};
  if (!spotRect || placement === 'center') {
    tipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TIP_W };
  } else {
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    switch (placement) {
      case 'right':
        tipStyle = { position: 'fixed', left: sx + sw + GAP, top: Math.max(8, cy - 100), width: TIP_W };
        break;
      case 'left':
        tipStyle = { position: 'fixed', right: W - sx + GAP, top: Math.max(8, cy - 100), width: TIP_W };
        break;
      case 'bottom':
        tipStyle = { position: 'fixed', top: sy + sh + GAP, left: Math.max(8, Math.min(cx - TIP_W / 2, W - TIP_W - 8)), width: TIP_W };
        break;
      case 'top': default:
        tipStyle = { position: 'fixed', bottom: H - sy + GAP, left: Math.max(8, Math.min(cx - TIP_W / 2, W - TIP_W - 8)), width: TIP_W };
        break;
    }
    // Clamp horizontal within viewport
    if (typeof tipStyle.left === 'number') tipStyle.left = Math.max(8, Math.min(tipStyle.left, W - TIP_W - 8));
  }

  const visibleSteps = STEP_ORDER.slice(0, STEP_ORDER.length - 1); // exclude 'done'

  const fadeKf = placement === 'center'
    ? `@keyframes tour-fade-in { from { opacity:0; transform:translate(-50%,-48%); } to { opacity:1; transform:translate(-50%,-50%); } }`
    : `@keyframes tour-fade-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }`;

  return ReactDOM.createPortal(
    <>
      {/* Overlay + spotlight */}
      <svg style={{ position: 'fixed', inset: 0, width: W, height: H, zIndex: 900, pointerEvents: 'none' }}>
        <defs>
          <mask id="ev-tour-mask">
            <rect x={0} y={0} width={W} height={H} fill="white"/>
            {spotRect && <rect x={sx} y={sy} width={sw} height={sh} rx={8} fill="black"/>}
          </mask>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="rgba(0,0,0,0.6)" mask="url(#ev-tour-mask)"/>
        {/* Accent ring around spotlight */}
        {spotRect && (
          <rect x={sx-1} y={sy-1} width={sw+2} height={sh+2} rx={9}
            fill="none" stroke="rgba(124,106,247,0.7)" strokeWidth="1.5"/>
        )}
      </svg>

      {/* Pointer-event blocker — disabled when a modal is open (modal lives at z-index 1000) */}
      {!modal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 901 }}
          onMouseDown={(e) => {
            if (!spotRect) return;
            const { clientX: x, clientY: y } = e;
            if (x >= sx && x <= sx+sw && y >= sy && y <= sy+sh) return; // let through spotlight
            e.stopPropagation();
          }}
        />
      )}

      {/* Tooltip — above modal backdrop when modal is open */}
      <div style={{
        ...tipStyle,
        zIndex: modal ? 1001 : 902,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        fontSize: '13px',
        color: 'var(--text-dim)',
        lineHeight: 1.65,
        animation: 'tour-fade-in 160ms ease-out',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {step === 'welcome' && <ZLogo size={24} radius="6px"/>}
          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', flex: 1, letterSpacing: '-0.01em' }}>
            {currentDef?.title}
          </span>
          <button onClick={skip} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, flexShrink: 0 }}>
            Skip
          </button>
        </div>

        {/* Body */}
        <div style={{ marginBottom: 14 }}>{currentDef?.body}</div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
            {visibleSteps.map((s, i) => (
              <div key={s} style={{
                width: i === stepIndex ? 14 : 5, height: 5, borderRadius: 3,
                background: i === stepIndex
                  ? 'var(--accent)'
                  : i < stepIndex ? 'rgba(124,106,247,0.4)' : 'var(--border)',
                transition: 'all 220ms',
              }}/>
            ))}
          </div>

          {/* Action */}
          {currentDef?.primaryLabel ? (
            <button onClick={handlePrimary} style={{
              padding: '6px 14px', borderRadius: 'var(--r-md)',
              background: 'var(--accent)', color: '#fff',
              fontWeight: 600, fontSize: '12px', cursor: 'pointer', flexShrink: 0,
            }}>
              {currentDef.primaryLabel}
            </button>
          ) : (
            <button onClick={next} style={{
              padding: '5px 12px', borderRadius: 'var(--r-md)',
              background: 'var(--surface-hover)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', flexShrink: 0,
            }}>
              Skip step
            </button>
          )}
        </div>
      </div>

      <style>{fadeKf}</style>
    </>,
    document.body,
  );
}
