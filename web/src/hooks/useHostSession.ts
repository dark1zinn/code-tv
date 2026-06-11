import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '@/components/LiveChat';
import {
    createFileEntry,
    createFolderEntry,
    deleteEntry,
    pickFallbackFileId,
    remapActiveFileId,
    renameEntry,
} from '@/lib/file-tree';
import { flatFilesToTree, fileIdToPath, pathToFileId, type FlatFile } from '@/lib/files';

export interface WorkspaceData {
    id: string;
    title: string;
    tags: string[];
    language: string;
    files: FlatFile[];
}

export function useHostSession(
    workspace: WorkspaceData | null,
    streamId: string | null,
    emit: (event: string, payload?: unknown) => Promise<unknown>,
    on: (event: string, handler: (payload: unknown) => void) => () => void,
    connected: boolean,
) {
    const [files, setFiles] = useState<FlatFile[]>([]);
    const { nodes, fileMap } = useMemo(() => flatFilesToTree(files), [files]);

    const firstFileId = Object.keys(fileMap)[0] ?? 'root/src/main.ts';
    const [activeFileId, setActiveFileId] = useState(firstFileId);
    const [code, setCode] = useState(fileMap[firstFileId] ?? 'export {}\n');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileMapRef = useRef(fileMap);
    const activeFileIdRef = useRef(activeFileId);
    const codeRef = useRef(code);

    useEffect(() => {
        fileMapRef.current = fileMap;
    }, [fileMap]);

    useEffect(() => {
        activeFileIdRef.current = activeFileId;
    }, [activeFileId]);

    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    useEffect(() => {
        if (!workspace) return;
        setFiles(workspace.files);
    }, [workspace?.id, workspace?.files]);

    useEffect(() => {
        if (!workspace) return;
        const id = Object.keys(fileMap)[0];
        if (!id) return;
        setActiveFileId(id);
        setCode(fileMap[id] ?? 'export {}\n');
    }, [workspace?.id, fileMap]);

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

    const persistFiles = useCallback(
        async (nextFiles: FlatFile[]) => {
            if (!workspace) return;
            await fetch(`/_api/workspaces/${workspace.id}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ files: nextFiles }),
            });
        },
        [workspace],
    );

    const broadcastFiles = useCallback(
        async (nextFiles: FlatFile[], nextActiveId: string, nextCode: string) => {
            if (!streamId) return;
            await emit('files:stream', {
                roomSlug: streamId,
                files: nextFiles,
                activeFileId: nextActiveId,
                fileValueString: nextCode,
            });
        },
        [emit, streamId],
    );

    const applyFiles = useCallback(
        async (
            nextFiles: FlatFile[],
            options?: { activeFileId?: string; code?: string },
        ) => {
            const { fileMap: nextMap } = flatFilesToTree(nextFiles);
            const nextActiveId = options?.activeFileId ?? activeFileIdRef.current;
            const nextCode = options?.code ?? nextMap[nextActiveId] ?? codeRef.current;

            setFiles(nextFiles);
            setActiveFileId(nextActiveId);
            setCode(nextCode);
            await persistFiles(nextFiles);
            await broadcastFiles(nextFiles, nextActiveId, nextCode);
        },
        [persistFiles, broadcastFiles],
    );

    const persistWorkspace = useCallback(
        (nextCode: string, fileId: string) => {
            if (!workspace) return;
            if (persistTimer.current) clearTimeout(persistTimer.current);
            persistTimer.current = setTimeout(() => {
                const path = fileIdToPath(fileId);
                const nextFiles = files.map((file) =>
                    file.path === path ? { ...file, content: nextCode } : file,
                );
                if (!nextFiles.some((file) => file.path === path)) {
                    nextFiles.push({ path, content: nextCode });
                }
                void applyFiles(nextFiles, { activeFileId: fileId, code: nextCode });
            }, 800);
        },
        [workspace, files, applyFiles],
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

    const createFile = useCallback(
        async (parentNodePath: string, name: string) => {
            try {
                const parentPath =
                    parentNodePath === 'root' ? '' : fileIdToPath(parentNodePath);
                const nextFiles = createFileEntry(files, parentPath, name);
                const created = nextFiles[nextFiles.length - 1]!;
                await applyFiles(nextFiles, {
                    activeFileId: pathToFileId(created.path),
                    code: created.content,
                });
            } catch {
                // invalid or duplicate name
            }
        },
        [files, applyFiles],
    );

    const createFolder = useCallback(
        async (parentNodePath: string, name: string) => {
            try {
                const parentPath =
                    parentNodePath === 'root' ? '' : fileIdToPath(parentNodePath);
                const nextFiles = createFolderEntry(files, parentPath, name);
                await applyFiles(nextFiles);
            } catch {
                // invalid or duplicate name
            }
        },
        [files, applyFiles],
    );

    const renamePath = useCallback(
        async (nodePath: string, nextName: string) => {
            try {
                const nextFiles = renameEntry(files, nodePath, nextName);
                const nextActiveId = remapActiveFileId(
                    activeFileIdRef.current,
                    nodePath,
                    nextName,
                );
                const { fileMap: nextMap } = flatFilesToTree(nextFiles);
                await applyFiles(nextFiles, {
                    activeFileId: nextActiveId,
                    code: nextMap[nextActiveId] ?? '',
                });
            } catch {
                // invalid or duplicate name
            }
        },
        [files, applyFiles],
    );

    const deletePath = useCallback(
        async (nodePath: string) => {
            const nextFiles = deleteEntry(files, nodePath);
            if (nextFiles.length === 0) return;
            const fallbackId =
                pickFallbackFileId(nextFiles, nodePath) ??
                pathToFileId(nextFiles.find((f) => !f.path.endsWith('/.gitkeep'))!.path);
            const { fileMap: nextMap } = flatFilesToTree(nextFiles);
            await applyFiles(nextFiles, {
                activeFileId: fallbackId,
                code: nextMap[fallbackId] ?? '',
            });
        },
        [files, applyFiles],
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
        createFile,
        createFolder,
        renamePath,
        deletePath,
        readOnly: false,
    };
}
