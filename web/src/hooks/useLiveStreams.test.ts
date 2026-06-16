import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

describe('useLiveStreams', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'visible',
        });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('loads streams on mount and polls for updates', async () => {
        let callCount = 0;
        globalThis.fetch = mock(async () => {
            callCount += 1;
            const streams =
                callCount === 1
                    ? []
                    : [
                          {
                              id: 'stream-1',
                              title: 'Live session',
                              language: 'typescript',
                              hostUsername: 'Host',
                              workspaceId: 'ws-1',
                          },
                      ];
            return new Response(JSON.stringify(streams), { status: 200 });
        }) as typeof fetch;

        const { useLiveStreams } = await import('./useLiveStreams');
        const { result } = renderHook(() => useLiveStreams(1000));

        await act(async () => {
            await Promise.resolve();
        });
        expect(result.current).toEqual([]);

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 1100));
        });

        expect(result.current).toEqual([
            {
                id: 'stream-1',
                title: 'Live session',
                language: 'typescript',
                hostUsername: 'Host',
                workspaceId: 'ws-1',
            },
        ]);
        expect(callCount).toBeGreaterThanOrEqual(2);
    });
});
