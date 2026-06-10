import { describe, expect, it } from 'bun:test';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
    it('registers core modules without boot errors', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        expect(moduleRef.get(AppModule)).toBeDefined();
        await moduleRef.close();
    });
});
