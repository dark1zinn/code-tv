import { afterEach, describe, expect, it, mock } from 'bun:test';

describe('useKeyboardShortcuts', () => {
    afterEach(() => {
        document.removeEventListener('keydown', () => {});
    });

    it('registers keydown handlers for sidebars, swap, and focus', async () => {
        const toggleLeftSidebar = mock(() => {});
        const toggleRightSidebar = mock(() => {});
        const swapSidebarPositions = mock(() => {});
        const focusChat = mock(() => {});

        const listeners: Array<(event: KeyboardEvent) => void> = [];
        const original = window.addEventListener;
        window.addEventListener = ((type: string, handler: EventListener) => {
            if (type === 'keydown') listeners.push(handler as (event: KeyboardEvent) => void);
        }) as typeof window.addEventListener;

        const { useKeyboardShortcuts } = await import('./useKeyboardShortcuts');
        const { renderHook } = await import('@testing-library/react');
        renderHook(() =>
            useKeyboardShortcuts({
                toggleLeftSidebar,
                toggleRightSidebar,
                swapSidebarPositions,
                focusChat,
            }),
        );

        listeners[0]?.(new KeyboardEvent('keydown', { ctrlKey: true, key: 'b' }));
        listeners[0]?.(
            new KeyboardEvent('keydown', { ctrlKey: true, altKey: true, key: 'b' }),
        );
        listeners[0]?.(
            new KeyboardEvent('keydown', { ctrlKey: true, key: ',' }),
        );
        listeners[0]?.(new KeyboardEvent('keydown', { ctrlKey: true, key: '/' }));

        expect(toggleLeftSidebar).toHaveBeenCalledTimes(1);
        expect(toggleRightSidebar).toHaveBeenCalledTimes(1);
        expect(swapSidebarPositions).toHaveBeenCalledTimes(1);
        expect(focusChat).toHaveBeenCalledTimes(1);

        window.addEventListener = original;
    });
});
