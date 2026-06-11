import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppNavbar } from '@/components/AppNavbar';
import { EditorWorkspace } from '@/components/EditorWorkspace';
import { useSocketContext } from '@/context/SocketContext';
import { useEditorLayout } from '@/hooks/useEditorLayout';
import { useHostSession, type WorkspaceData } from '@/hooks/useHostSession';
import { closeStreamById } from '@/lib/stream';

export function CodeEditorPage() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const { connected, emit, on } = useSocketContext();
    const { layout, toggleExplorer, toggleChat, swapSidebarPositions } = useEditorLayout();
    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [streamId, setStreamId] = useState<string | null>(null);
    const [username, setUsername] = useState('Host');
    const started = useRef(false);
    const streamIdRef = useRef<string | null>(null);
    const cursorRef = useRef({ line: 1, column: 1 });

    useEffect(() => {
        streamIdRef.current = streamId;
    }, [streamId]);

    const endHosting = useCallback(async () => {
        const id = streamIdRef.current;
        if (!id) return;
        streamIdRef.current = null;
        setStreamId(null);
        await closeStreamById(id);
        try {
            await emit('room:close', id);
        } catch {
            // REST close is authoritative
        }
    }, [emit]);

    useEffect(() => {
        if (!workspaceId) return;

        async function bootstrap() {
            const profile = (await fetch('/_api/profile').then((r) => r.json())) as {
                username: string;
            };
            setUsername(profile.username);

            const ws = (await fetch(`/_api/workspaces/${workspaceId}`).then((r) => r.json())) as WorkspaceData;
            setWorkspace(ws);

            if (!started.current) {
                started.current = true;
                const stream = (await fetch('/_api/streams', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        workspaceId: ws.id,
                        title: ws.title,
                        language: ws.language,
                    }),
                }).then((r) => r.json())) as { id: string };
                setStreamId(stream.id);
                streamIdRef.current = stream.id;
            }
        }

        void bootstrap();

        return () => {
            started.current = false;
            const id = streamIdRef.current;
            if (id) {
                streamIdRef.current = null;
                void closeStreamById(id);
            }
        };
    }, [workspaceId]);

    const session = useHostSession(workspace, streamId, emit, on, connected);

    const handleStop = async () => {
        await endHosting();
        navigate('/');
    };

    const handleLeaveHosting = async () => {
        await endHosting();
        navigate('/');
    };

    if (!workspace) {
        return (
            <div className="flex h-screen flex-col bg-background">
                <AppNavbar username={username} onUsernameChange={setUsername} />
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                    Loading workspace...
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-background">
            <AppNavbar
                username={username}
                onUsernameChange={setUsername}
                connected={connected}
                onStopStreaming={() => void handleStop()}
                onLeaveHosting={() => handleLeaveHosting()}
                onSwapSidebarPositions={swapSidebarPositions}
            />
            <EditorWorkspace
                code={session.code}
                activeFileId={session.activeFileId}
                fileNodes={session.fileNodes}
                messages={session.messages}
                readOnly={session.readOnly}
                chatEnabled
                layout={layout}
                onToggleExplorer={toggleExplorer}
                onToggleChat={toggleChat}
                onSwapSidebarPositions={swapSidebarPositions}
                onSelectFile={session.selectFile}
                onCreateFile={(parent, name) => void session.createFile(parent, name)}
                onCreateFolder={(parent, name) => void session.createFolder(parent, name)}
                onRenamePath={(path, name) => void session.renamePath(path, name)}
                onDeletePath={(path) => void session.deletePath(path)}
                onCodeChange={(value) => {
                    session.setCode(value);
                    session.persistWorkspace(value, session.activeFileId);
                    void session.streamCode(value, cursorRef.current);
                }}
                onCursorChange={(position) => {
                    cursorRef.current = position;
                    void session.streamCode(session.code, position);
                }}
                onSendChat={(text) => void session.sendChat(text)}
            />
        </div>
    );
}
