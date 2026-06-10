import { describe, expect, it } from 'bun:test';
import {
    MAX_WORKSPACE_TAGS,
    normalizeWorkspaceTags,
    parseWorkspaceTags,
    primaryEditorLanguage,
} from './workspace-tags';

describe('workspace-tags', () => {
    it('normalizes and caps tags', () => {
        const tags = normalizeWorkspaceTags([
            'TypeScript',
            'react',
            'REACT',
            'invalid tag',
            'rust',
            'go',
            'java',
            'extra',
        ]);
        expect(tags).toEqual(['typescript', 'react', 'rust', 'go', 'java', 'extra']);
        expect(tags.length).toBe(MAX_WORKSPACE_TAGS);
    });

    it('parses stored json tags', () => {
        expect(parseWorkspaceTags('["python","django"]')).toEqual(['python', 'django']);
    });

    it('derives monaco language from tags', () => {
        expect(primaryEditorLanguage(['react', 'typescript'])).toBe('typescript');
        expect(primaryEditorLanguage(['nextjs', 'react'])).toBe('typescript');
    });
});
