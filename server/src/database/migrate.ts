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
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            owner_ip TEXT NOT NULL REFERENCES profiles(ip_address) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Untitled Workspace',
            language TEXT NOT NULL DEFAULT 'typescript',
            updated_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS workspace_files (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            path TEXT NOT NULL,
            content TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS streams (
            id TEXT PRIMARY KEY,
            host_ip TEXT NOT NULL REFERENCES profiles(ip_address) ON DELETE CASCADE,
            workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
            title TEXT NOT NULL DEFAULT 'Untitled Stream',
            language TEXT NOT NULL DEFAULT 'typescript',
            s3_key TEXT,
            is_live INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL
        );
    `);

    const columns = db.$client
        .query<{ name: string }, []>('PRAGMA table_info(streams)')
        .all();
    const hasWorkspaceId = columns.some((col) => col.name === 'workspace_id');
    if (!hasWorkspaceId) {
        db.$client.exec(`ALTER TABLE streams ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL`);
    }
}
