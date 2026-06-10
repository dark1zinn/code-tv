import { useEffect } from 'react';

interface ShortcutHandlers {
    toggleExplorer: () => void;
    focusChat: () => void;
}

export function useKeyboardShortcuts({ toggleExplorer, focusChat }: ShortcutHandlers) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
                event.preventDefault();
                toggleExplorer();
            }

            if (event.ctrlKey && event.key === '/') {
                event.preventDefault();
                focusChat();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [toggleExplorer, focusChat]);
}
