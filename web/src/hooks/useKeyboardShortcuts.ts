import { useEffect } from 'react';

interface ShortcutHandlers {
    toggleLeftSidebar: () => void;
    toggleRightSidebar: () => void;
    swapSidebarPositions?: () => void;
    focusChat: () => void;
}

export function useKeyboardShortcuts({
    toggleLeftSidebar,
    toggleRightSidebar,
    swapSidebarPositions,
    focusChat,
}: ShortcutHandlers) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key === ',') {
                event.preventDefault();
                swapSidebarPositions?.();
                return;
            }

            if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 'b') {
                event.preventDefault();
                toggleLeftSidebar();
                return;
            }

            if (event.ctrlKey && event.altKey && !event.shiftKey && key === 'b') {
                event.preventDefault();
                toggleRightSidebar();
                return;
            }

            if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key === '/') {
                event.preventDefault();
                focusChat();
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [toggleLeftSidebar, toggleRightSidebar, swapSidebarPositions, focusChat]);
}
