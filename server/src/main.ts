import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function bootstrap(port = Number(process.env.PORT ?? 3000)) {
    const app = await NestFactory.create(AppModule);

    if (process.env.NODE_ENV !== 'production') {
        app.enableCors({ origin: 'http://localhost:5173' });
    }

    await app.listen(port);
    return app;
}

if (import.meta.main) {
    bootstrap();
}
