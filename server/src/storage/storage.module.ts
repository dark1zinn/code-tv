import { Module, OnModuleInit } from '@nestjs/common';
import { createS3Client, ensureBucket } from './s3-client';
import { StorageService } from './storage.service';

@Module({
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule implements OnModuleInit {
    async onModuleInit() {
        await ensureBucket(createS3Client());
    }
}
