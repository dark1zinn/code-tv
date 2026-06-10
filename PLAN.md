# SYSTEM ARCHITECTURE SPECIFICATION: codeTV

## 1. Directory Structure & Monorepo Topography

```text
codeTV/
├── package.json
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── FileExplorer.tsx
│       │   ├── CodeEditor.tsx
│       │   └── LiveChat.tsx
│       └── hooks/
│           └── useSocket.ts
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── database/
    │   │   ├── db.provider.ts
    │   │   └── schema.ts
    │   ├── storage/
    │   │   └── storage.service.ts
    │   ├── profile/
    │   ├── stream/
    │   ├── gateway/
    │   │   └── stream.gateway.ts
    │   └── cron/
    │       └── cleanup.service.ts
    └── data/

```

### Monorepo Manifest (`/package.json`)

```json
{
  "name": "codetv-workspace",
  "private": true,
  "workspaces": [
    "web",
    "server"
  ],
  "scripts": {
    "dev:server": "bun --filter server dev",
    "dev:web": "bun --filter web dev",
    "build:web": "bun --filter web build",
    "build:server": "bun --filter server build",
    "compile": "bun run build:web && bun run build:server",
    "start": "bun --filter server start"
  }
}

```

---

## 2. Networking, Routing Boundaries & Proxies

### API & Static Assets Routing Table

* **Production Port:** `3000` (Unified Bun process)
* **Asset Boundaries:**
* Routes starting with `/_api/*` $\rightarrow$ Target: NestJS REST Controllers.
* Routes starting with `/socket.io/*` $\rightarrow$ Target: NestJS Socket.io WebSocket Server.
* Fallback Route `/*` $\rightarrow$ Target: Vite Static SPA Index Router (`web/dist/index.html`).



### Development Environment Network Proxy Configuration (`web/vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/_api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});

```

### Production Static Server Ingestion (`server/src/app.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
      exclude: ['/_api*'],
    }),
  ],
})
export class AppModule {}

```

---

## 3. Storage Layer & Relational Schema (Drizzle ORM + SQLite)

### Schema Definitions (`server/src/database/schema.ts`)

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  ipAddress: text('ip_address').primaryKey(), // SHA-256 string signature of the raw client IP
  username: text('username').default('Anonymous Coder').notNull(),
  githubLink: text('github_link'),
  youtubeLink: text('youtube_link'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(new Date()).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()).notNull(),
});

export const streams = sqliteTable('streams', {
  id: text('id').primaryKey(), // Unique alpha-numeric slug token (e.g. "alpha-foxtrot-compile")
  hostIp: text('host_ip').references(() => profiles.ipAddress, { onDelete: 'cascade' }).notNull(),
  title: text('title').default('Untitled Stream').notNull(),
  language: text('language').default('typescript').notNull(),
  s3Key: text('s3_key'), // Target object marker within rustfs storage cluster
  isLive: integer('is_live', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()).notNull(),
});

```

---

## 4. Native Bun Runtime Storage Layer (rustfs / S3 Integration)

Instead of utilizing external npm SDKs, the system hooks directly into the native Bun storage layer via the compiled-in Zig `S3Client` driver. This handles internal file management, writes, and deletion loops on the `rustfs` instance.

### Native Driver Setup (`server/src/storage/storage.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { S3Client } from 'bun';

@Injectable()
export class StorageService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT_URL, // Points directly to rustfs endpoint
      bucket: process.env.S3_BUCKET_NAME,
      region: process.env.S3_REGION ?? 'us-east-1',
    });
  }

  /**
   * Persists a code collection snapshot into rustfs
   */
  async uploadArchive(streamId: string, fileContent: string): Promise<string> {
    const s3Key = `pastes/${streamId}/code_snapshot.json`;
    const s3File = this.s3Client.file(s3Key);
    
    // Leverage Bun's fast native string-to-S3 ingestion path
    await s3File.write(fileContent);
    return s3Key;
  }

  /**
   * Drops code assets directly out of the rustfs cluster
   */
  async deleteArchive(s3Key: string): Promise<void> {
    const s3File = this.s3Client.file(s3Key);
    if (await s3File.exists()) {
      await s3File.delete();
    }
  }

  /**
   * Reads code snapshots back into system runtimes
   */
  async getArchiveContent(s3Key: string): Promise<string> {
    const s3File = this.s3Client.file(s3Key);
    return await s3File.text();
  }
}

