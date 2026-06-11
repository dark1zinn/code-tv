import type { FileNode } from '@/components/FileExplorer';
import { FOLDER_MARKER } from '@/lib/file-tree';

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

const EXTENSION_TO_MONACO: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cs: 'csharp',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    hh: 'cpp',
    hxx: 'cpp',
    h: 'cpp',
    c: 'c',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    kts: 'kotlin',
};

export function monacoLanguageFromPath(fileId: string): string {
    const path = fileIdToPath(fileId);
    const dot = path.lastIndexOf('.');
    if (dot === -1 || dot === path.length - 1) return 'plaintext';
    const ext = path.slice(dot + 1).toLowerCase();
    return EXTENSION_TO_MONACO[ext] ?? 'plaintext';
}

export const DEFAULT_ACTIVE_FILE_ID = 'root/README.md';

export function fileContentById(files: FlatFile[], fileId: string): string {
    const path = fileIdToPath(fileId);
    return files.find((file) => file.path === path)?.content ?? '';
}

export function upsertFileContent(
    files: FlatFile[],
    fileId: string,
    content: string,
): FlatFile[] {
    const path = fileIdToPath(fileId);
    const next = files.map((file) => (file.path === path ? { ...file, content } : file));
    if (!next.some((file) => file.path === path)) {
        next.push({ path, content });
    }
    return next;
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
                if (part !== FOLDER_MARKER) {
                    current.push({ name: part, type: 'file' });
                }
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
