import { beforeAll, describe, expect, it } from 'bun:test';
import { S3Client } from 'bun';
import { StorageService } from './storage.service';

const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const bucket = process.env.S3_BUCKET ?? 'codetv-dev';
const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? 'rustfsadmin';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? 'rustfsadmin';

async function isRustfsReachable(): Promise<boolean> {
    try {
        const response = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(2000) });
        return response.ok;
    } catch {
        return false;
    }
}

const rustfsUp = await isRustfsReachable();
const describeIfRustfs = rustfsUp ? describe : describe.skip;

describeIfRustfs('StorageService', () => {
    let service: StorageService;

    beforeAll(async () => {
        process.env.S3_ENDPOINT = endpoint;
        process.env.S3_BUCKET = bucket;
        process.env.S3_ACCESS_KEY_ID = accessKeyId;
        process.env.S3_SECRET_ACCESS_KEY = secretAccessKey;
        process.env.S3_REGION = 'us-east-1';

        const client = new S3Client({
            accessKeyId,
            secretAccessKey,
            endpoint,
            bucket,
            region: 'us-east-1',
        });

        try {
            await client.write('.keep', '', { type: 'text/plain' });
        } catch {
            // bucket may already exist or auto-create on first write
        }

        service = new StorageService();
    });

    it('uploads, reads, and deletes an archive', async () => {
        const streamId = `test-${Date.now()}`;
        const payload = JSON.stringify({ code: 'console.log("hi")' });

        const s3Key = await service.uploadArchive(streamId, payload);
        expect(s3Key).toBe(`pastes/${streamId}/code_snapshot.json`);

        const content = await service.getArchiveContent(s3Key);
        expect(content).toBe(payload);

        await service.deleteArchive(s3Key);
        const client = new S3Client({
            accessKeyId,
            secretAccessKey,
            endpoint,
            bucket,
            region: 'us-east-1',
        });
        expect(await client.exists(s3Key)).toBe(false);
    });
});
