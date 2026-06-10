import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DATABASE } from '../database/database.module';
import { streams } from '../database/schema';
import * as schema from '../database/schema';
import { generateStreamSlug } from './stream.utils';

@Injectable()
export class StreamService {
    constructor(@Inject(DATABASE) private readonly db: BunSQLiteDatabase<typeof schema>) {}

    async createStream(
        hostIp: string,
        input: { title?: string; language?: string } = {},
        id = generateStreamSlug(),
    ) {
        const now = new Date();

        await this.db.insert(streams).values({
            id,
            hostIp,
            title: input.title ?? 'Untitled Stream',
            language: input.language ?? 'typescript',
            isLive: true,
            createdAt: now,
        });

        const [stream] = await this.db.select().from(streams).where(eq(streams.id, id));
        return stream;
    }

    async getStream(id: string) {
        const [stream] = await this.db.select().from(streams).where(eq(streams.id, id));
        if (!stream) throw new NotFoundException('Stream not found');
        return stream;
    }

    async listLiveStreams() {
        return this.db.select().from(streams).where(eq(streams.isLive, true));
    }

    async assertHost(streamId: string, hostIp: string) {
        const stream = await this.getStream(streamId);
        if (stream.hostIp !== hostIp) {
            throw new ForbiddenException('Only the host can perform this action');
        }
        return stream;
    }

    async closeStream(streamId: string, s3Key: string) {
        await this.db
            .update(streams)
            .set({ isLive: false, s3Key })
            .where(eq(streams.id, streamId));
    }
}
