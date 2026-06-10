import { Injectable } from '@nestjs/common';
import { S3Client } from 'bun';

@Injectable()
export class StorageService {
    private s3Client: S3Client;

    constructor() {
        this.s3Client = new S3Client({
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            endpoint: process.env.S3_ENDPOINT,
            bucket: process.env.S3_BUCKET,
            region: process.env.S3_REGION ?? 'us-east-1',
        });
    }

    async uploadArchive(streamId: string, fileContent: string): Promise<string> {
        const s3Key = `pastes/${streamId}/code_snapshot.json`;
        const s3File = this.s3Client.file(s3Key);
        await s3File.write(fileContent);
        return s3Key;
    }

    async deleteArchive(s3Key: string): Promise<void> {
        const s3File = this.s3Client.file(s3Key);
        if (await s3File.exists()) {
            await s3File.delete();
        }
    }

    async getArchiveContent(s3Key: string): Promise<string> {
        const s3File = this.s3Client.file(s3Key);
        return await s3File.text();
    }
}
