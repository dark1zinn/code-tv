import { beforeAll, describe, expect, it } from 'bun:test';
import { S3Client } from 'bun';
import { StorageService } from './storage.service';

const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const bucket = process.env.S3_BUCKET ?? 'codetv-dev';
const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? 'rustfsadmin';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? 'rustfsadmin';

async function createBucketIfNeeded(client: S3Client): Promise<void> {
    try {
        await fetch(`${endpoint}/${bucket}`, { method: 'PUT' });
    } catch {
        // rustfs may not support this endpoint; first write may still succeed
    }
}

async function isS3Ready(): Promise<boolean> {
    try {
        const health = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(2000) });
        if (!health.ok) return false;

        const client = new S3Client({
            accessKeyId,
            secretAccessKey,
            endpoint,
            bucket,
            region: 'us-east-1',
        });

        await createBucketIfNeeded(client);

        const probeKey = `__probe-${Date.now()}`;
        await client.write(probeKey, 'ok');
        await client.delete(probeKey);
        return true;
    } catch {
        return false;
    }
}

const s3Ready = await isS3Ready();
const describeIfS3 = s3Ready ? describe : describe.skip;

describeIfS3('StorageService', () => {
    let service: StorageService;

    beforeAll(async () => {
        process.env.S3_ENDPOINT = endpoint;
        process.env.S3_BUCKET = bucket;
        process.env.S3_ACCESS_KEY_ID = accessKeyId;
        process.env.S3_SECRET_ACCESS_KEY = secretAccessKey;
        process.env.S3_REGION = 'us-east-1';

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
