import type { INestApplication } from '@nestjs/common';
import { join } from 'path';

export function registerSpaFallback(app: INestApplication) {
    const expressApp = app.getHttpAdapter().getInstance();
    const indexPath = join(import.meta.dir, '..', '..', 'web', 'dist', 'index.html');

    expressApp.get(/^(?!\/_api|\/_ws).*/, (_req, res) => {
        res.sendFile(indexPath);
    });
}
