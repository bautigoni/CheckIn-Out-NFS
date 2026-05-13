import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DATABASE_PATH, UPLOADS_DIR } from './config';

const DB_FILE = DATABASE_PATH
  ? path.resolve(DATABASE_PATH)
  : path.resolve(__dirname, '..', 'visitors.db');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(path.resolve(UPLOADS_DIR), { recursive: true });

export const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-create schema if missing.
db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    dni TEXT NOT NULL,
    sector TEXT NOT NULL,
    photoBase64 TEXT,
    entryTime TEXT NOT NULL,
    exitTime TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_visitors_exitTime ON visitors(exitTime);
  CREATE INDEX IF NOT EXISTS idx_visitors_entryTime ON visitors(entryTime);
  CREATE INDEX IF NOT EXISTS idx_visitors_dni ON visitors(dni);
  CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(lastName, firstName);
`);

export interface VisitorRow {
  id: number;
  firstName: string;
  lastName: string;
  dni: string;
  sector: string;
  photoBase64: string | null;
  entryTime: string;
  exitTime: string | null;
  createdAt: string;
}
