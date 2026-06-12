import { useCallback, useEffect, useRef } from 'react';
import { CollapsedSidebarRail } from '@/components/CollapsedSidebarRail';
import { useCollapsedChatUnread } from '@/hooks/useCollapsedChatUnread';
import { CodeEditor, focusCodeEditor, type CodeEditorHandle } from '@/components/CodeEditor';
import { monacoLanguageFromPath } from '@/lib/files';
import type { CursorCoordinates, MonacoContentChange } from '@/lib/code-stream';
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
    code: string;
    activeFileId: string;
    fileNodes: FileNode[];
    messages: ChatMessage[];
    readOnly: boolean;
    chatEnabled: boolean;
    liveRemote?: boolean;
    editorRevision?: number;
    editorContentReady?: boolean;
    showHostCursor?: boolean;
    layout: EditorLayoutMatrix;
    isFollowingHost?: boolean;
    followHostEnabled?: boolean;
    editorFocusEnabled?: boolean;
    onToggleExplorer: () => void;
    onToggleChat: () => void;
    onSwapSidebarPositions: () => void;
    onSelectFile: (fileId: string) => void;
    onCreateFile?: (parentNodePath: string, name: string) => void;
    onCreateFolder?: (parentNodePath: string, name: string) => void;
    onRenamePath?: (nodePath: string, name: string) => void;
    onDeletePath?: (nodePath: string) => void;
    onCodeChange: (value: string) => void;
    onModelContentChange?: (
        changes: MonacoContentChange[],
        value: string,
        cursor: CursorCoordinates,
    ) => void;
    onCursorChange?: (position: CursorCoordinates) => void;
    onRegisterEditorHandle?: (handle: CodeEditorHandle | null) => void;
    onEditorReady?: () => void;
    onSendChat: (text: string) => void;
    onToggleFollowHost?: () => void;
}

export function EditorWorkspace({
    code,
    activeFileId,
    fileNodes,
    messages,
    readOnly,
    chatEnabled,
    liveRemote,
    editorRevision = 0,
    editorContentReady = true,
    showHostCursor = false,
    layout,
    isFollowingHost,
    followHostEnabled,
    editorFocusEnabled,
    onToggleExplorer,
    onToggleChat,
    onSwapSidebarPositions,
    onSelectFile,
    onCreateFile,
    onCreateFolder,
    onRenamePath,
    onDeletePath,
    onCodeChange,
    onModelContentChange,
    onCursorChange,
    onRegisterEditorHandle,
    onEditorReady,
    onSendChat,
    onToggleFollowHost,
}: EditorWorkspaceProps) {
    const cursorRef = useRef<CursorCoordinates>({ line: 1, column: 1 });
    const editorHandleRef = useRef<CodeEditorHandle | null>(null);
    const chatEnabledRef = useRef(chatEnabled);
    const layoutRef = useRef(layout);
    chatEnabledRef.current = chatEnabled;
    layoutRef.current = layout;

    const unreadChatCount = useCollapsedChatUnread(
        messages,
        layout.chatVisible,
        chatEnabled,
    );

    const focusChatWithExpand = useCallback(() => {
        if (!chatEnabledRef.current) return;
        if (!layoutRef.current.chatVisible) {
            onToggleChat();
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => focusChatInput());
        });
    }, [onToggleChat]);

    useKeyboardShortcuts({
        toggleLeftSidebar: () => {
            const panel = getSidePanelOnSide('left', layoutRef.current, chatEnabledRef.current);
            if (panel === 'explorer') onToggleExplorer();
            else if (panel === 'chat') onToggleChat();
        },
        toggleRightSidebar: () => {
            const panel = getSidePanelOnSide('right', layoutRef.current, chatEnabledRef.current);
            if (panel === 'explorer') onToggleExplorer();
            else if (panel === 'chat') onToggleChat();
        },
        swapSidebarPositions: onSwapSidebarPositions,
        focusChat: focusChatWithExpand,
        focusEditor: editorFocusEnabled ? focusCodeEditor : undefined,
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
            return (
                <CollapsedSidebarRail
                    key={side}
                    side={side}
                    panel={panel}
                    onExpand={onToggle}
                    unreadChatCount={panel === 'chat' ? unreadChatCount : undefined}
                />
            );
        }

        const widthClass = panel === 'chat' ? 'w-80' : 'w-64';

        return (
            <div key={side} className={`flex h-full shrink-0 flex-col min-h-0 ${widthClass}`}>
                {panel === 'explorer' ? (
                    <FileExplorer
                        nodes={fileNodes}
                        activeFileId={activeFileId}
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
                        onToggle={onToggleChat}
                        collapseSide={layout.chatPosition}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="relative flex min-h-0 min-w-0 flex-1 w-full">
            {renderSidebar('left')}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <EditorTabHeader
                    activeFileId={activeFileId}
                    followHostEnabled={followHostEnabled}
                    isFollowingHost={isFollowingHost}
                    onToggleFollowHost={onToggleFollowHost}
                />
                {editorContentReady ? (
                    <CodeEditor
                    key={
                        liveRemote
                            ? `${activeFileId}:${editorRevision}`
                            : `${activeFileId}:${monacoLanguageFromPath(activeFileId)}`
                    }
                    ref={(handle) => {
                        editorHandleRef.current = handle;
                        onRegisterEditorHandle?.(handle);
                    }}
                    language={monacoLanguageFromPath(activeFileId)}
                    fileId={activeFileId}
                    value={code}
                    readOnly={readOnly}
                    liveRemote={liveRemote}
                    editorRevision={editorRevision}
                    showHostCursor={showHostCursor}
                    onChange={onCodeChange}
                    onModelContentChange={onModelContentChange}
                    onCursorChange={(position) => {
                        cursorRef.current = position;
                        onCursorChange?.(position);
                    }}
                    onEditorReady={onEditorReady}
                    />
                ) : (
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                        Loading editor...
                    </div>
                )}
            </div>

            {renderSidebar('right')}
        </div>
    );
}
