import { useEffect, useRef } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { EditorTabHeader } from '@/components/EditorTabHeader';
import { FileExplorer, type FileNode } from '@/components/FileExplorer';
import { focusChatInput, LiveChat, type ChatMessage } from '@/components/LiveChat';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
    getSidePanelOnSide,
    isPanelVisible,
    type EditorLayoutMatrix,
    type SidebarAlignment,
} from '@/hooks/useEditorLayout';

interface EditorWorkspaceProps {
    language: string;
    code: string;
    activeFileId: string;
    fileNodes: FileNode[];
    messages: ChatMessage[];
    readOnly: boolean;
    chatEnabled: boolean;
    layout: EditorLayoutMatrix;
    isFollowingHost?: boolean;
    onToggleExplorer: () => void;
    onToggleChat: () => void;
    onSwapSidebarPositions: () => void;
    onSelectFile: (fileId: string) => void;
    onCreateFile?: (parentNodePath: string, name: string) => void;
    onCreateFolder?: (parentNodePath: string, name: string) => void;
    onRenamePath?: (nodePath: string, name: string) => void;
    onDeletePath?: (nodePath: string) => void;
    onCodeChange: (value: string) => void;
    onCursorChange?: (position: { line: number; column: number }) => void;
    onManualInteraction?: () => void;
    onSendChat: (text: string) => void;
    onFollowHost?: () => void;
    showFollowHost?: boolean;
}

function CollapsedPanelButton({
    label,
    side,
    onClick,
}: {
    label: string;
    side: SidebarAlignment;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            className={`absolute top-2 z-10 shrink-0 rounded bg-bg-sidecar px-2 py-1 text-sm ${
                side === 'left' ? 'left-2' : 'right-2'
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export function EditorWorkspace({
    language,
    code,
    activeFileId,
    fileNodes,
    messages,
    readOnly,
    chatEnabled,
    layout,
    isFollowingHost,
    onToggleExplorer,
    onToggleChat,
    onSwapSidebarPositions,
    onSelectFile,
    onCreateFile,
    onCreateFolder,
    onRenamePath,
    onDeletePath,
    onCodeChange,
    onCursorChange,
    onManualInteraction,
    onSendChat,
    onFollowHost,
    showFollowHost,
}: EditorWorkspaceProps) {
    const cursorRef = useRef({ line: 1, column: 1 });
    const chatEnabledRef = useRef(chatEnabled);
    chatEnabledRef.current = chatEnabled;

    useKeyboardShortcuts({
        toggleLeftSidebar: () => {
            const panel = getSidePanelOnSide('left', layout, chatEnabledRef.current);
            if (panel === 'explorer') onToggleExplorer();
            else if (panel === 'chat') onToggleChat();
        },
        toggleRightSidebar: () => {
            const panel = getSidePanelOnSide('right', layout, chatEnabledRef.current);
            if (panel === 'explorer') onToggleExplorer();
            else if (panel === 'chat') onToggleChat();
        },
        swapSidebarPositions: onSwapSidebarPositions,
        focusChat: chatEnabled ? focusChatInput : () => {},
    });

    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, [
        layout.explorerVisible,
        layout.chatVisible,
        layout.explorerPosition,
        layout.chatPosition,
        chatEnabled,
    ]);

    const renderSidebar = (side: SidebarAlignment) => {
        const panel = getSidePanelOnSide(side, layout, chatEnabled);
        if (!panel) return null;

        const visible = isPanelVisible(panel, layout);
        const onToggle = panel === 'explorer' ? onToggleExplorer : onToggleChat;

        if (!visible) {
            const label = panel === 'explorer' ? 'Show Explorer' : 'Show Chat';
            return <CollapsedPanelButton key={side} label={label} side={side} onClick={onToggle} />;
        }

        const widthClass = panel === 'chat' ? 'w-80' : 'w-64';

        return (
            <div key={side} className={`flex h-full shrink-0 flex-col min-h-0 ${widthClass}`}>
                {panel === 'explorer' ? (
                    <FileExplorer
                        nodes={fileNodes}
                        activeFileId={activeFileId}
                        visible
                        onToggle={onToggleExplorer}
                        onSelectFile={onSelectFile}
                        readOnly={!onCreateFile}
                        onCreateFile={onCreateFile}
                        onCreateFolder={onCreateFolder}
                        onRename={onRenamePath}
                        onDelete={onDeletePath}
                    />
                ) : (
                    <LiveChat
                        messages={messages}
                        onSend={onSendChat}
                        visible
                        onToggle={onToggleChat}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="relative flex min-h-0 min-w-0 flex-1 w-full">
            {showFollowHost && onFollowHost && (
                <button
                    type="button"
                    className="absolute right-4 top-2 z-10 rounded border border-primary px-2 py-1 text-xs text-primary"
                    onClick={onFollowHost}
                >
                    Follow Host
                </button>
            )}

            {renderSidebar('left')}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <EditorTabHeader activeFileId={activeFileId} />
                <CodeEditor
                    language={language}
                    value={code}
                    readOnly={readOnly}
                    onChange={onCodeChange}
                    onCursorChange={(position) => {
                        cursorRef.current = position;
                        onCursorChange?.(position);
                    }}
                    onManualInteraction={onManualInteraction}
                />
            </div>

            {renderSidebar('right')}
        </div>
    );
}
