import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CodeEditorHandle } from '@/components/CodeEditor';
import type { ChatMessage } from '@/components/LiveChat';
import type {
    CodeCursorPayload,
    CodeInputPayload,
    CodeSwitchPayload,
    CursorCoordinates,
    FilesStreamPayload,
} from '@/lib/code-stream';
import { DEFAULT_ACTIVE_FILE_ID, flatFilesToTree, type FlatFile } from '@/lib/files';
import { fetchWorkspaceFileContent } from '@/lib/workspace-files';
import type { ViewerContext } from './useLiveRoute';

function pathsToFlatFiles(files: Array<{ path: string }>): FlatFile[] {
    return files.map((file) => ({ path: file.path, content: '' }));
}

export function useLiveSession(
    viewer: ViewerContext | null,
    mode: 'watch' | 'replay' | null,
    emit: (event: string, payload?: unknown) => Promise<unknown>,
    on: (event: string, handler: (payload: unknown) => void) => () => void,
    connected: boolean,
) {
    const isWatchMode = mode === 'watch' && viewer?.isLive === true;
    const [liveFiles, setLiveFiles] = useState<FlatFile[]>(
        pathsToFlatFiles(viewer?.files ?? []),
    );

    const { nodes } = useMemo(() => flatFilesToTree(liveFiles), [liveFiles]);

    const firstFileId =
        viewer?.files[0]?.path != null
            ? `root/${viewer.files[0].path}`
            : DEFAULT_ACTIVE_FILE_ID;

    const [activeFileId, setActiveFileId] = useState(firstFileId);
    const [code, setCode] = useState('');
    const [editorRevision, setEditorRevision] = useState(0);
    const [isFollowingHost, setIsFollowingHost] = useState(true);
    const [hostActiveFileId, setHostActiveFileId] = useState<string | null>(null);
    const [contentReady, setContentReady] = useState(!isWatchMode);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const activeFileIdRef = useRef(activeFileId);
    const isFollowingHostRef = useRef(isFollowingHost);
    const hostActiveFileIdRef = useRef<string | null>(null);
    const hostLiveContentRef = useRef<string | null>(null);
    const hostLiveCursorRef = useRef<CursorCoordinates | null>(null);
    const streamSyncedFileIdRef = useRef<string | null>(null);
    const editorHandleRef = useRef<CodeEditorHandle | null>(null);
    const inputBufferRef = useRef<CodeInputPayload[]>([]);
    const pendingDocumentRef = useRef<{
        fileId: string;
        content: string;
        cursor?: CursorCoordinates;
    } | null>(null);
    const monacoReadyRef = useRef(false);
    const loadGenerationRef = useRef(0);

    useEffect(() => {
        activeFileIdRef.current = activeFileId;
    }, [activeFileId]);

    useEffect(() => {
        isFollowingHostRef.current = isFollowingHost;
    }, [isFollowingHost]);

    const isHostActiveFile = useCallback((fileId: string) => {
        return hostActiveFileIdRef.current === fileId;
    }, []);

    const usesWsStream = useCallback(
        (fileId: string) => isWatchMode && isHostActiveFile(fileId),
        [isWatchMode, isHostActiveFile],
    );

    const isViewingHostActiveFile =
        isWatchMode && hostActiveFileId !== null && activeFileId === hostActiveFileId;

    const editorContentReady = contentReady;

    const recordHostStream = useCallback(
        (fileId: string, content: string, cursor?: CursorCoordinates) => {
            hostActiveFileIdRef.current = fileId;
            hostLiveContentRef.current = content;
            if (cursor) hostLiveCursorRef.current = cursor;
            setHostActiveFileId(fileId);
        },
        [],
    );

    const applyStreamUpdate = useCallback((payload: CodeInputPayload) => {
        streamSyncedFileIdRef.current = payload.activeFileId;
        pendingDocumentRef.current = {
            fileId: payload.activeFileId,
            content: payload.fileValueString,
            cursor: payload.cursorCoordinates,
        };
        setCode(payload.fileValueString);
        setContentReady(true);

        if (!editorHandleRef.current || !monacoReadyRef.current) {
            return false;
        }

        editorHandleRef.current.setDocument(
            payload.fileValueString,
            payload.cursorCoordinates,
        );
        return true;
    }, []);

    const flushInputBuffer = useCallback(
        (fileId: string) => {
            const buffered = inputBufferRef.current.filter(
                (payload) => payload.activeFileId === fileId,
            );
            inputBufferRef.current = inputBufferRef.current.filter(
                (payload) => payload.activeFileId !== fileId,
            );
            for (const payload of buffered) {
                applyStreamUpdate(payload);
            }
        },
        [applyStreamUpdate],
    );

    const tryFinishDocumentSync = useCallback(
        (fileId: string) => {
            if (!editorHandleRef.current || !monacoReadyRef.current) return;
            flushInputBuffer(fileId);
        },
        [flushInputBuffer],
    );

    const mountDocument = useCallback(
        (
            fileId: string,
            content: string,
            options?: {
                cursor?: CursorCoordinates;
                source?: 'stream' | 'saved';
            },
        ) => {
            const fileChanged = activeFileIdRef.current !== fileId;
            const fromStream = options?.source === 'stream';

            pendingDocumentRef.current = { fileId, content, cursor: options?.cursor };
            setActiveFileId(fileId);
            setCode(content);
            setContentReady(true);

            if (fromStream) {
                streamSyncedFileIdRef.current = fileId;
            } else {
                streamSyncedFileIdRef.current = null;
            }

            if (fileChanged) {
                setEditorRevision((revision) => revision + 1);
                return;
            }

            editorHandleRef.current?.setDocument(content, options?.cursor);
            tryFinishDocumentSync(fileId);
        },
        [tryFinishDocumentSync],
    );

    const openFromStream = useCallback(
        (fileId: string, cursor?: CursorCoordinates) => {
            const content = hostLiveContentRef.current;
            if (content === null) {
                setActiveFileId(fileId);
                setContentReady(false);
                streamSyncedFileIdRef.current = null;
                if (activeFileIdRef.current !== fileId) {
                    setEditorRevision((revision) => revision + 1);
                }
                return;
            }

            mountDocument(fileId, content, {
                cursor: cursor ?? hostLiveCursorRef.current ?? undefined,
                source: 'stream',
            });
        },
        [mountDocument],
    );

    const openFromSaved = useCallback(
        async (fileId: string, options?: { cursor?: CursorCoordinates }) => {
            if (!viewer) return;

            const generation = ++loadGenerationRef.current;
            setContentReady(false);
            streamSyncedFileIdRef.current = null;

            const content = await fetchWorkspaceFileContent(viewer.workspaceId, fileId);
            if (generation !== loadGenerationRef.current) return;

            mountDocument(fileId, content, { cursor: options?.cursor, source: 'saved' });
        },
        [viewer, mountDocument],
    );

    const openFile = useCallback(
        (fileId: string, options?: { cursor?: CursorCoordinates }) => {
            if (usesWsStream(fileId)) {
                openFromStream(fileId, options?.cursor);
                return;
            }
            void openFromSaved(fileId, options);
        },
        [usesWsStream, openFromStream, openFromSaved],
    );

    const shouldReceiveStream = useCallback(
        (fileId: string) =>
            isFollowingHostRef.current || activeFileIdRef.current === fileId,
        [],
    );

    const applyHostInput = useCallback(
        (payload: CodeInputPayload) => {
            recordHostStream(
                payload.activeFileId,
                payload.fileValueString,
                payload.cursorCoordinates,
            );

            if (isFollowingHostRef.current && activeFileIdRef.current !== payload.activeFileId) {
                mountDocument(payload.activeFileId, payload.fileValueString, {
                    cursor: payload.cursorCoordinates,
                    source: 'stream',
                });
                return;
            }

            if (!shouldReceiveStream(payload.activeFileId)) return;
            if (activeFileIdRef.current !== payload.activeFileId) return;

            if (!applyStreamUpdate(payload)) {
                inputBufferRef.current.push(payload);
            }
        },
        [recordHostStream, mountDocument, shouldReceiveStream, applyStreamUpdate],
    );

    const handleCodeSwitch = useCallback(
        (payload: CodeSwitchPayload) => {
            recordHostStream(
                payload.activeFileId,
                payload.fileValueString,
                payload.cursorCoordinates,
            );

            if (isFollowingHostRef.current) {
                mountDocument(payload.activeFileId, payload.fileValueString, {
                    cursor: payload.cursorCoordinates,
                    source: 'stream',
                });
                return;
            }

            if (activeFileIdRef.current === payload.activeFileId) {
                mountDocument(payload.activeFileId, payload.fileValueString, {
                    cursor: payload.cursorCoordinates,
                    source: 'stream',
                });
            }
        },
        [recordHostStream, mountDocument],
    );

    const handleCodeCursor = useCallback(
        (payload: CodeCursorPayload) => {
            recordHostStream(payload.activeFileId, hostLiveContentRef.current ?? '', payload.cursorCoordinates);

            if (!shouldReceiveStream(payload.activeFileId)) return;
            if (activeFileIdRef.current !== payload.activeFileId) return;

            editorHandleRef.current?.setRemoteCursor(payload.cursorCoordinates);
        },
        [recordHostStream, shouldReceiveStream],
    );

    const handleFilesStream = useCallback(
        (payload: FilesStreamPayload) => {
            recordHostStream(
                payload.activeFileId,
                hostLiveContentRef.current ?? '',
                hostLiveCursorRef.current ?? undefined,
            );
            setLiveFiles(pathsToFlatFiles(payload.files));

            if (
                isFollowingHostRef.current &&
                activeFileIdRef.current !== payload.activeFileId
            ) {
                openFromStream(payload.activeFileId);
            }
        },
        [recordHostStream, openFromStream],
    );

    const toggleFollowHost = useCallback(() => {
        if (isFollowingHostRef.current) {
            isFollowingHostRef.current = false;
            setIsFollowingHost(false);
            return;
        }

        isFollowingHostRef.current = true;
        setIsFollowingHost(true);

        if (hostActiveFileIdRef.current) {
            openFromStream(hostActiveFileIdRef.current, hostLiveCursorRef.current ?? undefined);
        }
    }, [openFromStream]);

    const registerEditorHandle = useCallback(
        (handle: CodeEditorHandle | null) => {
            editorHandleRef.current = handle;
            if (!handle) {
                monacoReadyRef.current = false;
                return;
            }

            const pending = pendingDocumentRef.current;
            if (pending) {
                handle.setDocument(pending.content, pending.cursor);
            }
            tryFinishDocumentSync(activeFileIdRef.current);
        },
        [tryFinishDocumentSync],
    );

    const notifyEditorReady = useCallback(() => {
        monacoReadyRef.current = true;
        const pending = pendingDocumentRef.current;
        if (pending && editorHandleRef.current) {
            editorHandleRef.current.setDocument(pending.content, pending.cursor);
        }
        tryFinishDocumentSync(activeFileIdRef.current);
    }, [tryFinishDocumentSync]);

    const applyHostInputRef = useRef(applyHostInput);
    const handleCodeSwitchRef = useRef(handleCodeSwitch);
    const handleCodeCursorRef = useRef(handleCodeCursor);
    const handleFilesStreamRef = useRef(handleFilesStream);
    applyHostInputRef.current = applyHostInput;
    handleCodeSwitchRef.current = handleCodeSwitch;
    handleCodeCursorRef.current = handleCodeCursor;
    handleFilesStreamRef.current = handleFilesStream;

    useEffect(() => {
        if (!viewer) return;

        setLiveFiles(pathsToFlatFiles(viewer.files ?? []));
        hostLiveContentRef.current = null;
        hostLiveCursorRef.current = null;
        streamSyncedFileIdRef.current = null;
        hostActiveFileIdRef.current = null;
        setHostActiveFileId(null);

        if (!isWatchMode) {
            setMessages([]);
            setIsFollowingHost(false);
            isFollowingHostRef.current = false;
            setContentReady(false);
            void openFromSaved(firstFileId);
            return;
        }

        setContentReady(false);
        setActiveFileId(firstFileId);
        setCode('');
    }, [viewer?.workspaceId, isWatchMode, openFromSaved, firstFileId]);

    useEffect(() => {
        if (!isWatchMode || !connected || !viewer?.streamId) return;
        void emit('room:join', viewer.streamId);
    }, [isWatchMode, connected, viewer?.streamId, emit]);

    useEffect(() => {
        if (!isWatchMode || !connected) return;

        const unsubHistory = on('chat:history', (history) => {
            setMessages(history as ChatMessage[]);
        });
        const unsubMessage = on('chat:message', (message) => {
            setMessages((current) => [...current, message as ChatMessage]);
        });
        const unsubInput = on('code:input', (payload) => {
            applyHostInputRef.current(payload as CodeInputPayload);
        });
        const unsubSwitch = on('code:switch', (payload) => {
            handleCodeSwitchRef.current(payload as CodeSwitchPayload);
        });
        const unsubCursor = on('code:cursor', (payload) => {
            handleCodeCursorRef.current(payload as CodeCursorPayload);
        });
        const unsubFiles = on('files:stream', (payload) => {
            handleFilesStreamRef.current(payload as FilesStreamPayload);
        });

        return () => {
            unsubHistory();
            unsubMessage();
            unsubInput();
            unsubSwitch();
            unsubCursor();
            unsubFiles();
        };
    }, [isWatchMode, connected, on]);

    const sendChat = useCallback(
        async (text: string) => {
            if (!isWatchMode || !viewer?.streamId) return;
            await emit('chat:send', { roomSlug: viewer.streamId, messageText: text });
        },
        [emit, viewer?.streamId, isWatchMode],
    );

    const selectFile = useCallback(
        (fileId: string) => {
            if (isWatchMode) {
                setIsFollowingHost(false);
                isFollowingHostRef.current = false;
            }
            openFile(fileId);
        },
        [isWatchMode, openFile],
    );

    return {
        activeFileId,
        code,
        messages,
        fileNodes: nodes,
        isFollowingHost,
        setIsFollowingHost,
        toggleFollowHost,
        selectFile,
        sendChat,
        registerEditorHandle,
        notifyEditorReady,
        editorRevision,
        editorContentReady,
        showHostCursor: isViewingHostActiveFile,
        readOnly: true,
        isWatchMode,
        liveRemote: isWatchMode,
    };
}
