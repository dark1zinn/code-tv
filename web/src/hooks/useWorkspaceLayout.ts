import { useCallback, useState } from 'react';

export type SidebarAlignment = 'left' | 'right';

export interface WorkspaceLayoutMatrix {
    explorerVisible: boolean;
    explorerPosition: SidebarAlignment;
    chatVisible: boolean;
    chatPosition: SidebarAlignment;
}

const defaultLayout: WorkspaceLayoutMatrix = {
    explorerVisible: true,
    explorerPosition: 'left',
    chatVisible: true,
    chatPosition: 'right',
};

export function getOrderClass(
    component: 'explorer' | 'editor' | 'chat',
    state: WorkspaceLayoutMatrix,
): string {
    if (component === 'explorer' && state.explorerVisible) {
        return state.explorerPosition === 'left' ? 'order-1' : 'order-4';
    }
    if (component === 'chat' && state.chatVisible) {
        return state.chatPosition === 'left' ? 'order-2' : 'order-5';
    }
    return 'order-3 flex-1';
}

export function useWorkspaceLayout(initial: WorkspaceLayoutMatrix = defaultLayout) {
    const [layout, setLayout] = useState(initial);

    const toggleExplorer = useCallback(() => {
        setLayout((current) => ({ ...current, explorerVisible: !current.explorerVisible }));
    }, []);

    const toggleChat = useCallback(() => {
        setLayout((current) => ({ ...current, chatVisible: !current.chatVisible }));
    }, []);

    return { layout, setLayout, toggleExplorer, toggleChat };
}
