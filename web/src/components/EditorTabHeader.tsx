import { FileIcon } from '@react-symbols/icons/utils';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fileIdToPath } from '@/lib/files';

interface EditorTabHeaderProps {
    activeFileId: string;
    followHostEnabled?: boolean;
    isFollowingHost?: boolean;
    onToggleFollowHost?: () => void;
}

export function EditorTabHeader({
    activeFileId,
    followHostEnabled,
    isFollowingHost,
    onToggleFollowHost,
}: EditorTabHeaderProps) {
    const path = fileIdToPath(activeFileId);
    const name = path.split('/').pop() ?? path;

    return (
        <div className="flex shrink-0 items-center gap-2 border-b border-divider bg-background px-3 py-1.5">
            <FileIcon fileName={name} autoAssign className="size-4 shrink-0" />
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{path}</span>
            {followHostEnabled && onToggleFollowHost && (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 shrink-0 gap-1.5 px-2 text-xs"
                    aria-label={isFollowingHost ? 'Following host' : 'Follow host'}
                    aria-pressed={isFollowingHost}
                    onClick={onToggleFollowHost}
                >
                    <span
                        className={cn(
                            'flex size-3.5 shrink-0 items-center justify-center rounded-sm border',
                            isFollowingHost
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-muted-foreground/40 bg-background',
                        )}
                        aria-hidden
                    >
                        {isFollowingHost ? (
                            <Check className="size-2.5 text-white" strokeWidth={3} />
                        ) : null}
                    </span>
                    Follow
                </Button>
            )}
        </div>
    );
}
