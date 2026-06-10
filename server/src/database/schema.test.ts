import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createDatabase } from './db.provider';
import { migrateDatabase } from './migrate';
import { profiles, streams } from './schema';

const tempDir = mkdtempSync(join(tmpdir(), 'codetv-schema-'));
const testDbPath = join(tempDir, 'test.db');
const db = createDatabase(testDbPath);

beforeAll(() => {
    migrateDatabase(db);
});

afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
});

describe('schema', () => {
    it('inserts and selects profile and stream rows', async () => {
        const ipHash = 'abc123hash';

        await db.insert(profiles).values({
            ipAddress: ipHash,
            username: 'Anon-1234',
            updatedAt: new Date(),
            createdAt: new Date(),
        });

        const [profile] = await db.select().from(profiles).where(eq(profiles.ipAddress, ipHash));
        expect(profile?.username).toBe('Anon-1234');

        await db.insert(streams).values({
            id: 'alpha-foxtrot-compile',
            hostIp: ipHash,
            title: 'Test Stream',
            language: 'typescript',
            isLive: true,
            createdAt: new Date(),
        });

        const [stream] = await db.select().from(streams).where(eq(streams.id, 'alpha-foxtrot-compile'));
        expect(stream?.hostIp).toBe(ipHash);
        expect(stream?.isLive).toBe(true);
    });
});
