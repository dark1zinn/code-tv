import { useState } from 'react';
import { FluentSymbolFile, Folder, FolderOpen } from '@react-symbols/icons';

export interface FileNode {
    name: string;
    type: 'file' | 'folder';
    children?: FileNode[];
}

interface FileExplorerProps {
    nodes: FileNode[];
    activeFileId: string;
    onSelectFile: (fileId: string) => void;
    visible: boolean;
    onToggle: () => void;
}

export function FileExplorer({
    nodes,
    activeFileId,
    onSelectFile,
    visible,
    onToggle,
}: FileExplorerProps) {
    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ root: true });

    if (!visible) {
        return (
            <button
                type="button"
                aria-label="Toggle active files browser sidebar visibility"
                className="absolute left-2 top-2 rounded bg-bg-sidecar px-2 py-1 text-sm"
                onClick={onToggle}
            >
                Show Explorer
            </button>
        );
    }

    const renderNode = (node: FileNode, path: string) => {
        const nodePath = `${path}/${node.name}`;
        if (node.type === 'folder') {
            const isOpen = openFolders[nodePath] ?? false;
            return (
                <div key={nodePath} className="pl-2">
                    <button
                        type="button"
                        className="flex items-center gap-2 py-1 text-sm text-white"
                        onClick={() =>
                            setOpenFolders((current) => ({ ...current, [nodePath]: !isOpen }))
                        }
                    >
                        {isOpen ? (
                            <FolderOpen folderName={node.name} />
                        ) : (
                            <Folder folderName={node.name} />
                        )}
                        <span>{node.name}</span>
                    </button>
                    {isOpen && node.children?.map((child) => renderNode(child, nodePath))}
                </div>
            );
        }

        return (
            <button
                key={nodePath}
                type="button"
                className={`flex w-full items-center gap-2 py-1 pl-4 text-left text-sm ${
                    activeFileId === nodePath ? 'text-accent' : 'text-white'
                }`}
                onClick={() => onSelectFile(nodePath)}
            >
                <FluentSymbolFile fileName={node.name} />
                <span>{node.name}</span>
            </button>
        );
    };

    return (
        <aside className="flex h-full w-full flex-col border-r border-divider bg-bg-sidecar">
            <div className="flex items-center justify-between border-b border-divider px-3 py-2">
                <span className="text-sm font-semibold">Files</span>
                <button
                    type="button"
                    aria-label="Toggle active files browser sidebar visibility"
                    className="text-xs text-accent"
                    onClick={onToggle}
                >
                    Hide
                </button>
            </div>
            <div className="overflow-y-auto p-2">
                {nodes.map((node) => renderNode(node, 'root'))}
            </div>
        </aside>
    );
}
