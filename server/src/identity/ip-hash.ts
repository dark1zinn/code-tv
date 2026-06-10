export function extractRawIp(
    xForwardedFor: string | string[] | undefined,
    remoteAddress: string | undefined,
): string {
    if (xForwardedFor) {
        const header = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
        const first = header.split(',')[0]?.trim();
        if (first) return first;
    }

    return remoteAddress ?? '0.0.0.0';
}

export async function hashIpAddress(rawIp: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawIp));
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}
