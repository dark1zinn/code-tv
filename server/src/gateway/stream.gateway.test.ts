import { beforeEach, describe, expect, it } from 'bun:test';
import type { Server, Socket } from 'socket.io';
import { StreamGateway } from './stream.gateway';

type MockSocket = Pick<Socket, 'id' | 'join' | 'emit' | 'to' | 'handshake' | 'disconnect'>;

function createMockSocket(id: string, ip: string): MockSocket {
    const rooms = new Set<string>();
    const emitted: Array<{ event: string; payload: unknown }> = [];

    return {
        id,
        handshake: {
            headers: { 'x-forwarded-for': ip },
            address: ip,
        } as Socket['handshake'],
        join: (room: string) => {
            rooms.add(room);
            return Promise.resolve();
        },
        emit: (event: string, payload: unknown) => {
            emitted.push({ event, payload });
        },
        to: (room: string) => ({
            emit: (event: string, payload: unknown) => {
                emitted.push({ event, payload, room });
            },
        }),
        disconnect: () => {},
    };
}

describe('StreamGateway', () => {
    let gateway: StreamGateway;
    let mockStorage: { uploadArchive: (id: string, content: string) => Promise<string> };
    let uploaded: Map<string, string>;
    let streams: Map<string, { hostIp: string; isLive: boolean; s3Key?: string }>;
    let profiles: Map<string, { username: string }>;
    const hostIp = 'host-hash';
    const viewerIp = 'viewer-hash';

    beforeEach(() => {
        uploaded = new Map();
        streams = new Map();
        profiles = new Map();

        mockStorage = {
            uploadArchive: async (id, content) => {
                const key = `pastes/${id}/code_snapshot.json`;
                uploaded.set(key, content);
                return key;
            },
        };

        const streamService = {
            createStream: async (ipHash: string, input: { title?: string }, id?: string) => {
                const streamId = id ?? 'generated-id';
                streams.set(streamId, { hostIp: ipHash, isLive: true });
                return { id: streamId, hostIp: ipHash, ...input };
            },
            getStream: async (id: string) => {
                const stream = streams.get(id);
                if (!stream) throw new Error('not found');
                return {
                    id,
                    hostIp: stream.hostIp,
                    isLive: stream.isLive,
                    workspaceId: null,
                    language: 'typescript',
                    title: id,
                };
            },
            assertHost: async (streamId: string, hostIp: string) => {
                const stream = streams.get(streamId);
                if (!stream || stream.hostIp !== hostIp) throw new Error('forbidden');
                return { id: streamId, hostIp: stream.hostIp, isLive: stream.isLive };
            },
            closeStream: async (streamId: string, s3Key: string) => {
                const stream = streams.get(streamId);
                if (stream) {
                    stream.isLive = false;
                    stream.s3Key = s3Key;
                }
            },
            endStream: async (streamId: string, _hostIp: string) => {
                const key = `pastes/${streamId}/code_snapshot.json`;
                const stream = streams.get(streamId);
                if (stream) {
                    stream.isLive = false;
                    stream.s3Key = key;
                }
                uploaded.set(key, 'export {};');
                return { streamId, s3Key: key };
            },
        };

        const profileService = {
            hydrate: async (ipHash: string) => {
                const existing = profiles.get(ipHash);
                if (existing) return { ipAddress: ipHash, username: existing.username };
                const username = `Anon-${Math.floor(1000 + Math.random() * 9000)}`;
                profiles.set(ipHash, { username });
                return { ipAddress: ipHash, username };
            },
        };

        gateway = new StreamGateway(streamService as never, profileService as never);

        const broadcasted: Array<{ room: string; event: string; payload: unknown }> = [];
        gateway.server = {
            to: (room: string) => ({
                emit: (event: string, payload: unknown) => {
                    broadcasted.push({ room, event, payload });
                },
            }),
        } as Server;

        (gateway as unknown as { __broadcasted: typeof broadcasted }).__broadcasted = broadcasted;
    });

    it('hydrates profile on connection', async () => {
        const client = createMockSocket('host-1', '203.0.113.1');
        await gateway.handleConnection(client as Socket);
        const result = await gateway.handleRoomCreate(client as Socket, 'alpha-bravo-compile');
        expect(result).toEqual({ roomSlug: 'alpha-bravo-compile' });
    });

    it('replays chat history on room join', async () => {
        const client = createMockSocket('viewer-1', '203.0.113.2');
        streams.set('alpha-bravo-compile', { hostIp, isLive: true });
        (
            gateway as unknown as { ephemeralChatBuffer: Map<string, unknown[]> }
        ).ephemeralChatBuffer = new Map([
            ['alpha-bravo-compile', [{ sender: 'Anon-1', text: 'hi', timestamp: 1 }]],
        ]);

        const result = await gateway.handleRoomJoin(client as Socket, 'alpha-bravo-compile');
        expect(result.history).toHaveLength(1);
    });

    it('broadcasts code stream payloads to the room', () => {
        const host = createMockSocket('host-1', '203.0.113.1');
        (gateway as unknown as { socketProfiles: Map<string, unknown> }).socketProfiles.set(
            'host-1',
            { ipHash: hostIp, username: 'Host' },
        );
        (gateway as unknown as { roomHosts: Map<string, string> }).roomHosts.set('room-1', hostIp);

        const payload = {
            roomSlug: 'room-1',
            activeFileId: 'main.ts',
            fileValueString: 'const x = 1;',
            cursorCoordinates: { line: 1, column: 4 },
        };

        const emitted: unknown[] = [];
        const hostSocket = {
            ...host,
            to: () => ({
                emit: (_event: string, data: unknown) => {
                    emitted.push(data);
                },
            }),
        };

        const result = gateway.handleCodeStream(hostSocket as Socket, payload);
        expect(result).toEqual({ ok: true });
        expect(emitted[0]).toEqual(payload);
    });

    it('caps chat buffer at 50 messages', () => {
        const client = createMockSocket('user-1', '203.0.113.3');
        (gateway as unknown as { socketProfiles: Map<string, unknown> }).socketProfiles.set(
            'user-1',
            { ipHash: viewerIp, username: 'Chatter' },
        );

        const room = 'chat-room';
        for (let i = 0; i < 51; i++) {
            gateway.handleChatSend(client as Socket, { roomSlug: room, messageText: `msg-${i}` });
        }

        const buffer = (
            gateway as unknown as { ephemeralChatBuffer: Map<string, unknown[]> }
        ).ephemeralChatBuffer.get(room);
        expect(buffer).toHaveLength(50);
        expect((buffer?.[0] as { text: string }).text).toBe('msg-1');
    });

    it('archives code and closes the room', async () => {
        const host = createMockSocket('host-1', '203.0.113.1');
        (gateway as unknown as { socketProfiles: Map<string, unknown> }).socketProfiles.set(
            'host-1',
            { ipHash: hostIp, username: 'Host' },
        );
        (gateway as unknown as { roomHosts: Map<string, string> }).roomHosts.set(
            'close-room',
            hostIp,
        );
        streams.set('close-room', { hostIp, isLive: true });
        (
            gateway as unknown as { latestCodeSnapshots: Map<string, string> }
        ).latestCodeSnapshots.set('close-room', 'export {};');
        (
            gateway as unknown as { ephemeralChatBuffer: Map<string, unknown[]> }
        ).ephemeralChatBuffer.set('close-room', []);

        const result = await gateway.handleRoomClose(host as Socket, 'close-room');
        expect(result.s3Key).toContain('close-room');
        expect(uploaded.get(result.s3Key)).toBe('export {};');
        expect(streams.get('close-room')?.isLive).toBe(false);
    });
});
