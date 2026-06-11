import { useCallback, useState } from 'react';
import {
    isSidebarPositionsSwapped,
    readEditorTabPositionSwapped,
    sidebarPositionsFromSwapped,
    writeEditorTabPositionSwapped,
} from '@/lib/editor-layout-storage';

export type SidebarAlignment = 'left' | 'right';
export type SidebarPanel = 'explorer' | 'chat';

export interface EditorLayoutMatrix {
    explorerVisible: boolean;
    explorerPosition: SidebarAlignment;
    chatVisible: boolean;
    chatPosition: SidebarAlignment;
}

function buildInitialLayout(initial: Partial<EditorLayoutMatrix> = {}): EditorLayoutMatrix {
    const swapped = readEditorTabPositionSwapped();
    const positions = sidebarPositionsFromSwapped(swapped);
    return {
        explorerVisible: true,
        explorerPosition: positions.explorerPosition,
        chatVisible: true,
        chatPosition: positions.chatPosition,
        ...initial,
    };
}

export function getSidePanelOnSide(
    side: SidebarAlignment,
    layout: EditorLayoutMatrix,
    chatEnabled: boolean,
): SidebarPanel | null {
    if (layout.explorerPosition === side) return 'explorer';
    if (chatEnabled && layout.chatPosition === side) return 'chat';
    return null;
}

export function isPanelVisible(
    panel: SidebarPanel,
    layout: EditorLayoutMatrix,
): boolean {
    return panel === 'explorer' ? layout.explorerVisible : layout.chatVisible;
}

/** @deprecated Use flex slot layout in EditorWorkspace; kept for tests. */
export function getOrderClass(
    component: 'explorer' | 'editor' | 'chat',
    state: EditorLayoutMatrix,
): string {
    if (component === 'explorer' && state.explorerVisible) {
        return state.explorerPosition === 'left' ? 'order-1' : 'order-4';
    }
    if (component === 'chat' && state.chatVisible) {
        return state.chatPosition === 'left' ? 'order-2' : 'order-5';
    }
    return 'order-3 flex-1';
}

export function useEditorLayout(initial: Partial<EditorLayoutMatrix> = {}) {
    const [layout, setLayout] = useState<EditorLayoutMatrix>(() => buildInitialLayout(initial));

    const toggleExplorer = useCallback(() => {
        setLayout((current) => ({ ...current, explorerVisible: !current.explorerVisible }));
    }, []);

    const toggleChat = useCallback(() => {
        setLayout((current) => ({ ...current, chatVisible: !current.chatVisible }));
    }, []);

    const toggleLeftSidebar = useCallback((chatEnabled: boolean) => {
        setLayout((current) => {
            const panel = getSidePanelOnSide('left', current, chatEnabled);
            if (!panel) return current;
            return panel === 'explorer'
                ? { ...current, explorerVisible: !current.explorerVisible }
                : { ...current, chatVisible: !current.chatVisible };
        });
    }, []);

    const toggleRightSidebar = useCallback((chatEnabled: boolean) => {
        setLayout((current) => {
            const panel = getSidePanelOnSide('right', current, chatEnabled);
            if (!panel) return current;
            return panel === 'explorer'
                ? { ...current, explorerVisible: !current.explorerVisible }
                : { ...current, chatVisible: !current.chatVisible };
        });
    }, []);

    const swapSidebarPositions = useCallback(() => {
        setLayout((current) => {
            const nextSwapped = !isSidebarPositionsSwapped(
                current.explorerPosition,
                current.chatPosition,
            );
            writeEditorTabPositionSwapped(nextSwapped);
            const positions = sidebarPositionsFromSwapped(nextSwapped);
            return {
                ...current,
                explorerPosition: positions.explorerPosition,
                chatPosition: positions.chatPosition,
            };
        });
    }, []);

    return {
        layout,
        setLayout,
        toggleExplorer,
        toggleChat,
        toggleLeftSidebar,
        toggleRightSidebar,
        swapSidebarPositions,
    };
}
