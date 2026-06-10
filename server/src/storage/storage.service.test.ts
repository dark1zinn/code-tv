import { beforeAll, describe, expect, it } from 'bun:test';
import { createS3Client, ensureBucket } from './s3-client';
import { StorageService } from './storage.service';

const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const bucket = process.env.S3_BUCKET ?? 'codetv-dev';
const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? 'rustfsadmin';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? 'rustfsadmin';

async function isS3Ready(): Promise<boolean> {
    try {
        const health = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(2000) });
        if (!health.ok) return false;

        process.env.S3_ENDPOINT = endpoint;
        process.env.S3_BUCKET = bucket;
        process.env.S3_ACCESS_KEY_ID = accessKeyId;
        process.env.S3_SECRET_ACCESS_KEY = secretAccessKey;
        process.env.S3_REGION = 'us-east-1';

        const s3 = createS3Client();
        await ensureBucket(s3);

        const probeKey = `__probe-${Date.now()}`;
        await s3.putObject(probeKey, 'ok', 'text/plain');
        await s3.deleteObject(probeKey);
        return true;
    } catch {
        return false;
    }
}

const s3Ready = await isS3Ready();
const describeIfS3 = s3Ready ? describe : describe.skip;

describeIfS3('StorageService', () => {
    let service: StorageService;
    let s3: ReturnType<typeof createS3Client>;

    beforeAll(() => {
        process.env.S3_ENDPOINT = endpoint;
        process.env.S3_BUCKET = bucket;
        process.env.S3_ACCESS_KEY_ID = accessKeyId;
        process.env.S3_SECRET_ACCESS_KEY = secretAccessKey;
        process.env.S3_REGION = 'us-east-1';

        s3 = createS3Client();
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
        expect(await s3.objectExists(s3Key)).toBe(false);
    });
});
