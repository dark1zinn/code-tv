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
import { DEFAULT_README_CONTENT, DEFAULT_README_PATH } from './default-files';
import { WorkspaceModule } from './workspace.module';

const tempDir = mkdtempSync(join(tmpdir(), 'codetv-workspace-'));
const testDbPath = join(tempDir, 'test.db');
const testDb = createDatabase(testDbPath);

beforeAll(() => {
    migrateDatabase(testDb);
});

async function createTestApp() {
    const moduleRef = await Test.createTestingModule({
        imports: [ProfileModule, WorkspaceModule],
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

describe('WorkspaceController', () => {
    let app: NestExpressApplication;
    let port = 0;
    const hostIp = '203.0.113.60';
    let hostHash = '';
    let workspaceId = '';

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

    it('creates and lists workspaces for owner', async () => {
        const createRes = await fetch(`http://127.0.0.1:${port}/_api/workspaces`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': hostIp,
            },
            body: JSON.stringify({ title: 'My Project' }),
        });
        expect(createRes.status).toBe(201);
        const created = await createRes.json();
        workspaceId = created.id;
        expect(created.title).toBe('My Project');
        expect(created.tags).toEqual(['typescript']);
        expect(created.files).toHaveLength(1);
        expect(created.files[0]?.path).toBe(DEFAULT_README_PATH);
        expect(created.files[0]?.content).toBe(DEFAULT_README_CONTENT);

        const listRes = await fetch(`http://127.0.0.1:${port}/_api/workspaces`, {
            headers: { 'x-forwarded-for': hostIp },
        });
        const list = await listRes.json();
        expect(list.some((w: { id: string }) => w.id === workspaceId)).toBe(true);
    });

    it('patches title and tags for owner', async () => {
        const response = await fetch(`http://127.0.0.1:${port}/_api/workspaces/${workspaceId}`, {
            method: 'PATCH',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': hostIp,
            },
            body: JSON.stringify({
                title: 'Renamed Project',
                tags: ['rust', 'tokio', 'wasm'],
            }),
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.title).toBe('Renamed Project');
        expect(body.tags).toEqual(['rust', 'tokio', 'wasm']);
        expect(body.language).toBe('rust');
    });

    it('deletes workspace for owner', async () => {
        const createRes = await fetch(`http://127.0.0.1:${port}/_api/workspaces`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-for': hostIp,
            },
            body: JSON.stringify({ title: 'Disposable' }),
        });
        const created = await createRes.json();

        const deleteRes = await fetch(`http://127.0.0.1:${port}/_api/workspaces/${created.id}`, {
            method: 'DELETE',
            headers: { 'x-forwarded-for': hostIp },
        });
        expect(deleteRes.status).toBe(204);

        const getRes = await fetch(`http://127.0.0.1:${port}/_api/workspaces/${created.id}`, {
            headers: { 'x-forwarded-for': hostIp },
        });
        expect(getRes.status).toBe(404);
    });

    it('returns viewer context publicly', async () => {
        const response = await fetch(
            `http://127.0.0.1:${port}/_api/workspaces/${workspaceId}/viewer`,
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.workspaceId).toBe(workspaceId);
        expect(body.isLive).toBe(false);
        expect(body.files.length).toBeGreaterThan(0);
        expect(body.files[0]?.path).toBeDefined();
        expect(body.files[0]?.content).toBeUndefined();
    });

    it('returns a single saved file for viewers', async () => {
        const response = await fetch(
            `http://127.0.0.1:${port}/_api/workspaces/${workspaceId}/file?path=${encodeURIComponent(DEFAULT_README_PATH)}`,
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.path).toBe(DEFAULT_README_PATH);
        expect(body.content).toBe(DEFAULT_README_CONTENT);
    });
});
