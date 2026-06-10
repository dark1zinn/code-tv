export function buildWatchLink(workspaceId: string): string {
    return `${window.location.origin}/live?w=${encodeURIComponent(workspaceId)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
