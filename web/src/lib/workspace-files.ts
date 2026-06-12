import { fileIdToPath } from '@/lib/files';

export async function fetchWorkspaceFileContent(
    workspaceId: string,
    fileId: string,
): Promise<string> {
    const path = fileIdToPath(fileId);
    const response = await fetch(
        `/_api/workspaces/${workspaceId}/file?path=${encodeURIComponent(path)}`,
    );
    if (!response.ok) return '';
    const body = (await response.json()) as { content: string };
    return body.content;
}
