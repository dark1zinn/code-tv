export const DEFAULT_CHAT_COLOR = '#58a6ff';

export function normalizeOptionalLink(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function normalizeChatColor(value: unknown): string {
    if (typeof value !== 'string') return DEFAULT_CHAT_COLOR;
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
        const [, r, g, b] = trimmed;
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return DEFAULT_CHAT_COLOR;
}
