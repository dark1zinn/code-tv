export const CHAT_UNREAD_BADGE_MAX = 20;

export function formatUnreadChatBadge(count: number): string | null {
    if (count <= 0) return null;
    if (count > CHAT_UNREAD_BADGE_MAX) return `${CHAT_UNREAD_BADGE_MAX}+`;
    return String(count);
}
