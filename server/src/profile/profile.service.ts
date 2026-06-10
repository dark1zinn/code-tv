import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { DATABASE } from '../database/database.module';
import { profiles } from '../database/schema';
import * as schema from '../database/schema';
import {
    DEFAULT_CHAT_COLOR,
    normalizeChatColor,
    normalizeOptionalLink,
} from './profile.utils';

export type ProfileRecord = typeof profiles.$inferSelect;

export interface ProfileUpdateInput {
    username?: string;
    githubLink?: string | null;
    youtubeLink?: string | null;
    chatColor?: string;
}

@Injectable()
export class ProfileService {
    constructor(@Inject(DATABASE) private readonly db: BunSQLiteDatabase<typeof schema>) {}

    private generateUsername() {
        return `Anon-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    async getProfile(ipHash: string): Promise<ProfileRecord | null> {
        const [profile] = await this.db
            .select()
            .from(profiles)
            .where(eq(profiles.ipAddress, ipHash));
        return profile ?? null;
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
            chatColor: DEFAULT_CHAT_COLOR,
            updatedAt: now,
            createdAt: now,
        };
    }

    async updateProfile(ipHash: string, updates: ProfileUpdateInput): Promise<ProfileRecord> {
        await this.hydrate(ipHash);
        const now = new Date();
        const patch: Partial<typeof profiles.$inferInsert> = { updatedAt: now };

        if (updates.username !== undefined) {
            const trimmed = updates.username.trim();
            patch.username = trimmed.length > 0 ? trimmed : 'Anonymous Coder';
        }
        if (updates.githubLink !== undefined) {
            patch.githubLink = normalizeOptionalLink(updates.githubLink);
        }
        if (updates.youtubeLink !== undefined) {
            patch.youtubeLink = normalizeOptionalLink(updates.youtubeLink);
        }
        if (updates.chatColor !== undefined) {
            patch.chatColor = normalizeChatColor(updates.chatColor);
        }

        await this.db.update(profiles).set(patch).where(eq(profiles.ipAddress, ipHash));

        const profile = await this.getProfile(ipHash);
        if (!profile) throw new Error('Profile missing after update');
        return profile;
    }
}
