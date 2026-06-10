import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '@/components/LiveChat';
import { flatFilesToTree } from '@/lib/files';

export interface WorkspaceData {
    id: string;
    title: string;
    language: string;
    files: Array<{ path: string; content: string }>;
}

export function useHostSession(
    workspace: WorkspaceData | null,
    streamId: string | null,
    emit: (event: string, payload?: unknown) => Promise<unknown>,
    on: (event: string, handler: (payload: unknown) => void) => () => void,
    connected: boolean,
) {
    const { nodes, fileMap } = useMemo(
        () => flatFilesToTree(workspace?.files ?? []),
        [workspace?.files],
    );

    const firstFileId = Object.keys(fileMap)[0] ?? 'root/src/main.ts';
    const [activeFileId, setActiveFileId] = useState(firstFileId);
    const [code, setCode] = useState(fileMap[firstFileId] ?? 'export {}\n');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileMapRef = useRef(fileMap);

    useEffect(() => {
        fileMapRef.current = fileMap;
    }, [fileMap]);

    useEffect(() => {
        if (!workspace) return;
        const id = Object.keys(fileMap)[0] ?? 'root/src/main.ts';
        setActiveFileId(id);
        setCode(fileMap[id] ?? 'export {}\n');
    }, [workspace, fileMap]);

    useEffect(() => {
        if (!connected || !streamId) return;
        void emit('room:host-join', streamId);
    }, [connected, streamId, emit]);

    useEffect(() => {
        const unsubHistory = on('chat:history', (history) => {
            setMessages(history as ChatMessage[]);
        });
        const unsubMessage = on('chat:message', (message) => {
            setMessages((current) => [...current, message as ChatMessage]);
        });
        return () => {
            unsubHistory();
            unsubMessage();
        };
    }, [on]);

    const persistWorkspace = useCallback(
        (nextCode: string, fileId: string) => {
            if (!workspace) return;
            if (persistTimer.current) clearTimeout(persistTimer.current);
            persistTimer.current = setTimeout(() => {
                const path = fileId.replace(/^root\//, '');
                const files = Object.entries(fileMapRef.current).map(([id, content]) => ({
                    path: id.replace(/^root\//, ''),
                    content: id === fileId ? nextCode : content,
                }));
                if (!files.some((f) => f.path === path)) {
                    files.push({ path, content: nextCode });
                }
                void fetch(`/_api/workspaces/${workspace.id}`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ files }),
                });
            }, 800);
        },
        [workspace],
    );

    const streamCode = useCallback(
        async (nextCode: string, cursor: { line: number; column: number }) => {
            if (!streamId) return;
            await emit('code:stream', {
                roomSlug: streamId,
                activeFileId,
                fileValueString: nextCode,
                cursorCoordinates: cursor,
            });
        },
        [emit, streamId, activeFileId],
    );

    const sendChat = useCallback(
        async (text: string) => {
            if (!streamId) return;
            await emit('chat:send', { roomSlug: streamId, messageText: text });
        },
        [emit, streamId],
    );

    const stopStreaming = useCallback(async () => {
        if (!streamId) return;
        await emit('room:close', streamId);
    }, [emit, streamId]);

    const selectFile = useCallback(
        (fileId: string) => {
            setActiveFileId(fileId);
            setCode(fileMap[fileId] ?? '');
        },
        [fileMap],
    );

    return {
        language: workspace?.language ?? 'typescript',
        activeFileId,
        code,
        messages,
        fileNodes: nodes,
        selectFile,
        setCode,
        streamCode,
        sendChat,
        stopStreaming,
        persistWorkspace,
        readOnly: false,
    };
}
