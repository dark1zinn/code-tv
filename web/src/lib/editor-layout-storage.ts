import type { SidebarAlignment } from '@/hooks/useEditorLayout';

export const EDITOR_LAYOUT_STORAGE_KEY = 'codetv-editor-layout';

export interface EditorLayoutStorage {
    editorTabPositionSwaped?: boolean;
}

export function readEditorTabPositionSwapped(): boolean {
    try {
        const raw = localStorage.getItem(EDITOR_LAYOUT_STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as EditorLayoutStorage;
        return parsed.editorTabPositionSwaped === true;
    } catch {
        return false;
    }
}

export function writeEditorTabPositionSwapped(swapped: boolean): void {
    const payload: EditorLayoutStorage = { editorTabPositionSwaped: swapped };
    localStorage.setItem(EDITOR_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
}

export function sidebarPositionsFromSwapped(swapped: boolean): {
    explorerPosition: SidebarAlignment;
    chatPosition: SidebarAlignment;
} {
    return swapped
        ? { explorerPosition: 'right', chatPosition: 'left' }
        : { explorerPosition: 'left', chatPosition: 'right' };
}

export function isSidebarPositionsSwapped(
    explorerPosition: SidebarAlignment,
    chatPosition: SidebarAlignment,
): boolean {
    return explorerPosition === 'right' && chatPosition === 'left';
}
