import { describe, expect, it } from 'bun:test';
import type { ChatMessage } from '@/components/LiveChat';

function message(id: number): ChatMessage {
    return {
        sender: `user-${id}`,
        text: `message ${id}`,
        timestamp: id,
    };
}

describe('useCollapsedChatUnread', () => {
    it('returns zero while chat is expanded', async () => {
        const { renderHook } = await import('@testing-library/react');
        const { useCollapsedChatUnread } = await import('./useCollapsedChatUnread');

        const { result } = renderHook(() =>
            useCollapsedChatUnread([message(1)], true, true),
        );
        expect(result.current).toBe(0);
    });

    it('tracks new messages while collapsed and resets when expanded', async () => {
        const { renderHook } = await import('@testing-library/react');
        const { useCollapsedChatUnread } = await import('./useCollapsedChatUnread');

        const { result, rerender } = renderHook(
            ({ messages, chatVisible, chatEnabled }) =>
                useCollapsedChatUnread(messages, chatVisible, chatEnabled),
            {
                initialProps: {
                    messages: [message(1)],
                    chatVisible: true,
                    chatEnabled: true,
                },
            },
        );

        rerender({
            messages: [message(1)],
            chatVisible: false,
            chatEnabled: true,
        });
        expect(result.current).toBe(0);

        rerender({
            messages: [message(1), message(2), message(3)],
            chatVisible: false,
            chatEnabled: true,
        });
        expect(result.current).toBe(2);

        rerender({
            messages: [message(1), message(2), message(3)],
            chatVisible: true,
            chatEnabled: true,
        });
        expect(result.current).toBe(0);

        rerender({
            messages: [message(1), message(2), message(3), message(4)],
            chatVisible: false,
            chatEnabled: true,
        });
        expect(result.current).toBe(0);

        rerender({
            messages: [message(1), message(2), message(3), message(4), message(5)],
            chatVisible: false,
            chatEnabled: true,
        });
        expect(result.current).toBe(1);
    });

    it('returns zero when chat is disabled', async () => {
        const { renderHook } = await import('@testing-library/react');
        const { useCollapsedChatUnread } = await import('./useCollapsedChatUnread');

        const { result } = renderHook(() =>
            useCollapsedChatUnread([message(1), message(2)], false, false),
        );
        expect(result.current).toBe(0);
    });
});
