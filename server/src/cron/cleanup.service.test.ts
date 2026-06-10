import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createDatabase } from '../database/db.provider';
import { migrateDatabase } from '../database/migrate';
import { profiles, streams } from '../database/schema';
import { CleanupService } from './cleanup.service';

class MockStorageService {
    deleted: string[] = [];
    async uploadArchive() {
        return 'key';
    }
    async deleteArchive(s3Key: string) {
        this.deleted.push(s3Key);
    }
    async getArchiveContent() {
        return '';
    }
}

const tempDir = mkdtempSync(join(tmpdir(), 'codetv-cleanup-'));
const testDb = createDatabase(join(tempDir, 'test.db'));

describe('CleanupService', () => {
    const storage = new MockStorageService();
    const service = new CleanupService(
        testDb,
        storage as unknown as import('../storage/storage.service').StorageService,
    );

    beforeAll(() => {
        migrateDatabase(testDb);
    });

    afterAll(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('deletes expired profiles, streams, and s3 archives', async () => {
        const expired = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        const ipHash = 'expired-profile-hash';

        await testDb.insert(profiles).values({
            ipAddress: ipHash,
            username: 'Anon-9999',
            updatedAt: expired,
            createdAt: expired,
        });

        await testDb.insert(streams).values({
            id: 'expired-stream',
            hostIp: ipHash,
            title: 'Old',
            language: 'typescript',
            s3Key: 'pastes/expired-stream/code_snapshot.json',
            isLive: false,
            createdAt: expired,
        });

        await service.runCleanup();

        const remainingProfiles = await testDb.select().from(profiles);
        expect(remainingProfiles.find((p) => p.ipAddress === ipHash)).toBeUndefined();
        expect(storage.deleted).toContain('pastes/expired-stream/code_snapshot.json');
    });
});
