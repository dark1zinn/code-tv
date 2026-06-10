import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { IdentityRequest } from '../identity/identity.middleware';
import { StreamService } from './stream.service';

@Controller('_api/streams')
export class StreamController {
    constructor(private readonly streamService: StreamService) {}

    @Post()
    async createStream(
        @Req() req: IdentityRequest,
        @Body()
        body: { title?: string; language?: string; workspaceId?: string },
    ) {
        const stream = await this.streamService.createStream(req.ipHash!, body);
        return stream;
    }

    @Get()
    async listLiveStreams() {
        return this.streamService.listLiveStreams();
    }

    @Post(':id/close')
    async closeStream(@Req() req: IdentityRequest, @Param('id') id: string) {
        return this.streamService.endStream(id, req.ipHash!);
    }

    @Get(':id')
    async getStream(@Param('id') id: string) {
        return this.streamService.getStream(id);
    }
}
