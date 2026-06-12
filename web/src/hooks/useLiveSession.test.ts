import { describe, expect, it, mock } from 'bun:test';
import type { ViewerContext } from './useLiveRoute';

const viewer: ViewerContext = {
    workspaceId: 'ws-1',
    isLive: true,
    streamId: 'room-1',
    title: 'Test',
    tags: [],
    language: 'typescript',
    files: [
        { path: 'root/README.md', content: '# Hello' },
        { path: 'root/src/host.ts', content: 'initial host' },
    ],
};

describe('useLiveSession follow host', () => {
    it('snaps to the last host view when follow is re-enabled', async () => {
        const handlers = new Map<string, (payload: unknown) => void>();
        const on = mock((event: string, handler: (payload: unknown) => void) => {
            handlers.set(event, handler);
            return () => {
                handlers.delete(event);
            };
        });
        const emit = mock(async () => ({}));

        const { renderHook, act } = await import('@testing-library/react');
        const { useLiveSession } = await import('./useLiveSession');

        const { result } = renderHook(() =>
            useLiveSession(viewer, 'watch', emit, on, true),
        );

        act(() => {
            handlers.get('code:stream')?.({
                activeFileId: 'root/src/host.ts',
                fileValueString: 'host live code',
            });
        });

        expect(result.current.activeFileId).toBe('root/src/host.ts');
        expect(result.current.code).toBe('host live code');

        act(() => {
            result.current.setIsFollowingHost(false);
            result.current.selectFile('root/README.md');
        });

        expect(result.current.activeFileId).toBe('root/README.md');
        expect(result.current.isFollowingHost).toBe(false);

        act(() => {
            result.current.toggleFollowHost();
        });

        expect(result.current.isFollowingHost).toBe(true);
        expect(result.current.activeFileId).toBe('root/src/host.ts');
        expect(result.current.code).toBe('host live code');
    });

    it('keeps follow enabled when host stream updates arrive', async () => {
        const handlers = new Map<string, (payload: unknown) => void>();
        const on = mock((event: string, handler: (payload: unknown) => void) => {
            handlers.set(event, handler);
            return () => {
                handlers.delete(event);
            };
        });
        const emit = mock(async () => ({}));

        const { renderHook, act } = await import('@testing-library/react');
        const { useLiveSession } = await import('./useLiveSession');

        const { result } = renderHook(() =>
            useLiveSession(viewer, 'watch', emit, on, true),
        );

        act(() => {
            handlers.get('code:stream')?.({
                activeFileId: 'root/src/host.ts',
                fileValueString: 'synced from host',
            });
        });

        expect(result.current.isFollowingHost).toBe(true);
        expect(result.current.code).toBe('synced from host');
    });
});
