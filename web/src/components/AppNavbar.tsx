import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProfileDialog } from '@/components/ProfileDialog';
import { ShareLinkButton } from '@/components/ShareLinkButton';

interface AppNavbarProps {
    username: string;
    onUsernameChange: (username: string) => void;
    connected?: boolean;
    badge?: string;
    onStopStreaming?: () => void;
    onLeaveHosting?: () => void | Promise<void>;
}

export function AppNavbar({
    username,
    onUsernameChange,
    connected,
    badge,
    onStopStreaming,
    onLeaveHosting,
}: AppNavbarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { workspaceId } = useParams();
    const isLive = location.pathname === '/live';
    const isCode = location.pathname.startsWith('/code/');
    const isHome = location.pathname === '/';
    const showShare = isLive || isCode;
    const showGoLive = isHome || isLive;
    const showStop = isCode && onStopStreaming;

    const handleHomeClick = () => {
        if (isCode && onLeaveHosting) {
            void Promise.resolve(onLeaveHosting()).then(() => navigate('/'));
            return;
        }
        navigate('/');
    };

    return (
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <div className="flex items-center gap-3">
                {isCode && onLeaveHosting ? (
                    <button
                        type="button"
                        onClick={handleHomeClick}
                        className="text-lg font-semibold text-primary hover:underline"
                    >
                        CodeTV
                    </button>
                ) : (
                    <Link to="/" className="text-lg font-semibold text-primary">
                        CodeTV
                    </Link>
                )}
                <span className="text-sm text-muted-foreground">{username}</span>
                {badge && <Badge variant="secondary">{badge}</Badge>}
                {connected !== undefined && (
                    <span className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
                        {connected ? 'Connected' : 'Offline'}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                {showShare && (
                    <ShareLinkButton
                        url={isLive ? window.location.href : undefined}
                        workspaceId={isCode ? workspaceId : undefined}
                    />
                )}
                {showStop && (
                    <Button variant="destructive" size="sm" type="button" onClick={onStopStreaming}>
                        Stop Streaming
                    </Button>
                )}
                {showGoLive && (
                    <Button variant="default" size="sm" asChild>
                        <Link to="/workspaces">Go Live</Link>
                    </Button>
                )}
                <ProfileDialog username={username} onUsernameChange={onUsernameChange} />
            </div>
        </header>
    );
}
