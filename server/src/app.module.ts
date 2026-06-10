import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CronModule } from './cron/cron.module';
import { DatabaseModule } from './database/database.module';
import { migrateDatabase } from './database/migrate';
import { db } from './database/db.provider';
import { GatewayModule } from './gateway/gateway.module';
import { IdentityMiddleware } from './identity/identity.middleware';
import { ProfileModule } from './profile/profile.module';
import { StorageModule } from './storage/storage.module';
import { StreamModule } from './stream/stream.module';

migrateDatabase(db);

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ServeStaticModule.forRoot({
            rootPath: join(import.meta.dir, '..', '..', 'web', 'dist'),
            exclude: ['/_api*', '/_ws*'],
        }),
        DatabaseModule,
        StorageModule,
        ProfileModule,
        StreamModule,
        GatewayModule,
        CronModule,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(IdentityMiddleware).forRoutes('*');
    }
}
