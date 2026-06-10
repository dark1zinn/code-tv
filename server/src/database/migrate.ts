import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

export function migrateDatabase(db: BunSQLiteDatabase<typeof schema>) {
    db.$client.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            ip_address TEXT PRIMARY KEY,
            username TEXT NOT NULL DEFAULT 'Anonymous Coder',
            github_link TEXT,
            youtube_link TEXT,
            updated_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS streams (
            id TEXT PRIMARY KEY,
            host_ip TEXT NOT NULL REFERENCES profiles(ip_address) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Untitled Stream',
            language TEXT NOT NULL DEFAULT 'typescript',
            s3_key TEXT,
            is_live INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL
        );
    `);
}
