export interface TypeMeta {
  label: string;
  color: string;
  bg: string;
  validate: (v: string) => boolean;
}

export const VALUE_TYPES: Record<string, TypeMeta> = {
  url: {
    label: 'URL',
    color: 'var(--accent)',
    bg: 'var(--accent-sub)',
    validate: (v) => { try { new URL(v); return true; } catch { return false; } },
  },
  jwt: {
    label: 'JWT',
    color: '#93c5fd',
    bg: 'rgba(147,197,253,.1)',
    validate: (v) => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v),
  },
  hex: {
    label: 'Hex',
    color: 'var(--amber)',
    bg: 'var(--amber-sub)',
    validate: (v) => /^(0x)?[0-9a-fA-F]+$/.test(v),
  },
  uuid: {
    label: 'UUID',
    color: 'var(--green)',
    bg: 'var(--green-sub)',
    validate: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  },
  port: {
    label: 'Port',
    color: '#fca5a5',
    bg: 'rgba(252,165,165,.1)',
    validate: (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 65535; },
  },
  boolean: {
    label: 'Bool',
    color: 'var(--text-dim)',
    bg: 'var(--surface-hover)',
    validate: (v) => /^(true|false|1|0|yes|no)$/i.test(v),
  },
};
