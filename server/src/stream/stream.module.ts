import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';

@Module({
    imports: [DatabaseModule],
    controllers: [StreamController],
    providers: [StreamService],
    exports: [StreamService],
})
export class StreamModule {}
