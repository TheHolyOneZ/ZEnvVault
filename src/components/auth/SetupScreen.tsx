import React, { useState } from 'react';
import { setupMasterPassword } from '@/lib/tauri';
import { useAuthStore } from '@/store/authStore';
import { useTourStore } from '@/store/tourStore';
import { ZLogo } from '@/components/ui/ZLogo';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import { KeyRound, Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="animate-lock-bg-in"
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 500,
        background: `
          radial-gradient(circle at 50% 45%, rgba(124,106,247,0.07) 0%, transparent 60%),
          radial-gradient(circle, rgba(255,255,255,0.028) 1px, transparent 1px)
        `,
        backgroundColor: 'var(--bg)',
        backgroundSize: 'auto, 22px 22px',
      }}
    >
      <div style={{
        position: 'absolute',
        width: 480, height: 320, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(124,106,247,0.13) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      <div
        className="animate-lock-content"
        style={{
          position: 'relative',
          width: 420,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 0 0 1px rgba(124,106,247,0.06), inset 0 1px 0 rgba(255,255,255,0.05), var(--shadow-lg)',
          padding: '36px 40px 32px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
      {children}
    </label>
  );
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'var(--surface-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-md)', fontSize: '14px', color: 'var(--text)',
  outline: 'none', transition: 'border-color 180ms, box-shadow 180ms',
};

export function SetupScreen() {
  const [step, setStep] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copied, setCopied]     = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const setLocked   = useAuthStore((s) => s.setLocked);
  const setFirstRun = useAuthStore((s) => s.setFirstRun);
  const startTour   = useTourStore((s) => s.start);

  const mismatch = confirm && password !== confirm;

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) { setError('Password must be at least 12 characters'); return; }
    if (password !== confirm)  { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const code = await setupMasterPassword(password);
      setRecoveryCode(code);
      setStep('recovery');
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleEnterVault() {
    setFirstRun(false);
    setLocked(false);
    startTour();
  }

  if (step === 'recovery') {
    return (
      <Screen>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)', flexShrink: 0 }}>
            <KeyRound size={20} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>Save your recovery code</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 2 }}>
              Shown <strong>once</strong>. Lose it and forget your password — data is gone forever.
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 20px', borderRadius: 'var(--r-lg)', background: 'var(--surface-input)', border: '1px solid var(--border)', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 600, letterSpacing: '0.18em', color: 'var(--text)', userSelect: 'all' }}>
            {recoveryCode}
          </div>
        </div>

        <button onClick={handleCopyCode} style={{ width: '100%', padding: '9px', borderRadius: 'var(--r-md)', background: copied ? 'rgba(52,201,122,0.1)' : 'var(--surface-hover)', border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`, color: copied ? 'var(--green)' : 'var(--text-dim)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {copied ? <><Check size={13} strokeWidth={2.5} /> Copied</> : <><Copy size={13} strokeWidth={1.8} /> Copy code</>}
        </button>

        <div style={{ padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.22)', marginBottom: 16, fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.65 }}>
          <strong style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <AlertTriangle size={12} strokeWidth={2} /> Store this somewhere safe
          </strong>
          Write it down or save it in a password manager. If you lose this <em>and</em> your master password, your data is mathematically unrecoverable.
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ accentColor: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>I've saved my recovery code in a safe place</span>
        </label>

        <button onClick={handleEnterVault} disabled={!confirmed} style={{ width: '100%', padding: '11px', borderRadius: 'var(--r-md)', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px', opacity: confirmed ? 1 : 0.4, cursor: confirmed ? 'pointer' : 'default', transition: 'opacity 150ms' }}>
          Enter vault →
        </button>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div className="animate-logo-float" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,106,247,0.22) 0%, transparent 70%)', filter: 'blur(6px)', pointerEvents: 'none' }} />
          <ZLogo size={64} radius="var(--r-xl)" style={{ boxShadow: '0 4px 20px rgba(124,106,247,0.3)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Welcome to ZVault</h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.07em' }}>by TheHolyOneZ</p>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />

      <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <FieldLabel>Master password <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', fontWeight: 400 }}>(min. 12 chars)</span></FieldLabel>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Choose a strong password"
              autoFocus
              style={{ ...inputBase, paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}>
              {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <PasswordStrengthMeter password={password} />
          </div>
        </div>

        <div>
          <FieldLabel>Confirm password</FieldLabel>
          <div style={{ position: 'relative' }}>
            <input
              type={showCf ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              placeholder="Repeat password"
              style={{ ...inputBase, paddingRight: 42, border: `1px solid ${mismatch ? 'var(--red)' : 'var(--border)'}` }}
            />
            <button type="button" onClick={() => setShowCf(v => !v)} tabIndex={-1}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}>
              {showCf ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {error && <p style={{ fontSize: '12px', color: 'var(--red)', margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading || password.length < 12 || password !== confirm}
          style={{ marginTop: 4, padding: '11px', borderRadius: 'var(--r-md)', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px', opacity: loading || password.length < 12 || password !== confirm ? 0.5 : 1, transition: 'opacity 150ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? (
            <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite', flexShrink: 0 }} /> Securing vault…</>
          ) : 'Create vault →'}
        </button>
      </form>
    </Screen>
  );
}
