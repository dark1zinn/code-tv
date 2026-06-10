import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DATABASE } from '../database/database.module';
import { profiles } from '../database/schema';
import * as schema from '../database/schema';

export type ProfileRecord = typeof profiles.$inferSelect;

@Injectable()
export class ProfileService {
    constructor(@Inject(DATABASE) private readonly db: BunSQLiteDatabase<typeof schema>) {}

    private generateUsername() {
        return `Anon-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    async hydrate(ipHash: string): Promise<ProfileRecord> {
        const [existing] = await this.db
            .select()
            .from(profiles)
            .where(eq(profiles.ipAddress, ipHash));

        if (existing) {
            const now = new Date();
            await this.db
                .update(profiles)
                .set({ updatedAt: now })
                .where(eq(profiles.ipAddress, ipHash));
            return { ...existing, updatedAt: now };
        }

        const now = new Date();
        const username = this.generateUsername();
        await this.db.insert(profiles).values({
            ipAddress: ipHash,
            username,
            updatedAt: now,
            createdAt: now,
        });

        return {
            ipAddress: ipHash,
            username,
            githubLink: null,
            youtubeLink: null,
            updatedAt: now,
            createdAt: now,
        };
    }

    async updateProfile(
        ipHash: string,
        updates: Partial<Pick<ProfileRecord, 'username' | 'githubLink' | 'youtubeLink'>>,
    ): Promise<ProfileRecord> {
        const now = new Date();
        await this.db
            .update(profiles)
            .set({ ...updates, updatedAt: now })
            .where(eq(profiles.ipAddress, ipHash));

        const [profile] = await this.db
            .select()
            .from(profiles)
            .where(eq(profiles.ipAddress, ipHash));

        return profile;
    }
}
