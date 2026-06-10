import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
    imports: [StorageModule],
    controllers: [WorkspaceController],
    providers: [WorkspaceService],
    exports: [WorkspaceService],
})
export class WorkspaceModule {}
