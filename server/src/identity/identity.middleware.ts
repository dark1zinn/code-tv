import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { extractRawIp, hashIpAddress } from './ip-hash';

export type IdentityRequest = Request & { ipHash?: string };

@Injectable()
export class IdentityMiddleware implements NestMiddleware {
    async use(req: IdentityRequest, _res: Response, next: NextFunction) {
        const rawIp = extractRawIp(
            req.headers['x-forwarded-for'] as string | string[] | undefined,
            req.socket.remoteAddress,
        );
        req.ipHash = await hashIpAddress(rawIp);
        next();
    }
}
