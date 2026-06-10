import { describe, expect, it, mock } from 'bun:test';

describe('useStreamSession bootstrap', () => {
    it('fetches profile and streams from api', async () => {
        const fetchMock = mock(async (url: string) => ({
            json: async () => {
                if (url === '/_api/profile') {
                    return { ipAddress: 'hash', username: 'Anon-1111' };
                }
                return [{ id: 'alpha-bravo-compile', hostIp: 'hash', language: 'typescript' }];
            },
        }));

        globalThis.fetch = fetchMock as typeof fetch;

        const profile = await fetch('/_api/profile').then((res) => res.json());
        const streams = await fetch('/_api/streams').then((res) => res.json());

        expect(profile.username).toBe('Anon-1111');
        expect(streams[0].id).toBe('alpha-bravo-compile');
    });
});
