import { useEffect, useState } from 'react';
import { AppNavbar } from '@/components/AppNavbar';
import { EditorWorkspace } from '@/components/EditorWorkspace';
import { useSocketContext } from '@/context/SocketContext';
import { useEditorLayout } from '@/hooks/useEditorLayout';
import { useLiveRoute } from '@/hooks/useLiveRoute';
import { useLiveSession } from '@/hooks/useLiveSession';

export function LivePage() {
    const { connected, emit, on } = useSocketContext();
    const { viewer, mode, loading } = useLiveRoute();
    const [username, setUsername] = useState('Viewer');

    const chatEnabled = mode === 'watch';
    const { layout, toggleExplorer, toggleChat, setLayout } = useEditorLayout({
        chatVisible: chatEnabled,
    });

    useEffect(() => {
        setLayout((current) => ({ ...current, chatVisible: chatEnabled }));
    }, [chatEnabled, setLayout]);

    useEffect(() => {
        void fetch('/_api/profile')
            .then((res) => res.json())
            .then((body: { username: string }) => setUsername(body.username));
    }, []);

    const session = useLiveSession(viewer, mode, emit, on, connected && mode === 'watch');

    if (loading || !viewer || !mode) {
        return (
            <div className="flex h-screen flex-col bg-background">
                <AppNavbar username={username} onUsernameChange={setUsername} />
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                    Loading stream...
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-background">
            <AppNavbar
                username={username}
                onUsernameChange={setUsername}
                connected={mode === 'watch' ? connected : undefined}
                badge={mode === 'replay' ? 'Replay' : undefined}
            />
            <EditorWorkspace
                language={session.language}
                code={session.code}
                activeFileId={session.activeFileId}
                fileNodes={session.fileNodes}
                messages={session.messages}
                readOnly={session.readOnly}
                chatEnabled={chatEnabled}
                layout={layout}
                isFollowingHost={session.isFollowingHost}
                onToggleExplorer={toggleExplorer}
                onToggleChat={toggleChat}
                onSelectFile={session.selectFile}
                onCodeChange={() => {}}
                onManualInteraction={() => session.setIsFollowingHost(false)}
                onSendChat={(text) => void session.sendChat(text)}
                onFollowHost={() => session.setIsFollowingHost(true)}
                showFollowHost={mode === 'watch' && !session.isFollowingHost}
            />
        </div>
    );
}
