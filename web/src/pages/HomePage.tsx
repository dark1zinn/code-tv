import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppNavbar } from '@/components/AppNavbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLiveStreams } from '@/hooks/useLiveStreams';

export function HomePage() {
    const streams = useLiveStreams();
    const [username, setUsername] = useState('Connecting...');

    useEffect(() => {
        void fetch('/_api/profile')
            .then((res) => res.json())
            .then((body: { username: string }) => setUsername(body.username));
    }, []);

    return (
        <div className="flex h-screen flex-col bg-background">
            <AppNavbar username={username} onUsernameChange={setUsername} />
            <main className="flex-1 overflow-hidden p-6">
                <h2 className="mb-4 text-xl font-semibold">Live Streams</h2>
                <ScrollArea className="h-full">
                    {streams.length === 0 ? (
                        <p className="text-muted-foreground">No live streams right now.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {streams.map((stream) =>
                                stream.workspaceId ? (
                                    <Link
                                        key={stream.id}
                                        to={`/live?w=${stream.workspaceId}`}
                                        className="block"
                                    >
                                        <Card className="transition-colors hover:border-primary">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <CardTitle>{stream.title}</CardTitle>
                                                    <Badge>LIVE</Badge>
                                                </div>
                                                <CardDescription>
                                                    {stream.hostUsername ?? 'Anonymous'} ·{' '}
                                                    {stream.language}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent />
                                        </Card>
                                    </Link>
                                ) : null,
                            )}
                        </div>
                    )}
                </ScrollArea>
            </main>
        </div>
    );
}
