import { describe, expect, test } from 'bun:test';
import { formatUnreadChatBadge } from '@/lib/chat-unread';

describe('formatUnreadChatBadge', () => {
    test('returns null for zero or negative counts', () => {
        expect(formatUnreadChatBadge(0)).toBeNull();
        expect(formatUnreadChatBadge(-1)).toBeNull();
    });

    test('returns the count up to 20', () => {
        expect(formatUnreadChatBadge(1)).toBe('1');
        expect(formatUnreadChatBadge(20)).toBe('20');
    });

    test('caps display at 20+', () => {
        expect(formatUnreadChatBadge(21)).toBe('20+');
        expect(formatUnreadChatBadge(100)).toBe('20+');
    });
});
