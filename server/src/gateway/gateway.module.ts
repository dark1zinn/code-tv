import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProfileModule } from '../profile/profile.module';
import { StorageModule } from '../storage/storage.module';
import { StreamModule } from '../stream/stream.module';
import { StreamGateway } from './stream.gateway';

@Module({
    imports: [DatabaseModule, StreamModule, StorageModule, ProfileModule],
    providers: [StreamGateway],
})
export class GatewayModule {}
