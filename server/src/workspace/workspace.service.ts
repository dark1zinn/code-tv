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
import { StorageService } from '../storage/storage.service';

export interface WorkspaceFileDto {
    path: string;
    content: string;
}

export interface WorkspaceViewerDto {
    workspaceId: string;
    isLive: boolean;
    streamId?: string;
    title: string;
    language: string;
    hostUsername?: string;
    files: WorkspaceFileDto[];
}

@Injectable()
export class WorkspaceService {
    constructor(
        @Inject(DATABASE) private readonly db: BunSQLiteDatabase<typeof schema>,
        private readonly storageService: StorageService,
    ) {}

    async listForOwner(ownerIp: string) {
        return this.db
            .select()
            .from(workspaces)
            .where(eq(workspaces.ownerIp, ownerIp))
            .orderBy(desc(workspaces.updatedAt));
    }

    async create(ownerIp: string, input: { title?: string; language?: string } = {}) {
        const id = crypto.randomUUID();
        const now = new Date();

        await this.db.insert(workspaces).values({
            id,
            ownerIp,
            title: input.title ?? 'Untitled Workspace',
            language: input.language ?? 'typescript',
            createdAt: now,
            updatedAt: now,
        });

        await this.db.insert(workspaceFiles).values({
            id: crypto.randomUUID(),
            workspaceId: id,
            path: 'src/main.ts',
            content: 'export {}\n',
            updatedAt: now,
        });

        return this.getForOwner(ownerIp, id);
    }

    async getForOwner(ownerIp: string, workspaceId: string) {
        const workspace = await this.getWorkspaceOrThrow(workspaceId);
        if (workspace.ownerIp !== ownerIp) {
            throw new ForbiddenException('Not your workspace');
        }

        const files = await this.db
            .select()
            .from(workspaceFiles)
            .where(eq(workspaceFiles.workspaceId, workspaceId));

        return {
            ...workspace,
            files: files.map((file) => ({ path: file.path, content: file.content })),
        };
    }

    async patchForOwner(
        ownerIp: string,
        workspaceId: string,
        input: {
            title?: string;
            language?: string;
            files?: WorkspaceFileDto[];
        },
    ) {
        await this.getForOwner(ownerIp, workspaceId);
        const now = new Date();
        const updates: Partial<typeof workspaces.$inferInsert> = { updatedAt: now };

        if (input.title !== undefined) updates.title = input.title;
        if (input.language !== undefined) updates.language = input.language;

        if (Object.keys(updates).length > 1) {
            await this.db.update(workspaces).set(updates).where(eq(workspaces.id, workspaceId));
        }

        if (input.files) {
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

            const files = await this.getWorkspaceFiles(workspaceId);
            return {
                workspaceId,
                isLive: true,
                streamId: liveStream.id,
                title: workspace.title,
                language: workspace.language,
                hostUsername: host?.username,
                files,
            };
        }

        const [closedStream] = await this.db
            .select()
            .from(streams)
            .where(and(eq(streams.workspaceId, workspaceId), eq(streams.isLive, false)))
            .orderBy(desc(streams.createdAt))
            .limit(1);

        if (closedStream?.s3Key) {
            try {
                const archive = await this.storageService.getArchiveContent(closedStream.s3Key);
                const parsed = JSON.parse(archive) as {
                    files?: WorkspaceFileDto[];
                    language?: string;
                };
                if (parsed.files?.length) {
                    return {
                        workspaceId,
                        isLive: false,
                        title: workspace.title,
                        language: parsed.language ?? workspace.language,
                        files: parsed.files,
                    };
                }
            } catch {
                // fall through to workspace files
            }
        }

        const files = await this.getWorkspaceFiles(workspaceId);
        return {
            workspaceId,
            isLive: false,
            title: workspace.title,
            language: workspace.language,
            files,
        };
    }

    async getFilesForArchive(workspaceId: string): Promise<WorkspaceFileDto[]> {
        return this.getWorkspaceFiles(workspaceId);
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
