import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';

const defaultPath = new URL('../../data/codetv.db', import.meta.url).pathname;

export function createDatabase(dbPath = process.env.DATABASE_PATH ?? defaultPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.exec('PRAGMA foreign_keys = ON;');
    return drizzle(sqlite, { schema });
}

export const db = createDatabase();
