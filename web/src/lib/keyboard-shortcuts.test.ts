import { describe, expect, it } from 'bun:test';
import { isChatFocusShortcut, isEditorFocusShortcut } from '@/lib/keyboard-shortcuts';

describe('keyboard-shortcuts', () => {
    it('detects editor focus shortcut on apostrophe', () => {
        expect(
            isEditorFocusShortcut(new KeyboardEvent('keydown', { ctrlKey: true, key: "'" })),
        ).toBe(true);
        expect(
            isEditorFocusShortcut(
                new KeyboardEvent('keydown', { ctrlKey: true, code: 'Quote' }),
            ),
        ).toBe(true);
        expect(
            isEditorFocusShortcut(new KeyboardEvent('keydown', { ctrlKey: true, key: '.' })),
        ).toBe(false);
    });

    it('detects chat focus shortcut on m', () => {
        expect(
            isChatFocusShortcut(new KeyboardEvent('keydown', { ctrlKey: true, key: 'm' })),
        ).toBe(true);
        expect(
            isChatFocusShortcut(new KeyboardEvent('keydown', { ctrlKey: true, key: "'" })),
        ).toBe(false);
    });
});
