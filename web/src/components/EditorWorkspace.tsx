import { useRef } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { FileExplorer, type FileNode } from '@/components/FileExplorer';
import { focusChatInput, LiveChat, type ChatMessage } from '@/components/LiveChat';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getOrderClass, type EditorLayoutMatrix } from '@/hooks/useEditorLayout';

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
    onSelectFile: (fileId: string) => void;
    onCodeChange: (value: string) => void;
    onCursorChange?: (position: { line: number; column: number }) => void;
    onManualInteraction?: () => void;
    onSendChat: (text: string) => void;
    onFollowHost?: () => void;
    showFollowHost?: boolean;
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
    onSelectFile,
    onCodeChange,
    onCursorChange,
    onManualInteraction,
    onSendChat,
    onFollowHost,
    showFollowHost,
}: EditorWorkspaceProps) {
    const cursorRef = useRef({ line: 1, column: 1 });

    useKeyboardShortcuts({
        toggleExplorer: onToggleExplorer,
        focusChat: chatEnabled ? focusChatInput : () => {},
    });

    return (
        <div className="relative flex min-h-0 flex-1">
            {showFollowHost && onFollowHost && (
                <button
                    type="button"
                    className="absolute right-4 top-2 z-10 rounded border border-primary px-2 py-1 text-xs text-primary"
                    onClick={onFollowHost}
                >
                    Follow Host
                </button>
            )}
            {layout.explorerVisible && (
                <div className={getOrderClass('explorer', layout)}>
                    <FileExplorer
                        nodes={fileNodes}
                        activeFileId={activeFileId}
                        visible={layout.explorerVisible}
                        onToggle={onToggleExplorer}
                        onSelectFile={onSelectFile}
                    />
                </div>
            )}

            <div className={getOrderClass('editor', layout)}>
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

            {chatEnabled && layout.chatVisible && (
                <div className={getOrderClass('chat', layout)}>
                    <LiveChat
                        messages={messages}
                        onSend={onSendChat}
                        visible={layout.chatVisible}
                        onToggle={onToggleChat}
                    />
                </div>
            )}
        </div>
    );
}
