import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export type LiveMode = 'watch' | 'replay';

export interface ViewerContext {
    workspaceId: string;
    isLive: boolean;
    streamId?: string;
    title: string;
    language: string;
    hostUsername?: string;
    files: Array<{ path: string; content: string }>;
}

export function useLiveRoute() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [viewer, setViewer] = useState<ViewerContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const watchId = searchParams.get('w');
    const replayId = searchParams.get('r');
    const workspaceId = watchId ?? replayId;
    const requestedMode: LiveMode | null = watchId ? 'watch' : replayId ? 'replay' : null;

    useEffect(() => {
        if (!workspaceId || !requestedMode) {
            navigate('/', { replace: true });
            return;
        }

        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/_api/workspaces/${workspaceId}/viewer`);
                if (!response.ok) throw new Error('not_found');
                const data = (await response.json()) as ViewerContext;

                if (cancelled) return;

                if (requestedMode === 'watch' && !data.isLive) {
                    navigate(`/live?r=${workspaceId}`, { replace: true });
                    return;
                }
                if (requestedMode === 'replay' && data.isLive) {
                    navigate(`/live?w=${workspaceId}`, { replace: true });
                    return;
                }

                setViewer(data);
            } catch {
                if (!cancelled) {
                    setError('not_found');
                    navigate('/', { replace: true });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [workspaceId, requestedMode, navigate]);

    const mode: LiveMode | null =
        viewer && requestedMode
            ? viewer.isLive
                ? 'watch'
                : 'replay'
            : requestedMode;

    return { workspaceId, mode, viewer, loading, error };
}
