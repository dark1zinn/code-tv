import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '@/components/LiveChat';
import { DEFAULT_ACTIVE_FILE_ID, flatFilesToTree, type FlatFile } from '@/lib/files';
import type { ViewerContext } from './useLiveRoute';

export function useLiveSession(
    viewer: ViewerContext | null,
    mode: 'watch' | 'replay' | null,
    emit: (event: string, payload?: unknown) => Promise<unknown>,
    on: (event: string, handler: (payload: unknown) => void) => () => void,
    connected: boolean,
) {
    const isWatchMode = mode === 'watch' && viewer?.isLive === true;
    const [liveFiles, setLiveFiles] = useState<FlatFile[]>(viewer?.files ?? []);

    const { nodes, fileMap } = useMemo(() => flatFilesToTree(liveFiles), [liveFiles]);

    const firstFileId = Object.keys(fileMap)[0] ?? DEFAULT_ACTIVE_FILE_ID;

    const [activeFileId, setActiveFileId] = useState(firstFileId);
    const [code, setCode] = useState(fileMap[firstFileId] ?? 'export {}\n');
    const [isFollowingHost, setIsFollowingHost] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const activeFileIdRef = useRef(activeFileId);
    const isFollowingHostRef = useRef(isFollowingHost);

    useEffect(() => {
        activeFileIdRef.current = activeFileId;
    }, [activeFileId]);

    useEffect(() => {
        isFollowingHostRef.current = isFollowingHost;
    }, [isFollowingHost]);

    useEffect(() => {
        if (!viewer) return;

        const initialFiles = viewer.files ?? [];
        setLiveFiles(initialFiles);
        const { fileMap: initialMap } = flatFilesToTree(initialFiles);
        const id = Object.keys(initialMap)[0] ?? DEFAULT_ACTIVE_FILE_ID;
        setActiveFileId(id);
        setCode(initialMap[id] ?? 'export {}\n');
        if (!isWatchMode) {
            setMessages([]);
            setIsFollowingHost(false);
        }
    }, [viewer?.workspaceId, isWatchMode]);

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
        const unsubFiles = on('files:stream', (payload) => {
            const data = payload as {
                files: FlatFile[];
                activeFileId: string;
                fileValueString: string;
            };
            setLiveFiles(data.files);
            const { fileMap: nextMap } = flatFilesToTree(data.files);
            if (isFollowingHostRef.current) {
                setActiveFileId(data.activeFileId);
                setCode(data.fileValueString);
                return;
            }
            const currentId = activeFileIdRef.current;
            if (nextMap[currentId]) {
                setCode(nextMap[currentId] ?? '');
                return;
            }
            const fallback = Object.keys(nextMap)[0];
            if (fallback) {
                setActiveFileId(fallback);
                setCode(nextMap[fallback] ?? '');
            }
        });

        return () => {
            unsubHistory();
            unsubMessage();
            unsubCode();
            unsubFiles();
        };
    }, [isWatchMode, on]);

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
