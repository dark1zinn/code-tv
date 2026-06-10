export async function closeStreamById(streamId: string): Promise<void> {
    await fetch(`/_api/streams/${streamId}/close`, { method: 'POST' });
}
