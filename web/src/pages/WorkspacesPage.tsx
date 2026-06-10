import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppNavbar } from '@/components/AppNavbar';
import { WorkspaceCard, type WorkspaceSummary } from '@/components/WorkspaceCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function WorkspacesPage() {
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
    const [username, setUsername] = useState('Connecting...');
    const [creating, setCreating] = useState(false);

    const load = async () => {
        const [profileRes, workspacesRes] = await Promise.all([
            fetch('/_api/profile'),
            fetch('/_api/workspaces'),
        ]);
        const profile = (await profileRes.json()) as { username: string };
        setUsername(profile.username);
        setWorkspaces((await workspacesRes.json()) as WorkspaceSummary[]);
    };

    useEffect(() => {
        void load();
    }, []);

    const createWorkspace = async () => {
        setCreating(true);
        try {
            const response = await fetch('/_api/workspaces', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({}),
            });
            const workspace = (await response.json()) as { id: string };
            navigate(`/code/${workspace.id}`);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdated = (updated: WorkspaceSummary) => {
        setWorkspaces((current) =>
            current.map((workspace) => (workspace.id === updated.id ? updated : workspace)),
        );
    };

    const handleDeleted = (workspaceId: string) => {
        setWorkspaces((current) => current.filter((workspace) => workspace.id !== workspaceId));
    };

    return (
        <div className="flex h-screen flex-col bg-background">
            <AppNavbar username={username} onUsernameChange={setUsername} />
            <main className="flex-1 overflow-hidden p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Your Workspaces</h2>
                    <Button type="button" onClick={() => void createWorkspace()} disabled={creating}>
                        {creating ? 'Creating...' : 'New Workspace'}
                    </Button>
                </div>
                <ScrollArea className="h-full">
                    {workspaces.length === 0 ? (
                        <p className="text-muted-foreground">
                            No workspaces yet. Create one to start streaming.
                        </p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {workspaces.map((workspace) => (
                                <WorkspaceCard
                                    key={workspace.id}
                                    workspace={workspace}
                                    onUpdated={handleUpdated}
                                    onDeleted={handleDeleted}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </main>
        </div>
    );
}
