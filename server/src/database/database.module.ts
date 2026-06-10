import { Global, Module, OnModuleInit } from '@nestjs/common';
import { db } from './db.provider';
import { migrateDatabase } from './migrate';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
    providers: [{ provide: DATABASE, useValue: db }],
    exports: [DATABASE],
})
export class DatabaseModule implements OnModuleInit {
    onModuleInit() {
        migrateDatabase(db);
    }
}
