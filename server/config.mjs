import path from 'node:path';

export const config = Object.freeze({
  host: process.env.JERRI_HOST ?? '127.0.0.1',
  port: Number(process.env.JERRI_PORT ?? 4747),
  dataDir: path.resolve(process.env.JERRI_DATA_DIR ?? 'data'),
  databaseFile: path.resolve(process.env.JERRI_DATA_DIR ?? 'data', 'jerri-finance.sqlite'),
  uploadLimitBytes: 10 * 1024 * 1024,
  authUser: process.env.JERRI_AUTH_USER ?? '',
  authPassword: process.env.JERRI_AUTH_PASSWORD ?? '',
  publicMode: process.env.JERRI_PUBLIC_MODE === 'true',
  commit: process.env.JERRI_COMMIT ?? 'unknown',
  environment: process.env.JERRI_ENV ?? (process.env.JERRI_PUBLIC_MODE === 'true' ? 'production' : 'development'),
});
