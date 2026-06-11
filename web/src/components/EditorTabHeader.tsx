import { FileIcon } from '@react-symbols/icons/utils';
import { fileIdToPath } from '@/lib/files';

interface EditorTabHeaderProps {
    activeFileId: string;
}

export function EditorTabHeader({ activeFileId }: EditorTabHeaderProps) {
    const path = fileIdToPath(activeFileId);
    const name = path.split('/').pop() ?? path;

    return (
        <div className="flex shrink-0 items-center gap-2 border-b border-divider bg-background px-3 py-1.5">
            <FileIcon fileName={name} autoAssign className="size-4 shrink-0" />
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{path}</span>
        </div>
    );
}
