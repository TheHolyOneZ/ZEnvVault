import React, { useState, useRef, useEffect } from 'react';
import { unlock, resetPasswordWithRecovery, wipeVault } from '@/lib/tauri';
import { useAuthStore } from '@/store/authStore';
import { ZLogo } from '@/components/ui/ZLogo';
import { KeyRound, TriangleAlert } from 'lucide-react';

type View =
  | 'unlock'
  | 'recovery-code'      
  | 'recovery-success'   
  | 'wipe-confirm';      

export function LockScreen() {
  const [view, setView] = useState<View>('unlock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  
  const [password, setPassword] = useState('');

  
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  
  const [wipePhrase, setWipePhrase] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const setLocked = useAuthStore((s) => s.setLocked);
  const setFirstRun = useAuthStore((s) => s.setFirstRun);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
    setError('');
  }, [view]);

  
  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true); setError('');
    try {
      await unlock(password);
      setLocked(false);
    } catch {
      setError('Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 12) { setError('New password must be at least 12 characters'); return; }
    if (newPassword !== newPasswordConfirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await resetPasswordWithRecovery(recoveryCode, newPassword);
      setLocked(false); 
    } catch {
      setError('Invalid recovery code — check it and try again');
    } finally {
      setLoading(false);
    }
  }

  
  async function handleWipe() {
    if (wipePhrase !== 'WIPE MY VAULT') return;
    setLoading(true); setError('');
    try {
      await wipeVault();
      setFirstRun(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setView('unlock');
    setError('');
    setRecoveryCode('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setWipePhrase('');
  }

  const shell: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column', gap: '24px', zIndex: 500,
  };

  
  if (view === 'recovery-code') {
    const codeNorm = recoveryCode.replace(/[-\s]/g, '');
    const codeReady = codeNorm.length >= 16;
    const pwMismatch = newPasswordConfirm && newPassword !== newPasswordConfirm;

    return (
      <div style={shell}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: 'var(--accent-sub)', border: '1px solid var(--accent-border)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><KeyRound size={22} strokeWidth={1.8} /></div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Reset your password</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.6 }}>
            Enter your recovery code and choose a new master password.<br/>
            <strong>All your data is preserved.</strong>
          </p>
        </div>

        <form onSubmit={handleReset} style={{ width: 360, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
              Recovery code
            </label>
            <input
              ref={inputRef}
              value={recoveryCode}
              onChange={(e) => { setRecoveryCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--surface-input)',
                border: `1px solid ${error && !codeReady ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', fontSize: '14px', color: 'var(--text)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textAlign: 'center',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
              New master password <span style={{ color: 'var(--text-muted)' }}>(min. 12 chars)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              placeholder="Choose a strong password"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--surface-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
              Confirm new password
            </label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => { setNewPasswordConfirm(e.target.value); setError(''); }}
              placeholder="Repeat new password"
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--surface-input)',
                border: `1px solid ${pwMismatch ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text)',
              }}
            />
          </div>

          {error && <p style={{ fontSize: '12px', color: 'var(--red)', textAlign: 'center' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !codeReady || newPassword.length < 12 || newPassword !== newPasswordConfirm}
            style={{
              padding: '10px', borderRadius: 'var(--r-md)',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px',
              opacity: loading || !codeReady || newPassword.length < 12 || newPassword !== newPasswordConfirm ? 0.4 : 1,
            }}
          >{loading ? 'Resetting…' : 'Reset password & unlock'}</button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={goBack}
              style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Back
            </button>
            <button type="button" onClick={() => setView('wipe-confirm')}
              style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}>
              Lost recovery code too?
            </button>
          </div>
        </form>
      </div>
    );
  }

  
  if (view === 'wipe-confirm') {
    const confirmed = wipePhrase === 'WIPE MY VAULT';
    return (
      <div style={shell}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.3)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}><TriangleAlert size={24} strokeWidth={1.8} /></div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--red)' }}>Start completely fresh</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px', lineHeight: 1.6 }}>
            Since you've lost both your master password and recovery code, <strong>your encrypted data is mathematically unrecoverable</strong>. No one can help — not us, not anyone.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.6 }}>
            You can wipe the vault and start fresh with a new password.
          </p>
        </div>

        <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', fontSize: '12px', color: 'var(--text-muted)' }}>
            Type <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>WIPE MY VAULT</code> to confirm
          </div>
          <input
            ref={inputRef}
            value={wipePhrase}
            onChange={(e) => setWipePhrase(e.target.value.toUpperCase())}
            placeholder="WIPE MY VAULT"
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--surface-input)',
              border: `1px solid ${confirmed ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text)',
              fontFamily: 'var(--font-mono)', textAlign: 'center', letterSpacing: '0.08em',
            }}
          />
          {error && <p style={{ fontSize: '12px', color: 'var(--red)', textAlign: 'center' }}>{error}</p>}
          <button
            onClick={handleWipe}
            disabled={loading || !confirmed}
            style={{
              padding: '10px', borderRadius: 'var(--r-md)',
              background: confirmed ? 'var(--red)' : 'var(--surface-hover)',
              color: '#fff', fontWeight: 600, fontSize: '14px',
              opacity: loading || !confirmed ? 0.5 : 1, transition: 'all 150ms',
            }}
          >{loading ? 'Wiping…' : 'Wipe everything & start fresh'}</button>
          <button onClick={() => setView('recovery-code')}
            style={{ padding: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← I found my recovery code
          </button>
        </div>
      </div>
    );
  }

  // ── View: normal unlock (default) ─────────────────────────────────────────────
  return (
    <div style={shell}>
      <div style={{ textAlign: 'center' }}>
        <ZLogo size={56} style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>ZVault</h1>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.08em' }}>by TheHolyOneZ</p>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px' }}>Enter your master password to continue</p>
      </div>

      <form onSubmit={handleUnlock} style={{ width: 300, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Master password"
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--surface-input)',
              border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', fontSize: '14px', color: 'var(--text)',
              textAlign: 'center', letterSpacing: '0.1em', transition: 'border-color 100ms',
            }}
          />
          {error && <p style={{ fontSize: '12px', color: 'var(--red)', textAlign: 'center', marginTop: '6px' }}>{error}</p>}
        </div>

        <button type="submit" disabled={loading || !password}
          style={{ padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px', opacity: loading || !password ? 0.6 : 1, transition: 'opacity 100ms' }}>
          {loading ? 'Unlocking…' : 'Unlock'}
        </button>

        <button type="button" onClick={() => { setView('recovery-code'); setPassword(''); setError(''); }}
          style={{ padding: '6px', fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}>
          Forgot password?
        </button>
      </form>
    </div>
  );
}
