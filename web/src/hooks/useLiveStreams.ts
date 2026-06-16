import { useEffect, useState } from 'react';

export interface LiveStream {
    id: string;
    title: string;
    language: string;
    hostUsername?: string;
    workspaceId?: string | null;
}

export const LIVE_STREAMS_POLL_MS = 5000;

async function fetchLiveStreams(): Promise<LiveStream[]> {
    const response = await fetch('/_api/streams');
    if (!response.ok) {
        throw new Error('Failed to fetch live streams');
    }
    return response.json() as Promise<LiveStream[]>;
}

export function useLiveStreams(pollIntervalMs = LIVE_STREAMS_POLL_MS) {
    const [streams, setStreams] = useState<LiveStream[]>([]);

    useEffect(() => {
        let cancelled = false;

        const loadStreams = async () => {
            try {
                const nextStreams = await fetchLiveStreams();
                if (!cancelled) {
                    setStreams(nextStreams);
                }
            } catch {
                // Keep the last successful list on transient failures.
            }
        };

        void loadStreams();

        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                void loadStreams();
            }
        }, pollIntervalMs);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void loadStreams();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [pollIntervalMs]);

    return streams;
}
