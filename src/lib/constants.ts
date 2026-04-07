export const PRESET_COLORS = [
  '#7C6AF7', '#6366F1', '#8B5CF6',
  '#EC4899', '#EF4444', '#F59E0B',
  '#22C55E', '#14B8A6', '#3B82F6',
  '#F97316', '#A855F7', '#06B6D4',
];

export const DEFAULT_TIER_NAMES = ['dev', 'staging', 'prod'];

export const VARIABLE_TEMPLATES = [
  { key: 'DATABASE_URL', value: 'postgres://user:password@localhost:5432/dbname', description: 'PostgreSQL connection string', is_secret: true },
  { key: 'REDIS_URL', value: 'redis://localhost:6379', description: 'Redis connection URL', is_secret: false },
  { key: 'PORT', value: '3000', description: 'Server port', is_secret: false },
  { key: 'NODE_ENV', value: 'development', description: 'Node environment', is_secret: false },
  { key: 'JWT_SECRET', value: '__generate__', description: 'JWT signing secret', is_secret: true },
  { key: 'API_KEY', value: '', description: 'External API key', is_secret: true },
  { key: 'SECRET_KEY', value: '__generate__', description: 'Application secret key', is_secret: true },
  { key: 'DEBUG', value: 'false', description: 'Enable debug mode', is_secret: false },
];

export const CODE_SNIPPETS: Record<string, (key: string, value: string) => string> = {
  'bash': (k, v) => `export ${k}="${v}"`,
  'powershell': (k, v) => `$env:${k} = "${v}"`,
  'python': (k, v) => `os.environ["${k}"] = "${v}"`,
  'csharp': (k, _v) => `Environment.GetEnvironmentVariable("${k}")`,
  'rust': (k, _v) => `std::env::var("${k}").unwrap()`,
  'node': (k, _v) => `process.env.${k}`,
};
