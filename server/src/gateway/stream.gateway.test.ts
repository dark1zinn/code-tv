import { beforeEach, describe, expect, it } from 'bun:test';
import type { Server, Socket } from 'socket.io';
import { StreamGateway, type CodeSwitchPayload, type FilesStreamPayload } from './stream.gateway';

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
    let streams: Map<string, { hostIp: string; isLive: boolean; s3Key?: string }>;
    let profiles: Map<string, { username: string; chatColor?: string }>;
    const hostIp = 'host-hash';
    const viewerIp = 'viewer-hash';

    beforeEach(() => {
        streams = new Map();
        profiles = new Map();

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
            endStream: async (streamId: string, _hostIp: string) => {
                const stream = streams.get(streamId);
                if (stream) {
                    stream.isLive = false;
                }
                return { streamId };
            },
        };

        const profileService = {
            hydrate: async (ipHash: string) => {
                const existing = profiles.get(ipHash);
                if (existing) {
                    return {
                        ipAddress: ipHash,
                        username: existing.username,
                        chatColor: existing.chatColor ?? '#58a6ff',
                    };
                }
                const username = `Anon-${Math.floor(1000 + Math.random() * 9000)}`;
                profiles.set(ipHash, { username, chatColor: '#58a6ff' });
                return { ipAddress: ipHash, username, chatColor: '#58a6ff' };
            },
            getProfile: async (ipHash: string) => {
                const existing = profiles.get(ipHash);
                if (!existing) return null;
                return {
                    ipAddress: ipHash,
                    username: existing.username,
                    chatColor: existing.chatColor ?? '#58a6ff',
                };
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

    it('replays stream snapshot on room join', async () => {
        const client = createMockSocket('viewer-1', '203.0.113.2');
        streams.set('room-1', { hostIp, isLive: true });
        (
            gateway as unknown as {
                roomStreamState: Map<
                    string,
                    {
                        files?: FilesStreamPayload;
                        codeSwitch?: CodeSwitchPayload;
                    }
                >;
            }
        ).roomStreamState = new Map([
            [
                'room-1',
                {
                    files: {
                        roomSlug: 'room-1',
                        files: [{ path: 'src/main.ts' }],
                        activeFileId: 'root/src/main.ts',
                    },
                    codeSwitch: {
                        roomSlug: 'room-1',
                        activeFileId: 'root/src/main.ts',
                        cursorCoordinates: { line: 2, column: 3 },
                        fileValueString: 'const live = true;',
                    },
                },
            ],
        ]);

        const emitted: Array<{ event: string; payload: unknown }> = [];
        const viewer = {
            ...client,
            emit: (event: string, payload: unknown) => {
                emitted.push({ event, payload });
            },
        };

        await gateway.handleRoomJoin(viewer as Socket, 'room-1');

        expect(emitted).toEqual([
            {
                event: 'chat:history',
                payload: [],
            },
            {
                event: 'files:stream',
                payload: {
                    roomSlug: 'room-1',
                    files: [{ path: 'src/main.ts' }],
                    activeFileId: 'root/src/main.ts',
                },
            },
            {
                event: 'code:switch',
                payload: {
                    roomSlug: 'room-1',
                    activeFileId: 'root/src/main.ts',
                    cursorCoordinates: { line: 2, column: 3 },
                    fileValueString: 'const live = true;',
                },
            },
        ]);
    });

    it('broadcasts code input payloads to the room', () => {
        const host = createMockSocket('host-1', '203.0.113.1');
        (gateway as unknown as { socketProfiles: Map<string, unknown> }).socketProfiles.set(
            'host-1',
            { ipHash: hostIp, username: 'Host' },
        );
        (gateway as unknown as { roomHosts: Map<string, string> }).roomHosts.set('room-1', hostIp);

        const payload = {
            roomSlug: 'room-1',
            activeFileId: 'root/main.ts',
            changes: [
                {
                    range: {
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 1,
                    },
                    rangeOffset: 0,
                    rangeLength: 0,
                    text: 'x',
                },
            ],
            cursorCoordinates: { line: 1, column: 2 },
            fileValueString: 'const x = 1;',
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

        const result = gateway.handleCodeInput(hostSocket as Socket, payload);
        expect(result).toEqual({ ok: true });
        expect(emitted[0]).toEqual(payload);
    });

    it('caps chat buffer at 50 messages', async () => {
        const client = createMockSocket('user-1', '203.0.113.3');
        profiles.set(viewerIp, { username: 'Chatter', chatColor: '#ff00aa' });
        (gateway as unknown as { socketProfiles: Map<string, unknown> }).socketProfiles.set(
            'user-1',
            { ipHash: viewerIp, username: 'Chatter' },
        );

        const room = 'chat-room';
        for (let i = 0; i < 51; i++) {
            await gateway.handleChatSend(client as Socket, {
                roomSlug: room,
                messageText: `msg-${i}`,
            });
        }

        const buffer = (
            gateway as unknown as { ephemeralChatBuffer: Map<string, unknown[]> }
        ).ephemeralChatBuffer.get(room);
        expect(buffer).toHaveLength(50);
        expect((buffer?.[0] as { text: string }).text).toBe('msg-1');
        expect((buffer?.at(-1) as { color: string }).color).toBe('#ff00aa');
    });

    it('closes the room without archiving code', async () => {
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
            gateway as unknown as { ephemeralChatBuffer: Map<string, unknown[]> }
        ).ephemeralChatBuffer.set('close-room', []);

        const result = await gateway.handleRoomClose(host as Socket, 'close-room');
        expect(result.streamId).toBe('close-room');
        expect(streams.get('close-room')?.isLive).toBe(false);
    });
});
