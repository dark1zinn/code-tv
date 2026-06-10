import { describe, expect, it } from 'bun:test';
import { extractRawIp, hashIpAddress } from './ip-hash';

describe('ip-hash', () => {
    it('parses x-forwarded-for taking the first address', () => {
        expect(extractRawIp('203.0.113.1, 198.51.100.2', '127.0.0.1')).toBe('203.0.113.1');
    });

    it('falls back to remote address when header is missing', () => {
        expect(extractRawIp(undefined, '10.0.0.5')).toBe('10.0.0.5');
    });

    it('produces a stable sha-256 hex digest', async () => {
        const first = await hashIpAddress('192.168.1.1');
        const second = await hashIpAddress('192.168.1.1');
        expect(first).toBe(second);
        expect(first).toHaveLength(64);
    });
});
