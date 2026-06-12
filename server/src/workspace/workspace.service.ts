import {
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DATABASE } from '../database/database.module';
import { profiles, streams, workspaceFiles, workspaces } from '../database/schema';
import * as schema from '../database/schema';
import { DEFAULT_README_CONTENT, DEFAULT_README_PATH } from './default-files';
import {
    normalizeWorkspaceTags,
    parseWorkspaceTags,
    primaryEditorLanguage,
    serializeWorkspaceTags,
} from './workspace-tags';

export interface WorkspaceFileDto {
    path: string;
    content: string;
}

export interface WorkspaceDto {
    id: string;
    ownerIp: string;
    title: string;
    tags: string[];
    language: string;
    updatedAt: Date;
    createdAt: Date;
    files?: WorkspaceFileDto[];
}

export interface WorkspaceFilePathDto {
    path: string;
}

export interface WorkspaceViewerDto {
    workspaceId: string;
    isLive: boolean;
    streamId?: string;
    title: string;
    tags: string[];
    language: string;
    hostUsername?: string;
    files: WorkspaceFilePathDto[];
}

type WorkspaceRow = typeof workspaces.$inferSelect;

@Injectable()
export class WorkspaceService {
    constructor(@Inject(DATABASE) private readonly db: BunSQLiteDatabase<typeof schema>) {}

    async listForOwner(ownerIp: string): Promise<WorkspaceDto[]> {
        const rows = await this.db
            .select()
            .from(workspaces)
            .where(eq(workspaces.ownerIp, ownerIp))
            .orderBy(desc(workspaces.updatedAt));
        return rows.map((row) => this.toWorkspaceDto(row));
    }

    async create(ownerIp: string, input: { title?: string; tags?: string[] } = {}) {
        const id = crypto.randomUUID();
        const now = new Date();
        const tags = normalizeWorkspaceTags(input.tags);

        await this.db.insert(workspaces).values({
            id,
            ownerIp,
            title: input.title ?? 'Untitled Workspace',
            tags: serializeWorkspaceTags(tags),
            createdAt: now,
            updatedAt: now,
        });

        await this.db.insert(workspaceFiles).values({
            id: crypto.randomUUID(),
            workspaceId: id,
            path: DEFAULT_README_PATH,
            content: DEFAULT_README_CONTENT,
            updatedAt: now,
        });

        return this.getForOwner(ownerIp, id);
    }

    async getForOwner(ownerIp: string, workspaceId: string): Promise<WorkspaceDto> {
        const workspace = await this.getWorkspaceOrThrow(workspaceId);
        if (workspace.ownerIp !== ownerIp) {
            throw new ForbiddenException('Not your workspace');
        }

        const files = await this.db
            .select()
            .from(workspaceFiles)
            .where(eq(workspaceFiles.workspaceId, workspaceId));

        return {
            ...this.toWorkspaceDto(workspace),
            files: files.map((file) => ({ path: file.path, content: file.content })),
        };
    }

    async patchForOwner(
        ownerIp: string,
        workspaceId: string,
        input: {
            title?: string;
            tags?: string[];
            files?: WorkspaceFileDto[];
        },
    ) {
        await this.getForOwner(ownerIp, workspaceId);
        const now = new Date();
        const updates: Partial<typeof workspaces.$inferInsert> = { updatedAt: now };

        if (input.title !== undefined) updates.title = input.title.trim() || 'Untitled Workspace';
        if (input.tags !== undefined) {
            updates.tags = serializeWorkspaceTags(normalizeWorkspaceTags(input.tags));
        }

        if (Object.keys(updates).length > 1) {
            await this.db.update(workspaces).set(updates).where(eq(workspaces.id, workspaceId));
        }

        if (input.files) {
            const nextPaths = new Set(input.files.map((file) => file.path));
            const existingFiles = await this.db
                .select()
                .from(workspaceFiles)
                .where(eq(workspaceFiles.workspaceId, workspaceId));

            for (const existing of existingFiles) {
                if (!nextPaths.has(existing.path)) {
                    await this.db
                        .delete(workspaceFiles)
                        .where(eq(workspaceFiles.id, existing.id));
                }
            }

            for (const file of input.files) {
                const [existing] = await this.db
                    .select()
                    .from(workspaceFiles)
                    .where(
                        and(
                            eq(workspaceFiles.workspaceId, workspaceId),
                            eq(workspaceFiles.path, file.path),
                        ),
                    );

                if (existing) {
                    await this.db
                        .update(workspaceFiles)
                        .set({ content: file.content, updatedAt: now })
                        .where(eq(workspaceFiles.id, existing.id));
                } else {
                    await this.db.insert(workspaceFiles).values({
                        id: crypto.randomUUID(),
                        workspaceId,
                        path: file.path,
                        content: file.content,
                        updatedAt: now,
                    });
                }
            }
        }

        return this.getForOwner(ownerIp, workspaceId);
    }

