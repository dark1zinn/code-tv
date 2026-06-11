import type { FlatFile } from '@/lib/files';
import { fileIdToPath, pathToFileId } from '@/lib/files';

export const FOLDER_MARKER = '.gitkeep';

export function normalizeEntryName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed || trimmed.includes('/') || trimmed.includes('\\')) {
        throw new Error('invalid_name');
    }
    return trimmed;
}

export function joinWorkspacePath(parentPath: string, name: string): string {
    const entry = normalizeEntryName(name);
    return parentPath ? `${parentPath}/${entry}` : entry;
}

export function pathExists(files: FlatFile[], path: string): boolean {
    return files.some((file) => file.path === path || file.path.startsWith(`${path}/`));
}

export function createFileEntry(
    files: FlatFile[],
    parentPath: string,
    name: string,
    content = '',
): FlatFile[] {
    const path = joinWorkspacePath(parentPath, name);
    if (pathExists(files, path)) throw new Error('exists');
    return [...files, { path, content }];
}

export function createFolderEntry(
    files: FlatFile[],
    parentPath: string,
    name: string,
): FlatFile[] {
    const folderPath = joinWorkspacePath(parentPath, name);
    if (pathExists(files, folderPath)) throw new Error('exists');
    return [...files, { path: `${folderPath}/${FOLDER_MARKER}`, content: '' }];
}

export function renameEntry(files: FlatFile[], fileId: string, nextName: string): FlatFile[] {
    const oldPath = fileIdToPath(fileId);
    const parent = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : '';
    const newPath = joinWorkspacePath(parent, nextName);

    if (newPath === oldPath) return files;
    if (pathExists(files, newPath)) throw new Error('exists');

    return files.map((file) => {
        if (file.path === oldPath) return { ...file, path: newPath };
        if (file.path.startsWith(`${oldPath}/`)) {
            return { ...file, path: `${newPath}${file.path.slice(oldPath.length)}` };
        }
        return file;
    });
}

export function deleteEntry(files: FlatFile[], fileId: string): FlatFile[] {
    const targetPath = fileIdToPath(fileId);
    return files.filter(
        (file) => file.path !== targetPath && !file.path.startsWith(`${targetPath}/`),
    );
}

export function pickFallbackFileId(files: FlatFile[], removedFileId: string): string | null {
    const visible = files
        .filter((file) => !file.path.endsWith(`/${FOLDER_MARKER}`))
        .map((file) => pathToFileId(file.path));
    if (visible.length === 0) return null;
    if (!visible.includes(removedFileId)) return visible[0] ?? null;
    return visible.find((id) => id !== removedFileId) ?? visible[0] ?? null;
}

export function folderNodePath(fileId: string): string {
    return fileId;
}

export function parentPathFromNode(nodePath: string): string {
    return fileIdToPath(nodePath);
}

export function remapActiveFileId(
    activeFileId: string,
    renamedNodePath: string,
    nextName: string,
): string {
    const oldPath = fileIdToPath(renamedNodePath);
    const parent = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : '';
    const newPath = joinWorkspacePath(parent, nextName);
    const activePath = fileIdToPath(activeFileId);

    if (activePath === oldPath || activePath.startsWith(`${oldPath}/`)) {
        return pathToFileId(`${newPath}${activePath.slice(oldPath.length)}`);
    }
    return activeFileId;
}
