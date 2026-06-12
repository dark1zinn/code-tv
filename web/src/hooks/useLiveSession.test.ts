import { describe, expect, it, mock } from 'bun:test';
import type { ViewerContext } from './useLiveRoute';

const viewer: ViewerContext = {
    workspaceId: 'ws-1',
    isLive: true,
    streamId: 'room-1',
    title: 'Test',
    tags: [],
    language: 'typescript',
    files: [{ path: 'README.md' }, { path: 'src/host.ts' }],
};

describe('useLiveSession follow host', () => {
    it('snaps to the host active file when follow is re-enabled', async () => {
        const handlers = new Map<string, (payload: unknown) => void>();
        const on = mock((event: string, handler: (payload: unknown) => void) => {
            handlers.set(event, handler);
            return () => {
                handlers.delete(event);
            };
        });
        const emit = mock(async () => ({}));

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes('/file?path=src%2Fhost.ts')) {
                return new Response(JSON.stringify({ content: 'saved host file' }), {
                    status: 200,
                });
            }
            if (url.includes('/file?path=README.md')) {
                return new Response(JSON.stringify({ content: '# Hello' }), { status: 200 });
            }
            return new Response('', { status: 404 });
        }) as typeof fetch;

        const { renderHook, act } = await import('@testing-library/react');
        const { useLiveSession } = await import('./useLiveSession');

        const { result } = renderHook(() =>
            useLiveSession(viewer, 'watch', emit, on, true),
        );

        await act(async () => {
            await Promise.resolve();
        });

        act(() => {
            handlers.get('code:switch')?.({
                activeFileId: 'root/src/host.ts',
                cursorCoordinates: { line: 1, column: 1 },
                fileValueString: 'host live file',
            });
        });

        await act(async () => {
            await Promise.resolve();
        });

        act(() => {
            result.current.setIsFollowingHost(false);
            void result.current.selectFile('root/README.md');
        });

        await act(async () => {
            await Promise.resolve();
        });

        act(() => {
            result.current.toggleFollowHost();
        });

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.isFollowingHost).toBe(true);
        expect(result.current.activeFileId).toBe('root/src/host.ts');
        expect(result.current.code).toBe('host live file');
        expect(globalThis.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining('/file?path=src%2Fhost.ts'),
        );

        globalThis.fetch = originalFetch;
    });
});
