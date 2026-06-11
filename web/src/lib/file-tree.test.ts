import { describe, expect, it } from 'bun:test';
import {
    createFileEntry,
    createFolderEntry,
    deleteEntry,
    pickFallbackFileId,
    remapActiveFileId,
    renameEntry,
} from '@/lib/file-tree';
import type { FlatFile } from '@/lib/files';

const seed: FlatFile[] = [
    { path: 'src/main.ts', content: 'export {}' },
    { path: 'src/utils.ts', content: 'export const x = 1' },
    { path: 'lib/.gitkeep', content: '' },
];

describe('file-tree', () => {
    it('creates a file under a parent path', () => {
        const next = createFileEntry(seed, 'src', 'index.ts', 'console.log()');
        expect(next).toHaveLength(4);
        expect(next.find((f) => f.path === 'src/index.ts')?.content).toBe('console.log()');
    });

    it('creates a folder with a gitkeep marker', () => {
        const next = createFolderEntry(seed, '', 'docs');
        expect(next.find((f) => f.path === 'docs/.gitkeep')).toBeDefined();
    });

    it('rejects duplicate paths', () => {
        expect(() => createFileEntry(seed, 'src', 'main.ts')).toThrow('exists');
    });

    it('renames a file and remaps active file id', () => {
        const next = renameEntry(seed, 'root/src/main.ts', 'app.ts');
        expect(next.find((f) => f.path === 'src/app.ts')).toBeDefined();
        expect(remapActiveFileId('root/src/main.ts', 'root/src/main.ts', 'app.ts')).toBe(
            'root/src/app.ts',
        );
    });

    it('deletes a file and picks a fallback active id', () => {
        const next = deleteEntry(seed, 'root/src/main.ts');
        expect(next.find((f) => f.path === 'src/main.ts')).toBeUndefined();
        expect(pickFallbackFileId(next, 'root/src/main.ts')).toBe('root/src/utils.ts');
    });
});
