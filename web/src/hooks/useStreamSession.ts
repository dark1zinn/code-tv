import { useCallback, useEffect, useState } from 'react';
import type { ChatMessage } from '../components/LiveChat';

export interface ProfileResponse {
    ipAddress: string;
    username: string;
}

export interface StreamSessionState {
    profile: ProfileResponse | null;
    roomSlug: string | null;
    language: string;
    activeFileId: string;
    code: string;
    isHost: boolean;
    isFollowingHost: boolean;
    messages: ChatMessage[];
}

const defaultNodes = [
    {
        name: 'src',
        type: 'folder' as const,
        children: [{ name: 'main.ts', type: 'file' as const }],
    },
];

export function useStreamSession(
    emit: (event: string, payload?: unknown) => Promise<unknown>,
    on: (event: string, handler: (payload: unknown) => void) => () => void,
    connected: boolean,
) {
    const [state, setState] = useState<StreamSessionState>({
        profile: null,
        roomSlug: null,
        language: 'typescript',
        activeFileId: 'root/src/main.ts',
        code: 'export {}\n',
        isHost: false,
        isFollowingHost: true,
        messages: [],
    });

    const bootstrap = useCallback(async () => {
        const profile = (await fetch('/_api/profile').then((res) => res.json())) as ProfileResponse;
        const streams = (await fetch('/_api/streams').then((res) => res.json())) as Array<{
            id: string;
            hostIp: string;
            language: string;
        }>;

        const owned = streams.find((stream) => stream.hostIp === profile.ipAddress);
        if (owned) {
            setState((current) => ({
                ...current,
                profile,
                roomSlug: owned.id,
                language: owned.language,
                isHost: true,
            }));
            await emit('room:join', owned.id);
            return;
        }

        const roomSlug = `alpha-${Date.now()}-compile`;
        setState((current) => ({ ...current, profile, roomSlug, isHost: true }));
        await emit('room:create', roomSlug);
    }, [emit]);

    useEffect(() => {
        if (!connected) return;
        bootstrap();
    }, [connected, bootstrap]);

    useEffect(() => {
        const unsubHistory = on('chat:history', (history) => {
            setState((current) => ({ ...current, messages: history as ChatMessage[] }));
        });
        const unsubMessage = on('chat:message', (message) => {
            setState((current) => ({
                ...current,
                messages: [...current.messages, message as ChatMessage],
            }));
        });
        const unsubCode = on('code:stream', (payload) => {
            const data = payload as {
                activeFileId: string;
                fileValueString: string;
                cursorCoordinates: { line: number; column: number };
            };
            setState((current) => {
                if (current.isHost || !current.isFollowingHost) return current;
                return {
                    ...current,
                    activeFileId: data.activeFileId,
                    code: data.fileValueString,
                };
            });
        });

        return () => {
            unsubHistory();
            unsubMessage();
            unsubCode();
        };
    }, [on]);

    const streamCode = useCallback(
        async (code: string, cursor: { line: number; column: number }) => {
            if (!state.isHost || !state.roomSlug) return;
            await emit('code:stream', {
                roomSlug: state.roomSlug,
                activeFileId: state.activeFileId,
                fileValueString: code,
                cursorCoordinates: cursor,
            });
        },
        [emit, state.activeFileId, state.isHost, state.roomSlug],
    );

    const sendChat = useCallback(
        async (text: string) => {
            if (!state.roomSlug) return;
            await emit('chat:send', { roomSlug: state.roomSlug, messageText: text });
        },
        [emit, state.roomSlug],
    );

    return {
        state,
        setState,
        streamCode,
        sendChat,
        fileNodes: defaultNodes,
    };
}
