import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createDatabase } from '../database/db.provider';
import { DATABASE } from '../database/database.module';
import { migrateDatabase } from '../database/migrate';
import { IdentityMiddleware } from '../identity/identity.middleware';
import { hashIpAddress } from '../identity/ip-hash';
import { ProfileModule } from '../profile/profile.module';
import { StreamModule } from './stream.module';

const tempDir = mkdtempSync(join(tmpdir(), 'codetv-stream-'));
const testDbPath = join(tempDir, 'test.db');
const testDb = createDatabase(testDbPath);

beforeAll(() => {
    migrateDatabase(testDb);
});

async function createTestApp() {
    const moduleRef = await Test.createTestingModule({
        imports: [ProfileModule, StreamModule],
    })
        .overrideProvider(DATABASE)
        .useValue(testDb)
        .compile();

    const app = moduleRef.createNestApplication();
    const identity = new IdentityMiddleware();
    app.use((req, res, next) => identity.use(req, res, next));
    await app.init();
    await app.listen(0);
    const port = (app.getHttpServer().address() as { port: number }).port;
    return { app, port };
}

describe('StreamController', () => {
    let app: NestExpressApplication;
    let port = 0;
    const hostIp = '203.0.113.50';
    let hostHash = '';

    beforeAll(async () => {
        hostHash = await hashIpAddress(hostIp);
        const setup = await createTestApp();
        app = setup.app;
        port = setup.port;

        await fetch(`http://127.0.0.1:${port}/_api/profile`, {
            headers: { 'x-forwarded-for': hostIp },
        });
    });

    afterAll(async () => {
        await app.close();
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('creates a stream with a slug id', async () => {
        const response = await fetch(`http://127.0.0.1:${port}/_api/streams`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': hostIp,
            },
            body: JSON.stringify({ title: 'Live TS', language: 'typescript' }),
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.id).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
        expect(body.hostIp).toBe(hostHash);
        expect(body.isLive).toBe(true);
    });

    it('lists live streams', async () => {
        const response = await fetch(`http://127.0.0.1:${port}/_api/streams`);
        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
    });

    it('closes a live stream for the host', async () => {
        const createRes = await fetch(`http://127.0.0.1:${port}/_api/streams`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': hostIp,
            },
            body: JSON.stringify({ title: 'To Close', language: 'typescript' }),
        });
        const created = await createRes.json();

        const closeRes = await fetch(`http://127.0.0.1:${port}/_api/streams/${created.id}/close`, {
            method: 'POST',
            headers: { 'x-forwarded-for': hostIp },
        });
        expect(closeRes.status).toBe(201);
        const closed = await closeRes.json();
        expect(closed.streamId).toBe(created.id);

        const getRes = await fetch(`http://127.0.0.1:${port}/_api/streams/${created.id}`);
        const stream = await getRes.json();
        expect(stream.isLive).toBe(false);
    });
});
