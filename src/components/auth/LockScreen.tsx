import React, { useState, useRef, useEffect } from 'react';
import { unlock, resetPasswordWithRecovery, wipeVault } from '@/lib/tauri';
import { useAuthStore } from '@/store/authStore';
import { ZLogo } from '@/components/ui/ZLogo';
import { KeyRound, TriangleAlert, Check, Eye, EyeOff } from 'lucide-react';

type View = 'unlock' | 'recovery-code' | 'wipe-confirm';

function Screen({ children, exiting }: { children: React.ReactNode; exiting?: boolean }) {
  return (
    <div
      className={`animate-lock-bg-in${exiting ? ' animate-lock-exit' : ''}`}
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
        width: 480, height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(124,106,247,0.13) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />

      <div
        className="animate-lock-content"
        style={{
          position: 'relative',
          width: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 0 0 1px rgba(124,106,247,0.06), inset 0 1px 0 rgba(255,255,255,0.05), var(--shadow-lg)',
          padding: '36px 40px 32px',
          display: 'flex', flexDirection: 'column', gap: 0,
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

export function LockScreen() {
  const [view, setView]   = useState<View>('unlock');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const [password, setPassword]           = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [recoveryCode, setRecoveryCode]   = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [wipePhrase, setWipePhrase]       = useState('');

  const [exiting, setExiting]   = useState(false);
  const [shaking, setShaking]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const setLocked   = useAuthStore((s) => s.setLocked);
  const setFirstRun = useAuthStore((s) => s.setFirstRun);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
    setError('');
  }, [view]);

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }

  function doExit(cb: () => void) {
    setExiting(true);
    setTimeout(cb, 480);
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true); setError('');
    try {
      await unlock(password);
      setSuccess(true);
      setTimeout(() => doExit(() => setLocked(false)), 320);
    } catch {
      setError('Incorrect password');
      setPassword('');
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 12) { setError('Password must be at least 12 characters'); return; }
    if (newPassword !== newPasswordConfirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await resetPasswordWithRecovery(recoveryCode, newPassword);
      doExit(() => setLocked(false));
    } catch {
      setError('Invalid recovery code — check it and try again');
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  async function handleWipe() {
    if (wipePhrase !== 'WIPE MY VAULT') return;
    setLoading(true); setError('');
    try {
      await wipeVault();
      doExit(() => setFirstRun(true));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setView('unlock');
    setError(''); setRecoveryCode(''); setNewPassword(''); setNewPasswordConfirm(''); setWipePhrase('');
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    background: 'var(--surface-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)', fontSize: '14px', color: 'var(--text)',
    outline: 'none', transition: 'border-color 180ms, box-shadow 180ms',
  };

  if (view === 'recovery-code') {
    const codeNorm = recoveryCode.replace(/[-\s]/g, '');
    const codeReady = codeNorm.length >= 16;
    const pwMismatch = newPasswordConfirm && newPassword !== newPasswordConfirm;

    return (
      <Screen exiting={exiting}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'var(--accent-sub)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
            <KeyRound size={20} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>Reset password</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 2 }}>Enter your recovery code, then choose a new password.</div>
          </div>
        </div>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <FieldLabel>Recovery code</FieldLabel>
            <input
              ref={inputRef}
              value={recoveryCode}
              onChange={(e) => { setRecoveryCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              className={shaking ? 'animate-shake' : ''}
              style={{ ...inputBase, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textAlign: 'center', fontSize: '15px', border: `1px solid ${error && !codeReady ? 'var(--red)' : 'var(--border)'}` }}
            />
          </div>

          <div>
            <FieldLabel>New master password <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', fontWeight: 400 }}>(min. 12 chars)</span></FieldLabel>
            <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              placeholder="Choose a strong password" style={inputBase} />
          </div>

          <div>
            <FieldLabel>Confirm new password</FieldLabel>
            <input type="password" value={newPasswordConfirm} onChange={(e) => { setNewPasswordConfirm(e.target.value); setError(''); }}
              placeholder="Repeat new password" style={{ ...inputBase, border: `1px solid ${pwMismatch ? 'var(--red)' : 'var(--border)'}` }} />
          </div>

          {error && <p style={{ fontSize: '12px', color: 'var(--red)', textAlign: 'center', margin: 0 }}>{error}</p>}

          <button type="submit"
            disabled={loading || !codeReady || newPassword.length < 12 || newPassword !== newPasswordConfirm}
            style={{ marginTop: 4, padding: '11px', borderRadius: 'var(--r-md)', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px', transition: 'opacity 150ms', opacity: loading || !codeReady || newPassword.length < 12 || newPassword !== newPasswordConfirm ? 0.4 : 1 }}>
            {loading ? 'Resetting…' : 'Reset password & unlock'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
            <button type="button" onClick={goBack} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
            <button type="button" onClick={() => setView('wipe-confirm')} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}>Lost recovery code too?</button>
          </div>
        </form>
      </Screen>
    );
  }

  if (view === 'wipe-confirm') {
    const confirmed = wipePhrase === 'WIPE MY VAULT';
    return (
      <Screen exiting={exiting}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0 }}>
            <TriangleAlert size={20} strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em', color: 'var(--red)' }}>Start completely fresh</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 2 }}>Your encrypted data is unrecoverable. This wipes everything.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.18)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Type <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>WIPE MY VAULT</code> to confirm
          </div>
          <input
            ref={inputRef}
            value={wipePhrase}
            onChange={(e) => setWipePhrase(e.target.value.toUpperCase())}
            placeholder="WIPE MY VAULT"
            style={{ ...inputBase, border: `1px solid ${confirmed ? 'rgba(255,69,58,0.5)' : 'var(--border)'}`, fontFamily: 'var(--font-mono)', textAlign: 'center', letterSpacing: '0.1em' }}
          />
          {error && <p style={{ fontSize: '12px', color: 'var(--red)', textAlign: 'center', margin: 0 }}>{error}</p>}
          <button onClick={handleWipe} disabled={loading || !confirmed}
            style={{ padding: '11px', borderRadius: 'var(--r-md)', background: confirmed ? 'var(--red)' : 'var(--surface-hover)', color: '#fff', fontWeight: 600, fontSize: '14px', opacity: loading || !confirmed ? 0.5 : 1, transition: 'all 150ms' }}>
            {loading ? 'Wiping…' : 'Wipe everything & start fresh'}
          </button>
          <button onClick={() => setView('recovery-code')} style={{ padding: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← I found my recovery code
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen exiting={exiting}>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div className="animate-logo-float" style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            background: success
              ? 'radial-gradient(circle, rgba(52,201,122,0.25) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(124,106,247,0.22) 0%, transparent 70%)',
            filter: 'blur(6px)',
            transition: 'background 500ms ease',
            pointerEvents: 'none',
          }} />
          <ZLogo
            size={64}
            radius="var(--r-xl)"
            background={success ? 'var(--green)' : 'var(--accent)'}
            style={{ transition: 'background 400ms ease', boxShadow: success ? '0 4px 20px rgba(52,201,122,0.35)' : '0 4px 20px rgba(124,106,247,0.3)' }}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>ZVault</h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.07em' }}>by TheHolyOneZ</p>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />

      <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <FieldLabel>Master password</FieldLabel>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter your master password"
              className={shaking ? 'animate-shake' : ''}
              style={{
                ...inputBase,
                paddingRight: 42,
                border: `1px solid ${error ? 'var(--red)' : success ? 'var(--green)' : 'var(--border)'}`,
                boxShadow: success
                  ? '0 0 0 3px rgba(52,201,122,0.15)'
                  : error
                  ? '0 0 0 3px rgba(255,69,58,0.12)'
                  : 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center',
                transition: 'color 150ms',
              }}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
            </button>
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: 7, margin: '7px 0 0', animation: 'fadeUp 180ms ease both' }}>
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password || success}
          className={success ? 'animate-success-ring' : ''}
          style={{
            marginTop: 6,
            padding: '11px',
            borderRadius: 'var(--r-md)',
            background: success ? 'var(--green)' : 'var(--accent)',
            color: '#fff', fontWeight: 600, fontSize: '14px',
            opacity: !password && !success ? 0.5 : 1,
            transition: 'background 300ms, opacity 150ms, transform 100ms',
            transform: loading ? 'scale(0.99)' : 'scale(1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {success ? (
            <><Check size={15} strokeWidth={2.5} /> Unlocked</>
          ) : loading ? (
            <>
              <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite', flexShrink: 0 }} />
              Unlocking…
            </>
          ) : (
            'Unlock'
          )}
        </button>
      </form>

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => { setView('recovery-code'); setPassword(''); setError(''); }}
          style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 150ms' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Forgot your password?
        </button>
      </div>

    </Screen>
  );
}
