export const FOCUS_CHAT_SHORTCUT_LABEL = 'Ctrl+m';
export const FOCUS_EDITOR_SHORTCUT_LABEL = "Ctrl+'";

export function isEditorFocusShortcut(event: KeyboardEvent): boolean {
    if (!event.ctrlKey || event.altKey) return false;
    return event.key === "'" || event.code === 'Quote';
}

export function isChatFocusShortcut(event: KeyboardEvent): boolean {
    if (!event.ctrlKey || event.altKey || event.shiftKey) return false;
    return event.key === 'm' || event.key === 'M';
}
