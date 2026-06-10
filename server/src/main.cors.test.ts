import { describe, expect, it } from 'bun:test';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { bootstrap } from './main';

describe('bootstrap cors', () => {
    it('enables vite dev origin in non-production', async () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        const app = moduleRef.createNestApplication<NestExpressApplication>();
        app.enableCors({ origin: 'http://localhost:5173' });
        await app.init();
        await app.listen(0);
        const port = (app.getHttpServer().address() as { port: number }).port;

        const response = await fetch(`http://127.0.0.1:${port}/_api/profile`, {
            method: 'OPTIONS',
            headers: {
                Origin: 'http://localhost:5173',
                'Access-Control-Request-Method': 'GET',
            },
        });

        expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');

        await app.close();
        process.env.NODE_ENV = previous;
    });

    it('exports bootstrap helper', () => {
        expect(typeof bootstrap).toBe('function');
    });
});
