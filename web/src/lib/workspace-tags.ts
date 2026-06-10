export const MAX_WORKSPACE_TAGS = 6;
export const MAX_TAG_LENGTH = 24;

const TAG_PATTERN = /^[\w+#.-]+$/;

export function normalizeTagInput(raw: string): string | null {
    const tag = raw.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (!tag || !TAG_PATTERN.test(tag)) return null;
    return tag;
}

export function addWorkspaceTag(tags: string[], raw: string): string[] | null {
    const tag = normalizeTagInput(raw);
    if (!tag) return null;
    if (tags.some((existing) => existing.toLowerCase() === tag)) return null;
    if (tags.length >= MAX_WORKSPACE_TAGS) return null;
    return [...tags, tag];
}

export function removeWorkspaceTag(tags: string[], tag: string): string[] {
    return tags.filter((existing) => existing !== tag);
}
