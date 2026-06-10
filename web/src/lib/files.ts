import type { FileNode } from '@/components/FileExplorer';

export interface FlatFile {
    path: string;
    content: string;
}

export function pathToFileId(path: string): string {
    return `root/${path}`;
}

export function fileIdToPath(fileId: string): string {
    return fileId.replace(/^root\//, '');
}

export function flatFilesToTree(files: FlatFile[]): {
    nodes: FileNode[];
    fileMap: Record<string, string>;
} {
    const fileMap: Record<string, string> = {};
    const root: FileNode[] = [];

    for (const file of files) {
        fileMap[pathToFileId(file.path)] = file.content;
        const parts = file.path.split('/');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]!;
            const isFile = i === parts.length - 1;

            if (isFile) {
                current.push({ name: part, type: 'file' });
            } else {
                let folder = current.find((n) => n.name === part && n.type === 'folder');
                if (!folder) {
                    folder = { name: part, type: 'folder', children: [] };
                    current.push(folder);
                }
                current = folder.children!;
            }
        }
    }

    return { nodes: root, fileMap };
}
