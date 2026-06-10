import { afterEach, describe, expect, it } from 'bun:test';
import { buildWatchLink } from './share-link';

describe('share-link', () => {
    afterEach(() => {
        // restore if needed
    });

    it('builds watch link with workspace id', () => {
        const original = window.location.origin;
        Object.defineProperty(window, 'location', {
            value: { origin: 'http://localhost:5173' },
            writable: true,
        });
        expect(buildWatchLink('ws-123')).toBe('http://localhost:5173/live?w=ws-123');
        Object.defineProperty(window, 'location', {
            value: { origin: original },
            writable: true,
        });
    });
});
