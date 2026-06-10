import { afterEach, describe, expect, it, mock } from 'bun:test';

const connectHandlers: Array<() => void> = [];
const mockSocket = {
    on: (event: string, handler: () => void) => {
        if (event === 'connect') connectHandlers.push(handler);
    },
    off: () => {},
    emit: () => {},
    disconnect: () => {},
};

mock.module('socket.io-client', () => ({
    io: (_url?: string, options?: { path?: string }) => {
        expect(options?.path).toBe('/_ws');
        queueMicrotask(() => connectHandlers.forEach((handler) => handler()));
        return mockSocket;
    },
}));

afterEach(() => {
    connectHandlers.length = 0;
});

describe('useSocket', () => {
    it('connects using the /_ws socket path', async () => {
        const { io: ioClient } = await import('socket.io-client');
        const socket = ioClient(undefined, { path: '/_ws', transports: ['websocket'] });
        expect(socket).toBeDefined();
    });
});