    async getViewerContext(workspaceId: string): Promise<WorkspaceViewerDto> {
        const workspace = await this.getWorkspaceOrThrow(workspaceId);
        const tags = parseWorkspaceTags(workspace.tags);
        const language = primaryEditorLanguage(tags);

        const [liveStream] = await this.db
            .select()
            .from(streams)
            .where(and(eq(streams.workspaceId, workspaceId), eq(streams.isLive, true)))
            .orderBy(desc(streams.createdAt))
            .limit(1);

        if (liveStream) {
            const [host] = await this.db
                .select({ username: profiles.username })
                .from(profiles)
                .where(eq(profiles.ipAddress, liveStream.hostIp));

            const files = await this.getWorkspaceFilePaths(workspaceId);
            return {
                workspaceId,
                isLive: true,
                streamId: liveStream.id,
                title: workspace.title,
                tags,
                language,
                hostUsername: host?.username,
                files,
            };
        }

        const files = await this.getWorkspaceFilePaths(workspaceId);
        return {
            workspaceId,
            isLive: false,
            title: workspace.title,
            tags,
            language,
            files,
        };
    }

    async deleteForOwner(ownerIp: string, workspaceId: string) {
        await this.getForOwner(ownerIp, workspaceId);

        await this.db
            .update(streams)
            .set({ isLive: false })
            .where(and(eq(streams.workspaceId, workspaceId), eq(streams.isLive, true)));

        await this.db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }

    private toWorkspaceDto(row: WorkspaceRow): WorkspaceDto {
        const tags = parseWorkspaceTags(row.tags);
        return {
            id: row.id,
            ownerIp: row.ownerIp,
            title: row.title,
            tags,
            language: primaryEditorLanguage(tags),
            updatedAt: row.updatedAt,
            createdAt: row.createdAt,
        };
    }

    async getFileContent(workspaceId: string, path: string): Promise<{ path: string; content: string }> {
        await this.getWorkspaceOrThrow(workspaceId);
        const normalized = path.replace(/^\/+/, '');
        const [file] = await this.db
            .select()
            .from(workspaceFiles)
            .where(
                and(
                    eq(workspaceFiles.workspaceId, workspaceId),
                    eq(workspaceFiles.path, normalized),
                ),
            );
        if (!file) throw new NotFoundException('File not found');
        return { path: file.path, content: file.content };
    }

    private async getWorkspaceFilePaths(workspaceId: string): Promise<WorkspaceFilePathDto[]> {
        const files = await this.getWorkspaceFiles(workspaceId);
        return files.map((file) => ({ path: file.path }));
    }

    private async getWorkspaceFiles(workspaceId: string): Promise<WorkspaceFileDto[]> {
        const files = await this.db
            .select()
            .from(workspaceFiles)
            .where(eq(workspaceFiles.workspaceId, workspaceId));
        return files.map((file) => ({ path: file.path, content: file.content }));
    }

    private async getWorkspaceOrThrow(workspaceId: string) {
        const [workspace] = await this.db
            .select()
            .from(workspaces)
            .where(eq(workspaces.id, workspaceId));
        if (!workspace) throw new NotFoundException('Workspace not found');
        return workspace;
    }
}
