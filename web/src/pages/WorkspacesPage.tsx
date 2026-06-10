import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppNavbar } from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkspaceSummary {
    id: string;
    title: string;
    language: string;
    updatedAt: string;
}

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
                                <Link
                                    key={workspace.id}
                                    to={`/code/${workspace.id}`}
                                    className="block"
                                >
                                    <Card className="transition-colors hover:border-primary">
                                        <CardHeader>
                                            <CardTitle>{workspace.title}</CardTitle>
                                            <CardDescription>{workspace.language}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </main>
        </div>
    );
}
