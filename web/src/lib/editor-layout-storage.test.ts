import { afterEach, describe, expect, it } from 'bun:test';
import {
    EDITOR_LAYOUT_STORAGE_KEY,
    readEditorTabPositionSwapped,
    sidebarPositionsFromSwapped,
    writeEditorTabPositionSwapped,
} from './editor-layout-storage';

afterEach(() => {
    localStorage.removeItem(EDITOR_LAYOUT_STORAGE_KEY);
});

describe('editor-layout-storage', () => {
    it('persists swapped sidebar positions', () => {
        expect(readEditorTabPositionSwapped()).toBe(false);
        writeEditorTabPositionSwapped(true);
        expect(localStorage.getItem(EDITOR_LAYOUT_STORAGE_KEY)).toBe(
            JSON.stringify({ editorTabPositionSwaped: true }),
        );
        expect(readEditorTabPositionSwapped()).toBe(true);
    });

    it('maps swapped flag to sidebar positions', () => {
        expect(sidebarPositionsFromSwapped(false)).toEqual({
            explorerPosition: 'left',
            chatPosition: 'right',
        });
        expect(sidebarPositionsFromSwapped(true)).toEqual({
            explorerPosition: 'right',
            chatPosition: 'left',
        });
    });
});
