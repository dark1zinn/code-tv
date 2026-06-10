import { afterEach, describe, expect, it, mock } from 'bun:test';

describe('useKeyboardShortcuts', () => {
    afterEach(() => {
        document.removeEventListener('keydown', () => {});
    });

    it('registers keydown handlers for explorer and chat', async () => {
        const toggleExplorer = mock(() => {});
        const focusChat = mock(() => {});

        const listeners: Array<(event: KeyboardEvent) => void> = [];
        const original = window.addEventListener;
        window.addEventListener = ((type: string, handler: EventListener) => {
            if (type === 'keydown') listeners.push(handler as (event: KeyboardEvent) => void);
        }) as typeof window.addEventListener;

        const { useKeyboardShortcuts } = await import('./useKeyboardShortcuts');
        const { renderHook } = await import('@testing-library/react');
        renderHook(() => useKeyboardShortcuts({ toggleExplorer, focusChat }));

        listeners[0]?.(new KeyboardEvent('keydown', { ctrlKey: true, key: 'b' }));
        listeners[0]?.(new KeyboardEvent('keydown', { ctrlKey: true, key: '`' }));

        expect(toggleExplorer).toHaveBeenCalled();
        expect(focusChat).toHaveBeenCalled();

        window.addEventListener = original;
    });
});
