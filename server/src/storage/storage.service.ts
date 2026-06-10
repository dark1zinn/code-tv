import { Injectable } from '@nestjs/common';
import type { S3mini } from 's3mini';
import { createS3Client } from './s3-client';

@Injectable()
export class StorageService {
    private readonly s3: S3mini = createS3Client();

    async uploadArchive(streamId: string, fileContent: string): Promise<string> {
        const s3Key = `pastes/${streamId}/code_snapshot.json`;
        await this.s3.putObject(s3Key, fileContent, 'application/json');
        return s3Key;
    }

    async deleteArchive(s3Key: string): Promise<void> {
        if (await this.s3.objectExists(s3Key)) {
            await this.s3.deleteObject(s3Key);
        }
    }

    async getArchiveContent(s3Key: string): Promise<string> {
        const content = await this.s3.getObject(s3Key);
        if (content === null) {
            throw new Error(`Archive not found: ${s3Key}`);
        }
        return content;
    }
}
