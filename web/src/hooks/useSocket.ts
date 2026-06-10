import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = io({
            path: '/_ws',
            transports: ['websocket'],
        });

        socketRef.current = socket;
        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const emit = <T = unknown>(event: string, payload?: unknown) =>
        new Promise<T>((resolve) => {
            socketRef.current?.emit(event, payload, resolve);
        });

    const on = (event: string, handler: (payload: unknown) => void) => {
        socketRef.current?.on(event, handler);
        return () => {
            socketRef.current?.off(event, handler);
        };
    };

    return { connected, emit, on, socket: socketRef };
}
