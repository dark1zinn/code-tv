import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';

@Module({
    imports: [DatabaseModule, StorageModule, WorkspaceModule],
    controllers: [StreamController],
    providers: [StreamService],
    exports: [StreamService],
})
export class StreamModule {}
