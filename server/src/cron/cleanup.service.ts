import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, lt } from 'drizzle-orm';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DATABASE } from '../database/database.module';
import { profiles, streams } from '../database/schema';
import * as schema from '../database/schema';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CleanupService {
    constructor(
        @Inject(DATABASE) private readonly db: BunSQLiteDatabase<typeof schema>,
        private readonly storageService: StorageService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async handleGarbageCollection() {
        await this.runCleanup();
    }

    async runCleanup() {
        const expirationThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        const expiredProfiles = await this.db
            .select()
            .from(profiles)
            .where(lt(profiles.updatedAt, expirationThreshold));

        for (const profile of expiredProfiles) {
            const structuralStreams = await this.db
                .select()
                .from(streams)
                .where(eq(streams.hostIp, profile.ipAddress));

            for (const stream of structuralStreams) {
                if (stream.s3Key) {
                    await this.storageService.deleteArchive(stream.s3Key);
                }
            }

            await this.db.delete(profiles).where(eq(profiles.ipAddress, profile.ipAddress));
        }
    }
}
