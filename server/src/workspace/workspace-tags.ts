export const MAX_WORKSPACE_TAGS = 6;
export const MAX_TAG_LENGTH = 24;

const MONACO_LANGUAGES = new Set([
    'typescript',
    'javascript',
    'python',
    'rust',
    'go',
    'java',
    'csharp',
    'cpp',
    'c',
    'html',
    'css',
    'json',
    'markdown',
    'yaml',
    'sql',
    'shell',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'plaintext',
]);

const DEFAULT_TAGS = ['typescript'];

export function parseWorkspaceTags(raw: string | null | undefined): string[] {
    if (!raw) return [...DEFAULT_TAGS];
    try {
        const parsed = JSON.parse(raw) as unknown;
        return normalizeWorkspaceTags(parsed);
    } catch {
        return [...DEFAULT_TAGS];
    }
}

export function serializeWorkspaceTags(tags: string[]): string {
    return JSON.stringify(normalizeWorkspaceTags(tags));
}

export function normalizeWorkspaceTags(input: unknown): string[] {
    if (!Array.isArray(input)) return [...DEFAULT_TAGS];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of input) {
        if (typeof value !== 'string') continue;
        const tag = value.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
        if (!tag || !/^[\w+#.-]+$/.test(tag) || seen.has(tag)) continue;
        seen.add(tag);
        result.push(tag);
        if (result.length >= MAX_WORKSPACE_TAGS) break;
    }
    return result.length > 0 ? result : [...DEFAULT_TAGS];
}

export function primaryEditorLanguage(tags: string[]): string {
    for (const tag of tags) {
        if (MONACO_LANGUAGES.has(tag)) return tag;
    }
    return 'typescript';
}
