// Centralised, environment-driven configuration.
// Reading config in one place keeps the rest of the codebase free of `process.env`
// and makes it trivial to swap providers or buckets via `.env`.

// Trim every env var on read — defends against trailing spaces in .env files,
// which silently produced "NoSuchBucket" errors in the wild.
const env = (key) => (process.env[key] || '').trim() || undefined;

const required = (key) => {
  const value = env(key);
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

const provider = (env('LLM_PROVIDER') || 'anthropic').toLowerCase();

// Storage backend: `local` (filesystem) or `s3`. Default to `local` for
// development unless AWS credentials are explicitly provided — keeps the
// "git clone → npm run dev" path zero-config.
const explicitBackend = (env('STORAGE_BACKEND') || '').toLowerCase();
const storageBackend =
  explicitBackend || (env('AWS_ACCESS_KEY_ID') && env('S3_BUCKET') ? 's3' : 'local');

const config = {
  env: env('NODE_ENV') || 'development',
  port: parseInt(env('PORT') || '3000', 10),
  logLevel: env('LOG_LEVEL') || 'info',

  aws: {
    region: env('AWS_REGION') || 'us-east-1',
    accessKeyId: env('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
  },

  // Path keys live on `storage` because they apply to both backends — the
  // same folder names are used for the local FS layout. The S3-specific
  // section below only carries bucket info.
  storage: {
    backend: storageBackend,
    localDir: env('LOCAL_STORAGE_DIR') || './storage',
    resumePrefix: env('S3_RESUME_PREFIX') || 'resumes/',
    metadataPrefix: env('S3_METADATA_PREFIX') || 'metadata/',
    shortlistKey: env('S3_SHORTLIST_KEY') || 'shortlist/shortlist.json',
  },

  s3: {
    bucket: env('S3_BUCKET') || 'ai-hiring-assistant',
  },

  llm: {
    provider,
    maxRetries: parseInt(env('LLM_MAX_RETRIES') || '3', 10),
    timeoutMs: parseInt(env('LLM_TIMEOUT_MS') || '60000', 10),
    anthropic: {
      apiKey: env('ANTHROPIC_API_KEY'),
      model: env('ANTHROPIC_MODEL') || 'claude-sonnet-4-6',
    },
    openai: {
      apiKey: env('OPENAI_API_KEY'),
      model: env('OPENAI_MODEL') || 'gpt-4o-mini',
    },
    gemini: {
      apiKey: env('GEMINI_API_KEY'),
      model: env('GEMINI_MODEL') || 'gemini-2.5-flash',
    },
  },

  hiring: {
    shortlistThreshold: parseInt(env('SHORTLIST_THRESHOLD') || '70', 10),
  },

  smtp: {
    host: env('SMTP_HOST'),
    port: parseInt(env('SMTP_PORT') || '587', 10),
    secure: (env('SMTP_SECURE') || 'false').toLowerCase() === 'true',
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
    from: env('SMTP_FROM') || env('SMTP_USER'),
  },
};

// Surface missing keys early in production so we don't fail mid-request.
config.assertReady = () => {
  if (config.env === 'production') {
    if (storageBackend === 's3') {
      required('AWS_ACCESS_KEY_ID');
      required('AWS_SECRET_ACCESS_KEY');
      required('S3_BUCKET');
    }
    if (provider === 'anthropic') required('ANTHROPIC_API_KEY');
    if (provider === 'openai') required('OPENAI_API_KEY');
    if (provider === 'gemini') required('GEMINI_API_KEY');
  }
};

module.exports = config;
