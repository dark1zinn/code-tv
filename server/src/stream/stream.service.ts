import {
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DATABASE } from '../database/database.module';
import { profiles, streams, workspaces } from '../database/schema';
import * as schema from '../database/schema';
import {
    parseWorkspaceTags,
    primaryEditorLanguage,
} from '../workspace/workspace-tags';
import { generateStreamSlug } from './stream.utils';

@Injectable()
export class StreamService {
    constructor(@Inject(DATABASE) private readonly db: BunSQLiteDatabase<typeof schema>) {}

    async createStream(
        hostIp: string,
        input: { title?: string; language?: string; workspaceId?: string } = {},
        id = generateStreamSlug(),
    ) {
        let language = input.language ?? 'typescript';

        if (input.workspaceId) {
            const [workspace] = await this.db
                .select()
                .from(workspaces)
                .where(eq(workspaces.id, input.workspaceId));
            if (!workspace) throw new NotFoundException('Workspace not found');
            if (workspace.ownerIp !== hostIp) {
                throw new ForbiddenException('Not your workspace');
            }
            language = primaryEditorLanguage(parseWorkspaceTags(workspace.tags));

            const [existingLive] = await this.db
                .select()
                .from(streams)
                .where(and(eq(streams.hostIp, hostIp), eq(streams.isLive, true)));

            if (existingLive) {
                await this.endStream(existingLive.id, hostIp);
            }
        }

        const now = new Date();

        await this.db.insert(streams).values({
            id,
            hostIp,
            workspaceId: input.workspaceId ?? null,
            title: input.title ?? 'Untitled Stream',
            language,
            isLive: true,
            createdAt: now,
        });

        return this.getStream(id);
    }

    async getStream(id: string) {
        const [row] = await this.db
            .select({
                id: streams.id,
                hostIp: streams.hostIp,
                workspaceId: streams.workspaceId,
                title: streams.title,
                language: streams.language,
                s3Key: streams.s3Key,
                isLive: streams.isLive,
                createdAt: streams.createdAt,
                hostUsername: profiles.username,
            })
            .from(streams)
            .leftJoin(profiles, eq(streams.hostIp, profiles.ipAddress))
            .where(eq(streams.id, id));

        if (!row) throw new NotFoundException('Stream not found');
        return row;
    }

    async listLiveStreams() {
        return this.db
            .select({
                id: streams.id,
                hostIp: streams.hostIp,
                workspaceId: streams.workspaceId,
                title: streams.title,
                language: streams.language,
                s3Key: streams.s3Key,
                isLive: streams.isLive,
                createdAt: streams.createdAt,
                hostUsername: profiles.username,
            })
            .from(streams)
            .leftJoin(profiles, eq(streams.hostIp, profiles.ipAddress))
            .where(eq(streams.isLive, true))
            .orderBy(desc(streams.createdAt));
    }

    async assertHost(streamId: string, hostIp: string) {
        const stream = await this.getStream(streamId);
        if (stream.hostIp !== hostIp) {
            throw new ForbiddenException('Only the host can perform this action');
        }
        return stream;
    }

    async getLiveStreamForWorkspace(workspaceId: string) {
        const [stream] = await this.db
            .select()
            .from(streams)
            .where(and(eq(streams.workspaceId, workspaceId), eq(streams.isLive, true)))
            .orderBy(desc(streams.createdAt))
            .limit(1);
        return stream ?? null;
    }

    async endStream(streamId: string, hostIp: string) {
        const stream = await this.assertHost(streamId, hostIp);
        if (!stream.isLive) {
            return { streamId };
        }

        await this.db.update(streams).set({ isLive: false }).where(eq(streams.id, streamId));
        return { streamId };
    }
}
