import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
    ipAddress: text('ip_address').primaryKey(),
    username: text('username').default('Anonymous Coder').notNull(),
    githubLink: text('github_link'),
    youtubeLink: text('youtube_link'),
    chatColor: text('chat_color').default('#58a6ff').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date())
        .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date())
        .notNull(),
});

export const workspaces = sqliteTable('workspaces', {
    id: text('id').primaryKey(),
    ownerIp: text('owner_ip')
        .references(() => profiles.ipAddress, { onDelete: 'cascade' })
        .notNull(),
    title: text('title').default('Untitled Workspace').notNull(),
    tags: text('tags').default('["typescript"]').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date())
        .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date())
        .notNull(),
});

export const workspaceFiles = sqliteTable('workspace_files', {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
        .references(() => workspaces.id, { onDelete: 'cascade' })
        .notNull(),
    path: text('path').notNull(),
    content: text('content').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date())
        .notNull(),
});

export const streams = sqliteTable('streams', {
    id: text('id').primaryKey(),
    hostIp: text('host_ip')
        .references(() => profiles.ipAddress, { onDelete: 'cascade' })
        .notNull(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    title: text('title').default('Untitled Stream').notNull(),
    language: text('language').default('typescript').notNull(),
    s3Key: text('s3_key'),
    isLive: integer('is_live', { mode: 'boolean' }).default(true).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .$defaultFn(() => new Date())
        .notNull(),
});
