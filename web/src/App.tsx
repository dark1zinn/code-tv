import { useRef } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { FileExplorer } from './components/FileExplorer';
import { focusChatInput, LiveChat } from './components/LiveChat';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSocket } from './hooks/useSocket';
import { useStreamSession } from './hooks/useStreamSession';
import { getOrderClass, useWorkspaceLayout } from './hooks/useWorkspaceLayout';

export default function App() {
    const { connected, emit, on } = useSocket();
    const { layout, toggleExplorer, toggleChat } = useWorkspaceLayout();
    const { state, setState, streamCode, sendChat, fileNodes } = useStreamSession(
        emit,
        on,
        connected,
    );
    const cursorRef = useRef({ line: 1, column: 1 });

    useKeyboardShortcuts({
        toggleExplorer,
        focusChat: focusChatInput,
    });

    return (
        <div className="flex h-screen flex-col bg-bg-base text-white">
            <header className="flex items-center justify-between border-b border-divider bg-bg-sidecar px-4 py-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold text-accent">codeTV</h1>
                    <span className="text-sm text-gray-400">
                        {state.profile?.username ?? 'Connecting...'}
                    </span>
                    {state.roomSlug && (
                        <span className="rounded bg-bg-base px-2 py-0.5 text-xs">
                            {state.roomSlug}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className={connected ? 'text-green-400' : 'text-red-400'}>
                        {connected ? 'Connected' : 'Offline'}
                    </span>
                    {!state.isHost && !state.isFollowingHost && (
                        <button
                            type="button"
                            className="rounded border border-accent px-2 py-1 text-accent"
                            onClick={() =>
                                setState((current) => ({ ...current, isFollowingHost: true }))
                            }
                        >
                            Follow Host
                        </button>
                    )}
                </div>
            </header>

            <div className="relative flex min-h-0 flex-1">
                {layout.explorerVisible && (
                    <div className={getOrderClass('explorer', layout)}>
                        <FileExplorer
                            nodes={fileNodes}
                            activeFileId={state.activeFileId}
                            visible={layout.explorerVisible}
                            onToggle={toggleExplorer}
                            onSelectFile={(fileId) => {
                                setState((current) => ({
                                    ...current,
                                    activeFileId: fileId,
                                    isFollowingHost: false,
                                }));
                            }}
                        />
                    </div>
                )}

                <div className={getOrderClass('editor', layout)}>
                    <CodeEditor
                        language={state.language}
                        value={state.code}
                        readOnly={!state.isHost && state.isFollowingHost}
                        onChange={(value) => {
                            setState((current) => ({ ...current, code: value }));
                            void streamCode(value, cursorRef.current);
                        }}
                        onCursorChange={(position) => {
                            cursorRef.current = position;
                            if (state.isHost) {
                                void streamCode(state.code, position);
                            }
                        }}
                        onManualInteraction={() => {
                            if (!state.isHost) {
                                setState((current) => ({ ...current, isFollowingHost: false }));
                            }
                        }}
                    />
                </div>

                {layout.chatVisible && (
                    <div className={getOrderClass('chat', layout)}>
                        <LiveChat
                            messages={state.messages}
                            onSend={(text) => void sendChat(text)}
                            visible={layout.chatVisible}
                            onToggle={toggleChat}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
