import { describe, expect, it } from 'bun:test';
import { fileContentById, upsertFileContent } from '@/lib/files';

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
});
