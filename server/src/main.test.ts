import { describe, expect, it } from 'bun:test';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

describe('main', () => {
    it('creates a Nest application from AppModule', async () => {
        const app = await NestFactory.create(AppModule, { logger: false });
        expect(app).toBeDefined();
        await app.close();
    });
});
