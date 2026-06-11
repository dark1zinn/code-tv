import { describe, expect, it } from 'bun:test';
import { fileContentById, monacoLanguageFromPath, upsertFileContent } from '@/lib/files';

describe('files', () => {
    it('upserts file content by file id', () => {
        const next = upsertFileContent(
            [{ path: 'src/main.ts', content: 'old' }],
            'root/src/main.ts',
            'new',
        );
        expect(next[0]?.content).toBe('new');
    });

    it('reads file content by file id', () => {
        const content = fileContentById(
            [{ path: 'src/other.ts', content: 'hello' }],
            'root/src/other.ts',
        );
        expect(content).toBe('hello');
    });

    it('maps file extensions to monaco language ids', () => {
        expect(monacoLanguageFromPath('root/README.md')).toBe('markdown');
        expect(monacoLanguageFromPath('root/src/main.ts')).toBe('typescript');
        expect(monacoLanguageFromPath('root/main.rs')).toBe('rust');
        expect(monacoLanguageFromPath('root/main.go')).toBe('go');
        expect(monacoLanguageFromPath('root/main.cpp')).toBe('cpp');
        expect(monacoLanguageFromPath('root/Makefile')).toBe('plaintext');
    });
});
