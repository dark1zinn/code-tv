import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatUnreadChatBadge } from '@/lib/chat-unread';
import type { SidebarAlignment, SidebarPanel } from '@/hooks/useEditorLayout';

interface CollapsedSidebarRailProps {
    side: SidebarAlignment;
    panel: SidebarPanel;
    onExpand: () => void;
    unreadChatCount?: number;
}

export function CollapsedSidebarRail({
    side,
    panel,
    onExpand,
    unreadChatCount = 0,
}: CollapsedSidebarRailProps) {
    const label = panel === 'explorer' ? 'Expand explorer' : 'Expand chat';
    const ExpandIcon = side === 'left' ? PanelRightOpen : PanelLeftOpen;
    const unreadBadge =
        panel === 'chat' ? formatUnreadChatBadge(unreadChatCount) : null;

    return (
        <div
            className={`flex h-full w-10 shrink-0 flex-col border-divider bg-bg-sidecar ${
                side === 'left' ? 'border-r' : 'border-l'
            }`}
        >
            <div className="mt-1 flex flex-col items-center gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 rounded-none"
                    aria-label={label}
                    onClick={onExpand}
                >
                    <ExpandIcon />
                </Button>
                {unreadBadge ? (
                    <span
                        className="flex size-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                        aria-label={`${unreadChatCount} unread chat messages`}
                    >
                        {unreadBadge}
                    </span>
                ) : null}
            </div>
        </div>
    );
}
