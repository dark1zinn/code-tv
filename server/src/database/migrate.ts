import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

export function migrateDatabase(db: BunSQLiteDatabase<typeof schema>) {
    db.$client.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            ip_address TEXT PRIMARY KEY,
            username TEXT NOT NULL DEFAULT 'Anonymous Coder',
            github_link TEXT,
            youtube_link TEXT,
            chat_color TEXT NOT NULL DEFAULT '#58a6ff',
            updated_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            owner_ip TEXT NOT NULL REFERENCES profiles(ip_address) ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT 'Untitled Workspace',
            tags TEXT NOT NULL DEFAULT '["typescript"]',
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

    const streamColumns = db.$client
        .query<{ name: string }, []>('PRAGMA table_info(streams)')
        .all();
    const hasWorkspaceId = streamColumns.some((col) => col.name === 'workspace_id');
    if (!hasWorkspaceId) {
        db.$client.exec(`ALTER TABLE streams ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL`);
    }

    const profileColumns = db.$client
        .query<{ name: string }, []>('PRAGMA table_info(profiles)')
        .all();
    const hasChatColor = profileColumns.some((col) => col.name === 'chat_color');
    if (!hasChatColor) {
        db.$client.exec(
            `ALTER TABLE profiles ADD COLUMN chat_color TEXT NOT NULL DEFAULT '#58a6ff'`,
        );
    }

    const workspaceColumns = db.$client
        .query<{ name: string }, []>('PRAGMA table_info(workspaces)')
        .all();
    const hasTags = workspaceColumns.some((col) => col.name === 'tags');
    if (!hasTags) {
        db.$client.exec(
            `ALTER TABLE workspaces ADD COLUMN tags TEXT NOT NULL DEFAULT '["typescript"]'`,
        );
        if (workspaceColumns.some((col) => col.name === 'language')) {
            db.$client.exec(`UPDATE workspaces SET tags = json_array(language)`);
        }
    }
}
