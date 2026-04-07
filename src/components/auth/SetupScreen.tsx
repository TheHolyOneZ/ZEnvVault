import React, { useState } from 'react';
import { setupMasterPassword } from '@/lib/tauri';
import { useAuthStore } from '@/store/authStore';
import { useTourStore } from '@/store/tourStore';
import { ZLogo } from '@/components/ui/ZLogo';
import { KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';

function strengthScore(pw: string): number {
  if (pw.length < 8) return 0;
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['', 'var(--red)', 'var(--amber)', 'var(--amber)', 'var(--green)'];

export function SetupScreen() {
  const [step, setStep] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const setLocked = useAuthStore((s) => s.setLocked);
  const setFirstRun = useAuthStore((s) => s.setFirstRun);
  const startTour = useTourStore((s) => s.start);

  const score = strengthScore(password);
  const mismatch = confirm && password !== confirm;

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) { setError('Password must be at least 12 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
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
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '28px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--r-lg)', background: 'rgba(245,166,35,0.15)',
            border: '1px solid rgba(245,166,35,0.3)',
            margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--amber)',
          }}><KeyRound size={22} strokeWidth={1.8} /></div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Save your recovery code</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '6px', maxWidth: 380 }}>
            This is shown <strong>once</strong>. If you ever forget your master password, enter this code to wipe the vault and start fresh.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            It cannot decrypt your data — it only lets you reset.
          </p>
        </div>

        <div style={{ width: 380 }}>
          
          <div style={{
            padding: '18px 20px', borderRadius: 'var(--r-lg)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            textAlign: 'center', marginBottom: '12px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 600,
              letterSpacing: '0.15em', color: 'var(--text)',
              userSelect: 'all',
            }}>
              {recoveryCode}
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            style={{
              width: '100%', padding: '9px', borderRadius: 'var(--r-md)',
              background: copied ? 'rgba(52,201,122,0.12)' : 'var(--surface-hover)',
              border: `1px solid ${copied ? 'var(--green)' : 'var(--border)'}`,
              color: copied ? 'var(--green)' : 'var(--text-dim)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              transition: 'all 150ms', marginBottom: '20px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              {copied ? <><Check size={13} strokeWidth={2.5} /> Copied to clipboard</> : <><Copy size={13} strokeWidth={1.8} /> Copy code</>}
            </span>
          </button>

          
          <div style={{
            padding: '12px 14px', borderRadius: 'var(--r-md)',
            background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
            marginBottom: '16px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}><AlertTriangle size={12} strokeWidth={2} /> Store this somewhere safe</strong>
            Write it down, save it in a password manager, or store it in a secure note. If you lose it and forget your master password, your data is unrecoverable.
          </div>

          
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ accentColor: 'var(--accent)', marginTop: '2px', flexShrink: 0 }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              I've saved my recovery code in a safe place
            </span>
          </label>

          <button
            onClick={handleEnterVault}
            disabled={!confirmed}
            style={{
              width: '100%', padding: '10px', borderRadius: 'var(--r-md)',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px',
              opacity: confirmed ? 1 : 0.4, cursor: confirmed ? 'pointer' : 'default',
              transition: 'opacity 150ms',
            }}
          >
            Enter vault →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Password creation ─────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '32px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <ZLogo size={56} style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Welcome to ZVault</h1>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.08em' }}>by TheHolyOneZ</p>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '6px', maxWidth: 340 }}>
          Create a master password to secure your vault.
        </p>
      </div>

      <form onSubmit={handleSetup} style={{ width: 340, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
            Master Password <span style={{ color: 'var(--text-muted)' }}>(min. 12 characters)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--surface-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text)',
            }}
            placeholder="Choose a strong password"
            autoFocus
          />
          {password && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1,2,3,4].map((i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: score >= i ? strengthColors[score] : 'var(--border)',
                    transition: 'background 200ms',
                  }} />
                ))}
              </div>
              {score > 0 && (
                <p style={{ fontSize: '11px', color: strengthColors[score], marginTop: '4px' }}>
                  {strengthLabels[score]}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--surface-input)',
              border: `1px solid ${mismatch ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text)',
            }}
            placeholder="Repeat password"
          />
        </div>

        {error && <p style={{ fontSize: '12px', color: 'var(--red)' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || password.length < 12 || password !== confirm}
          style={{
            padding: '10px', borderRadius: 'var(--r-md)',
            background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '14px',
            opacity: loading || password.length < 12 || password !== confirm ? 0.5 : 1,
          }}
        >
          {loading ? 'Securing vault…' : 'Create vault →'}
        </button>
      </form>
    </div>
  );
}
