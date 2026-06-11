import { useState } from 'react';
import {
    DefaultFolderOpenedIcon,
    FileIcon,
    FolderIcon,
} from '@react-symbols/icons/utils';
import { FilePlus2, FolderPlus, PanelLeftClose, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface FileNode {
    name: string;
    type: 'file' | 'folder';
    children?: FileNode[];
}

type ExplorerAction =
    | { kind: 'create-file'; parentNodePath: string }
    | { kind: 'create-folder'; parentNodePath: string }
    | { kind: 'rename'; nodePath: string; currentName: string }
    | { kind: 'delete'; nodePath: string; label: string };

interface FileExplorerProps {
    nodes: FileNode[];
    activeFileId: string;
    onSelectFile: (fileId: string) => void;
    visible: boolean;
    onToggle: () => void;
    readOnly?: boolean;
    onCreateFile?: (parentNodePath: string, name: string) => void;
    onCreateFolder?: (parentNodePath: string, name: string) => void;
    onRename?: (nodePath: string, name: string) => void;
    onDelete?: (nodePath: string) => void;
}

export function FileExplorer({
    nodes,
    activeFileId,
    onSelectFile,
    visible,
    onToggle,
    readOnly = false,
    onCreateFile,
    onCreateFolder,
    onRename,
    onDelete,
}: FileExplorerProps) {
    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ root: true });
    const [pendingAction, setPendingAction] = useState<ExplorerAction | null>(null);
    const [draftName, setDraftName] = useState('');

    const openActionDialog = (action: ExplorerAction, defaultName = '') => {
        setPendingAction(action);
        setDraftName(defaultName);
    };

    const closeActionDialog = () => {
        setPendingAction(null);
        setDraftName('');
    };

    const submitAction = () => {
        if (!pendingAction) return;
        const name = draftName.trim();
        if (!name && pendingAction.kind !== 'delete') return;

        switch (pendingAction.kind) {
            case 'create-file':
                onCreateFile?.(pendingAction.parentNodePath, name);
                break;
            case 'create-folder':
                onCreateFolder?.(pendingAction.parentNodePath, name);
                break;
            case 'rename':
                onRename?.(pendingAction.nodePath, name);
                break;
            case 'delete':
                onDelete?.(pendingAction.nodePath);
                break;
        }
        closeActionDialog();
    };

    const toggleFolder = (nodePath: string) => {
        setOpenFolders((current) => ({ ...current, [nodePath]: !current[nodePath] }));
    };

    const openRootCreateFile = () =>
        openActionDialog({ kind: 'create-file', parentNodePath: 'root' });

    const openRootCreateFolder = () =>
        openActionDialog({ kind: 'create-folder', parentNodePath: 'root' });

    const renderRootCreateMenuItems = () => (
        <>
            <ContextMenuItem onSelect={openRootCreateFile}>
                <FilePlus2 data-icon="inline-start" />
                New File
            </ContextMenuItem>
            <ContextMenuItem onSelect={openRootCreateFolder}>
                <FolderPlus data-icon="inline-start" />
                New Folder
            </ContextMenuItem>
        </>
    );

    const renderContextItems = (nodePath: string, node: FileNode) => {
        if (readOnly) return null;
        return (
            <>
                <ContextMenuItem
                    onSelect={() => openActionDialog({ kind: 'create-file', parentNodePath: nodePath })}
                >
                    <FilePlus2 data-icon="inline-start" />
                    New File
                </ContextMenuItem>
                {node.type === 'folder' && (
                    <ContextMenuItem
                        onSelect={() =>
                            openActionDialog({ kind: 'create-folder', parentNodePath: nodePath })
                        }
                    >
                        <FolderPlus data-icon="inline-start" />
                        New Folder
                    </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                    onSelect={() =>
                        openActionDialog({
                            kind: 'rename',
                            nodePath,
                            currentName: node.name,
                        }, node.name)
                    }
                >
                    <Pencil data-icon="inline-start" />
                    Rename
                </ContextMenuItem>
                <ContextMenuItem
                    variant="destructive"
                    onSelect={() =>
                        openActionDialog({
                            kind: 'delete',
                            nodePath,
                            label: node.name,
                        })
                    }
                >
                    <Trash2 data-icon="inline-start" />
                    Delete
                </ContextMenuItem>
            </>
        );
    };

    const renderNode = (node: FileNode, path: string) => {
        const nodePath = `${path}/${node.name}`;

        if (node.type === 'folder') {
            const isOpen = openFolders[nodePath] ?? false;
            return (
                <ContextMenu key={nodePath}>
                    <ContextMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-sm hover:bg-accent/40"
                            onClick={() => toggleFolder(nodePath)}
                        >
                            {isOpen ? (
                                <DefaultFolderOpenedIcon className="size-4 shrink-0" />
                            ) : (
                                <FolderIcon folderName={node.name} className="size-4 shrink-0" />
                            )}
                            <span className="truncate">{node.name}</span>
                        </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>{renderContextItems(nodePath, node)}</ContextMenuContent>
                    {isOpen && (
                        <div className="ml-3 border-l border-border pl-1">
                            {node.children?.map((child) => renderNode(child, nodePath))}
                        </div>
                    )}
                </ContextMenu>
            );
        }

        return (
            <ContextMenu key={nodePath}>
                <ContextMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-sm hover:bg-accent/40',
                            activeFileId === nodePath && 'bg-accent text-accent-foreground',
                        )}
                        onClick={() => onSelectFile(nodePath)}
                    >
                        <FileIcon fileName={node.name} autoAssign className="size-4 shrink-0" />
                        <span className="truncate">{node.name}</span>
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent>{renderContextItems(nodePath, node)}</ContextMenuContent>
            </ContextMenu>
        );
    };

    if (!visible) {
        return (
            <button
                type="button"
                aria-label="Show explorer sidebar"
                className="absolute left-2 top-2 rounded bg-bg-sidecar px-2 py-1 text-sm"
                onClick={onToggle}
            >
                Show Explorer
            </button>
        );
    }

    const dialogTitle =
        pendingAction?.kind === 'create-file'
            ? 'New file'
            : pendingAction?.kind === 'create-folder'
              ? 'New folder'
              : pendingAction?.kind === 'rename'
                ? 'Rename'
                : pendingAction?.kind === 'delete'
                  ? 'Delete'
                  : '';

    return (
        <>
            <aside className="flex h-full w-full flex-col border-r border-divider bg-bg-sidecar">
                <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                    <span className="text-sm font-semibold">Explorer</span>
                    <div className="flex items-center gap-0.5">
                        {!readOnly && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7"
                                        aria-label="New file or folder"
                                    >
                                        <Plus />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={openRootCreateFile}>
                                        <FilePlus2 data-icon="inline-start" />
                                        New File
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={openRootCreateFolder}>
                                        <FolderPlus data-icon="inline-start" />
                                        New Folder
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label="Hide explorer sidebar"
                            onClick={onToggle}
                        >
                            <PanelLeftClose />
                        </Button>
                    </div>
                </div>
                <ScrollArea className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:min-h-full">
                    <div className="relative min-h-full p-2">
                        {!readOnly && (
                            <ContextMenu>
                                <ContextMenuTrigger asChild>
                                    <div
                                        className="absolute inset-0 z-0"
                                        aria-label="Explorer tree background"
                                    />
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    {renderRootCreateMenuItems()}
                                </ContextMenuContent>
                            </ContextMenu>
                        )}
                        <div className="relative z-10 flex flex-col gap-0.5">
                            {nodes.map((node) => renderNode(node, 'root'))}
                        </div>
                    </div>
                </ScrollArea>
            </aside>

            <Dialog
                open={pendingAction !== null}
                onOpenChange={(open) => {
                    if (!open) closeActionDialog();
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>
                            {pendingAction?.kind === 'delete'
                                ? `Delete "${pendingAction.label}" and its contents?`
                                : 'Enter a name for the explorer item.'}
                        </DialogDescription>
                    </DialogHeader>
                    {pendingAction?.kind === 'delete' ? (
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeActionDialog}>
                                Cancel
                            </Button>
                            <Button type="button" variant="destructive" onClick={submitAction}>
                                Delete
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="explorer-entry-name">Name</Label>
                                <Input
                                    id="explorer-entry-name"
                                    value={draftName}
                                    onChange={(event) => setDraftName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') submitAction();
                                    }}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={closeActionDialog}>
                                    Cancel
                                </Button>
                                <Button type="button" onClick={submitAction}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
