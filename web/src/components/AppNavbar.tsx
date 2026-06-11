import { ArrowLeftRight } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';
import { ProfileDialog } from '@/components/ProfileDialog';
import { ShareLinkButton } from '@/components/ShareLinkButton';

interface AppNavbarProps {
    username: string;
    onUsernameChange: (username: string) => void;
    connected?: boolean;
    badge?: string;
    onStopStreaming?: () => void;
    onLeaveHosting?: () => void | Promise<void>;
    onSwapSidebarPositions?: () => void;
}

export function AppNavbar({
    username,
    onUsernameChange,
    connected,
    badge,
    onStopStreaming,
    onLeaveHosting,
    onSwapSidebarPositions,
}: AppNavbarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { workspaceId } = useParams();
    const isLive = location.pathname === '/live';
    const isCode = location.pathname.startsWith('/code/');
    const isHome = location.pathname === '/';
    const showEditorControls = isLive || isCode;
    const showShare = showEditorControls;
    const showGoLive = isHome || isLive;
    const showStop = isCode && onStopStreaming;

    const handleHomeClick = () => {
        if (isCode && onLeaveHosting) {
            void Promise.resolve(onLeaveHosting()).then(() => navigate('/'));
            return;
        }
        navigate('/');
    };

    const brandMark = (
        <>
            <BrandLogo />
            <span>CodeTV</span>
        </>
    );

    return (
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <div className="flex items-center gap-3">
                {isCode && onLeaveHosting ? (
                    <button
                        type="button"
                        onClick={handleHomeClick}
                        className="flex items-center gap-2 text-lg font-semibold text-primary hover:underline"
                    >
                        {brandMark}
                    </button>
                ) : (
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-lg font-semibold text-primary"
                    >
                        {brandMark}
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
                {showEditorControls && onSwapSidebarPositions && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Swap explorer and chat sides"
                        title="Swap explorer and chat sides (Ctrl+,)"
                        onClick={onSwapSidebarPositions}
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                        Swap sides
                    </Button>
                )}
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
