export interface ProfileData {
    username: string;
    githubLink: string | null;
    youtubeLink: string | null;
    chatColor: string;
}

export const DEFAULT_CHAT_COLOR = '#58a6ff';

export async function fetchProfile(): Promise<ProfileData> {
    const response = await fetch('/_api/profile');
    const body = (await response.json()) as ProfileData;
    return body;
}
