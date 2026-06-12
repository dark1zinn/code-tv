import { useRef } from 'react';
import type { ChatMessage } from '@/components/LiveChat';

export function useCollapsedChatUnread(
    messages: ChatMessage[],
    chatVisible: boolean,
    chatEnabled: boolean,
): number {
    const baselineCountRef = useRef<number | null>(null);
    const wasCollapsedRef = useRef(false);

    const isCollapsed = chatEnabled && !chatVisible;

    if (!isCollapsed) {
        if (wasCollapsedRef.current) {
            baselineCountRef.current = null;
            wasCollapsedRef.current = false;
        }
        return 0;
    }

    if (!wasCollapsedRef.current) {
        baselineCountRef.current = messages.length;
        wasCollapsedRef.current = true;
    }

    return Math.max(0, messages.length - (baselineCountRef.current ?? messages.length));
}
