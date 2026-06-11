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
import {
    flatFilesToTree,
    fileContentById,
    fileIdToPath,
    pathToFileId,
    upsertFileContent,
    type FlatFile,
} from '@/lib/files';

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
    const filesRef = useRef(files);
    const activeFileIdRef = useRef(activeFileId);
    const codeRef = useRef(code);

    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    useEffect(() => {
        activeFileIdRef.current = activeFileId;
    }, [activeFileId]);

    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    useEffect(() => {
        if (!workspace) return;

        setFiles(workspace.files);
        const { fileMap: initialMap } = flatFilesToTree(workspace.files);
        const id = Object.keys(initialMap)[0];
        if (!id) return;
        setActiveFileId(id);
        setCode(initialMap[id] ?? 'export {}\n');
    }, [workspace?.id]);

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
            const nextActiveId = options?.activeFileId ?? activeFileIdRef.current;
            const nextCode =
                options?.code ?? fileContentById(nextFiles, nextActiveId) ?? codeRef.current;

            setFiles(nextFiles);
            setActiveFileId(nextActiveId);
            setCode(nextCode);
            await persistFiles(nextFiles);
            await broadcastFiles(nextFiles, nextActiveId, nextCode);
        },
        [persistFiles, broadcastFiles],
    );

    const flushPendingPersist = useCallback(() => {
        if (!persistTimer.current) return;
        clearTimeout(persistTimer.current);
        persistTimer.current = null;

        const fileId = activeFileIdRef.current;
        const nextFiles = upsertFileContent(filesRef.current, fileId, codeRef.current);
        filesRef.current = nextFiles;
        setFiles(nextFiles);
    }, []);

    const persistWorkspace = useCallback(
        (nextCode: string, fileId: string) => {
            if (!workspace) return;
            if (persistTimer.current) clearTimeout(persistTimer.current);
            persistTimer.current = setTimeout(() => {
                persistTimer.current = null;
                const nextFiles = upsertFileContent(filesRef.current, fileId, nextCode);
                void applyFiles(nextFiles, { activeFileId: fileId, code: nextCode });
            }, 800);
        },
        [workspace, applyFiles],
    );

    const streamCode = useCallback(
        async (nextCode: string, cursor: { line: number; column: number }) => {
            if (!streamId) return;
            await emit('code:stream', {
                roomSlug: streamId,
                activeFileId: activeFileIdRef.current,
                fileValueString: nextCode,
                cursorCoordinates: cursor,
            });
        },
        [emit, streamId],
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

    const selectFile = useCallback((fileId: string) => {
        if (fileId === activeFileIdRef.current) return;

        flushPendingPersist();

        const currentId = activeFileIdRef.current;
        const nextFiles = upsertFileContent(filesRef.current, currentId, codeRef.current);
        filesRef.current = nextFiles;
        setFiles(nextFiles);
        setActiveFileId(fileId);
        setCode(fileContentById(nextFiles, fileId));
    }, [flushPendingPersist]);

    const createFile = useCallback(
        async (parentNodePath: string, name: string) => {
            try {
                flushPendingPersist();
                const parentPath =
                    parentNodePath === 'root' ? '' : fileIdToPath(parentNodePath);
                const nextFiles = createFileEntry(filesRef.current, parentPath, name);
                const created = nextFiles[nextFiles.length - 1]!;
                await applyFiles(nextFiles, {
                    activeFileId: pathToFileId(created.path),
                    code: created.content,
                });
            } catch {
                // invalid or duplicate name
            }
        },
        [applyFiles, flushPendingPersist],
    );

    const createFolder = useCallback(
        async (parentNodePath: string, name: string) => {
            try {
                flushPendingPersist();
                const parentPath =
                    parentNodePath === 'root' ? '' : fileIdToPath(parentNodePath);
                const nextFiles = createFolderEntry(filesRef.current, parentPath, name);
                await applyFiles(nextFiles);
            } catch {
                // invalid or duplicate name
            }
        },
        [applyFiles, flushPendingPersist],
    );

    const renamePath = useCallback(
        async (nodePath: string, nextName: string) => {
            try {
                flushPendingPersist();
                const nextFiles = renameEntry(filesRef.current, nodePath, nextName);
                const nextActiveId = remapActiveFileId(
                    activeFileIdRef.current,
                    nodePath,
                    nextName,
                );
                await applyFiles(nextFiles, {
                    activeFileId: nextActiveId,
                    code: fileContentById(nextFiles, nextActiveId),
                });
            } catch {
                // invalid or duplicate name
            }
        },
        [applyFiles, flushPendingPersist],
    );

    const deletePath = useCallback(
        async (nodePath: string) => {
            flushPendingPersist();
            const nextFiles = deleteEntry(filesRef.current, nodePath);
            if (nextFiles.length === 0) return;
            const fallbackId =
                pickFallbackFileId(nextFiles, nodePath) ??
                pathToFileId(nextFiles.find((f) => !f.path.endsWith('/.gitkeep'))!.path);
            await applyFiles(nextFiles, {
                activeFileId: fallbackId,
                code: fileContentById(nextFiles, fallbackId),
            });
        },
        [applyFiles, flushPendingPersist],
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