```

---

## 5. Unauthenticated Identity Matrix & Garbage Collection

### Execution Path: Identity Extraction & Hydration Guard

1. Client establishes connection $\rightarrow$ Backend parses `x-forwarded-for` falling back to `request.socket.remoteAddress`.
2. Compute cryptographic signature: `crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawIp))`.
3. Check `profiles` table matching computed hash value.
* **Hit:** Update `updatedAt` database row value to `new Date()`. Return identity state arrays.
* **Miss:** Populate a new database record: `username: 'Anon-' + Math.floor(1000 + Math.random() * 9000)`, `ipAddress: computedHash`.



### Automated Active Lifecycle Eviction Loop (`server/src/cron/cleanup.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, lt } from 'drizzle-orm';
import { db } from '../database/db.provider';
import { profiles, streams } from '../database/schema';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CleanupService {
  constructor(private readonly storageService: StorageService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleGarbageCollection() {
    const expirationThreshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 Days Total TTL

    // Locate expired user profile identities
    const expiredProfiles = await db
      .select()
      .from(profiles)
      .where(lt(profiles.updatedAt, expirationThreshold));

    for (const profile of expiredProfiles) {
      // Trace structural files inside rustfs storage cluster
      const structuralStreams = await db
        .select()
        .from(streams)
        .where(eq(streams.hostIp, profile.ipAddress));

      for (const stream of structuralStreams) {
        if (stream.s3Key) {
          await this.storageService.deleteArchive(stream.s3Key);
        }
      }

      // Cascading relational table deletion removes profiles and dependent streams
      await db.delete(profiles).where(eq(profiles.ipAddress, profile.ipAddress));
    }
  }
}

```

---

## 6. State Layer Real-Time Coordination Gateway Protocol (Socket.io)

### Volatile In-Memory Storage Layout Matrix

```typescript
type MessagePayload = { sender: string; text: string; timestamp: number };
// Volatile cluster tracking state managed directly inside Gateway instance memory allocations
const EphemeralChatBuffer = new Map<string, MessagePayload[]>(); // RoomSlug -> Max 50 tracking items

```

### Transaction Boundary Intercept Protocols

```text
[Host Client]              [NestJS Socket Gateway Gateway]             [Viewer Client]
      |                                   |                                   |
      |--- room:create (RoomSlug) ------->|                                   |
      |                                   |--- Instantiates Ephemeral Buffer  |
      |                                   |                                   |
      |                                   |<-- room:join (RoomSlug) ----------|
      |                                   |=== Sends existing Chat Buffer ===>|
      |                                   |                                   |
      |--- code:stream (Payload) -------->|                                   |
      |                                   |--- broadcast: room \ Host --------|
      |                                   |==================================>| [Processes diff / updates cursor]
      |                                   |                                   |
      |                                   |<-- chat:send (Message text) ------|
      |                                   |--- Appends to 50-item cache       |
      |                                   |--- broadcast: whole room -------->|
      |                                   |<==================================| [Appends message viewport view]
      |                                   |                                   |
      |--- room:close ------------------->|                                   |
      |                                   |--- Commits Final buffer to S3    |
      |                                   |--- Sets DB: isLive = false        |
      |                                   |--- Map.delete(RoomSlug)           |
      v                                   v                                   v

```

### Event Payload Dictionary Schema

```typescript
interface CodeStreamPayload {
  roomSlug: string;
  activeFileId: string;
  fileValueString: string;
  cursorCoordinates: {
    line: number;
    column: number;
  };
}

interface ChatMessagePayload {
  roomSlug: string;
  messageText: string;
}

```

---

## 7. Frontend Workspace Interface Engineering

### Component Architecture Selection

* **Editor Base Core:** `@monaco-editor/react` (Native engine mirroring VS Code features).
* **Telemetry Hook Injections:** Host execution monitors editor states through `editor.onDidChangeCursorPosition` events, dispatching coordinate matrices smoothly downstream to unauthenticated socket environments.

### Flexible Multi-Panel Component Framework Layout State

```typescript
type SidebarAlignment = 'left' | 'right';

interface WorkspaceLayoutMatrix {
  explorerVisible: boolean;
  explorerPosition: SidebarAlignment;
  chatVisible: boolean;
  chatPosition: SidebarAlignment;
}

```

### CSS Flex Ordering Matrix (Tailwind UI Core Setup)

```tsx
const getOrderClass = (component: 'explorer' | 'editor' | 'chat', state: WorkspaceLayoutMatrix) => {
  if (component === 'explorer' && state.explorerVisible) {
    return state.explorerPosition === 'left' ? 'order-1' : 'order-4';
  }
  if (component === 'chat' && state.chatVisible) {
    return state.chatPosition === 'left' ? 'order-2' : 'order-5';
  }
  return 'order-3 flex-1'; // Main Monaco Code Canvas Block Window boundary
};

```

### Dynamic User Tracking & Telemetry Loop

* Viewers default to an active state tracking configuration flag: `isFollowingHost = true`.
* If `isFollowingHost` is active, inbound `code:stream` payloads force Monaco models to mirror matching buffers and explicitly snapshot cursor positions using `editor.setSelection()`.
* Manual tab updates or workspace tree navigation clicks inside the viewer client automatically flip `isFollowingHost = false`, rendering an anchor reset toggle badge on screen.

### Accessible Theme Tokens & Key Combinations (GitHub Minimal Accent Design)

* **Tokens:** Base Background `#0d1117`, Sidecar Elements `#161b22`, Boundary Dividers `#21262d`, Selection Highlights `#58a6ff`.
* **Keyboard Shortcuts Framework Listeners:**
* `Cmd+B` / `Ctrl+B` $\rightarrow$ Toggle state property: `WorkspaceLayoutMatrix.explorerVisible`.
* `Ctrl+` ` ` $\rightarrow$ Directly assign browser interaction focus to `<input label="Live Room Chat Text Entry">`.


* **Screen Reader Navigation Anchors:**
* Chat Output Log Shell Container: `<div aria-live="log" aria-relevant="additions" class="overflow-y-auto">`
* Panel Toggle Buttons: Explicit property mappings configuration requirement: `<button aria-label="Toggle active files browser sidebar visibility">`



### Icon Target Injection Handling (`@react-symbols/icons`)

* Directory Node Parsing Vector: Pass explicit node properties directly to `<FolderIcon folderName={node.name} isOpen={node.isOpen} />`
* Document File Extension Vector: Pass identifier keys directly to `<FileIcon fileName={node.name} />`

---

## 8. Containerized Target Deployment Setup (Docker Environment Config)

### Container Architecture Build Blueprint (`Dockerfile`)

```dockerfile
# STEP 1: Dependencies Resolution and Compilation Stage Cluster
FROM oven/bun:1.1-alpine AS pipeline-builder
WORKDIR /workspace

COPY package.json bun.lockb ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build:web && bun run build:server

# STEP 2: Production Process Execution Container
FROM oven/bun:1.1-alpine AS production-runtime
WORKDIR /app

COPY --from=pipeline-builder /workspace/server/dist ./server/dist
COPY --from=pipeline-builder /workspace/server/node_modules ./server/node_modules
COPY --from=pipeline-builder /workspace/server/package.json ./server/package.json
COPY --from=pipeline-builder /workspace/web/dist ./web/dist

RUN mkdir -p /app/server/data

EXPOSE 3000
VOLUME [ "/app/server/data" ]

ENV NODE_ENV=production

CMD ["bun", "run", "server/dist/main.js"]

```

---

[Use s3 in bun to write to the cloud interact with the object storage](https://bun.com/docs/runtime/s3.md)