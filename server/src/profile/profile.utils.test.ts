import { describe, expect, it } from 'bun:test';
import { normalizeChatColor, normalizeOptionalLink } from './profile.utils';

describe('profile.utils', () => {
    it('normalizes optional links', () => {
        expect(normalizeOptionalLink('  https://github.com/a  ')).toBe('https://github.com/a');
        expect(normalizeOptionalLink('   ')).toBeNull();
    });

    it('normalizes chat colors', () => {
        expect(normalizeChatColor('#FF6B6B')).toBe('#ff6b6b');
        expect(normalizeChatColor('#abc')).toBe('#aabbcc');
        expect(normalizeChatColor('nope')).toBe('#58a6ff');
    });
});
