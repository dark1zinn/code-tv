import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatMessage } from '@/components/LiveChat';
import { flatFilesToTree } from '@/lib/files';
import type { ViewerContext } from './useLiveRoute';

export function useLiveSession(
    viewer: ViewerContext | null,
    mode: 'watch' | 'replay' | null,
    emit: (event: string, payload?: unknown) => Promise<unknown>,
    on: (event: string, handler: (payload: unknown) => void) => () => void,
    connected: boolean,
) {
    const isWatchMode = mode === 'watch' && viewer?.isLive === true;

    const { nodes, fileMap } = useMemo(
        () => flatFilesToTree(viewer?.files ?? []),
        [viewer?.files],
    );

    const firstFileId = Object.keys(fileMap)[0] ?? 'root/src/main.ts';

    const [activeFileId, setActiveFileId] = useState(firstFileId);
    const [code, setCode] = useState(fileMap[firstFileId] ?? 'export {}\n');
    const [isFollowingHost, setIsFollowingHost] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (!viewer) return;
        const id = Object.keys(fileMap)[0] ?? 'root/src/main.ts';
        setActiveFileId(id);
        setCode(fileMap[id] ?? 'export {}\n');
        if (!isWatchMode) {
            setMessages([]);
            setIsFollowingHost(false);
        }
    }, [viewer, fileMap, isWatchMode]);

    useEffect(() => {
        if (!isWatchMode || !connected || !viewer?.streamId) return;
        void emit('room:join', viewer.streamId);
    }, [isWatchMode, connected, viewer?.streamId, emit]);

    useEffect(() => {
        if (!isWatchMode) return;

        const unsubHistory = on('chat:history', (history) => {
            setMessages(history as ChatMessage[]);
        });
        const unsubMessage = on('chat:message', (message) => {
            setMessages((current) => [...current, message as ChatMessage]);
        });
        const unsubCode = on('code:stream', (payload) => {
            const data = payload as {
                activeFileId: string;
                fileValueString: string;
            };
            if (!isFollowingHost) return;
            setActiveFileId(data.activeFileId);
            setCode(data.fileValueString);
        });

        return () => {
            unsubHistory();
            unsubMessage();
            unsubCode();
        };
    }, [isWatchMode, on, isFollowingHost]);

    const sendChat = useCallback(
        async (text: string) => {
            if (!isWatchMode || !viewer?.streamId) return;
            await emit('chat:send', { roomSlug: viewer.streamId, messageText: text });
        },
        [emit, viewer?.streamId, isWatchMode],
    );

    const selectFile = useCallback(
        (fileId: string) => {
            setActiveFileId(fileId);
            setCode(fileMap[fileId] ?? '');
            if (isWatchMode) setIsFollowingHost(false);
        },
        [fileMap, isWatchMode],
    );

    return {
        language: viewer?.language ?? 'typescript',
        activeFileId,
        code,
        messages,
        fileNodes: nodes,
        isFollowingHost,
        setIsFollowingHost,
        selectFile,
        sendChat,
        readOnly: true,
        isWatchMode,
    };
}
