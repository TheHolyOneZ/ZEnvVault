export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

export function scorePassword(password: string): StrengthResult {
  if (!password) return { score: 0, label: '', color: 'var(--border)' };

  let score = 0;

  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (password.length >= 24) score++;

  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (/(.)\1{2,}/.test(password)) score--;
  if (/^(123|abc|qwerty|password)/i.test(password)) score -= 2;

  const clamped = Math.max(0, Math.min(4, Math.round(score / 2))) as 0 | 1 | 2 | 3 | 4;

  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Very weak', color: 'var(--red)' },
    1: { label: 'Weak',      color: 'var(--red)' },
    2: { label: 'Fair',      color: 'var(--amber)' },
    3: { label: 'Strong',    color: 'var(--green)' },
    4: { label: 'Very strong', color: 'var(--green)' },
  };

  return { score: clamped, ...map[clamped] };
}
