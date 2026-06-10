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
import { ProfileModule } from './profile.module';

const tempDir = mkdtempSync(join(tmpdir(), 'codetv-profile-'));
const testDbPath = join(tempDir, 'test.db');
const testDb = createDatabase(testDbPath);

describe('ProfileController', () => {
    let app: NestExpressApplication;
    let port = 0;
    const testIp = '198.51.100.10';
    let ipHash = '';

    beforeAll(async () => {
        migrateDatabase(testDb);
        ipHash = await hashIpAddress(testIp);

        const moduleRef = await Test.createTestingModule({
            imports: [ProfileModule],
        })
            .overrideProvider(DATABASE)
            .useValue(testDb)
            .compile();

        app = moduleRef.createNestApplication();
        const identity = new IdentityMiddleware();
        app.use((req, res, next) => identity.use(req, res, next));
        await app.init();
        await app.listen(0);
        port = (app.getHttpServer().address() as { port: number }).port;
    });

    afterAll(async () => {
        await app.close();
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('creates Anon profile on first request', async () => {
        const response = await fetch(`http://127.0.0.1:${port}/_api/profile`, {
            headers: { 'x-forwarded-for': testIp },
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.ipAddress).toBe(ipHash);
        expect(body.username).toMatch(/^Anon-\d{4}$/);
    });

    it('updates updatedAt on subsequent requests', async () => {
        const first = await (
            await fetch(`http://127.0.0.1:${port}/_api/profile`, {
                headers: { 'x-forwarded-for': testIp },
            })
        ).json();

        await Bun.sleep(5);

        const second = await (
            await fetch(`http://127.0.0.1:${port}/_api/profile`, {
                headers: { 'x-forwarded-for': testIp },
            })
        ).json();

        expect(second.username).toBe(first.username);
        expect(new Date(second.updatedAt).getTime()).toBeGreaterThanOrEqual(
            new Date(first.updatedAt).getTime(),
        );
    });
});
