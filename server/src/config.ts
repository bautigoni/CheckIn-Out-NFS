/**
 * Centralized server config. Override via environment variables in production.
 */
export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
export const DATABASE_PATH = process.env.DATABASE_PATH;
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? 'uploads';

// Admin credentials — change these in prod via env vars.
export const ADMIN_USER = process.env.ADMIN_USER ?? 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

// Salt for token derivation. Rotating this invalidates all existing admin sessions.
export const ADMIN_TOKEN_SALT =
  process.env.SESSION_SECRET ?? process.env.ADMIN_TOKEN_SALT ?? 'proyecto-entrada-dev-salt';
