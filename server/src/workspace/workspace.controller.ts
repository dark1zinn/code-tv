import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import type { IdentityRequest } from '../identity/identity.middleware';
import { WorkspaceService } from './workspace.service';

@Controller('_api/workspaces')
export class WorkspaceController {
    constructor(private readonly workspaceService: WorkspaceService) {}

    @Get()
    async list(@Req() req: IdentityRequest) {
        return this.workspaceService.listForOwner(req.ipHash!);
    }

    @Post()
    @HttpCode(201)
    async create(
        @Req() req: IdentityRequest,
        @Body() body: { title?: string; language?: string },
    ) {
        return this.workspaceService.create(req.ipHash!, body);
    }

    @Get(':workspaceId/viewer')
    async viewer(@Param('workspaceId') workspaceId: string) {
        return this.workspaceService.getViewerContext(workspaceId);
    }

    @Get(':id')
    async getOne(@Req() req: IdentityRequest, @Param('id') id: string) {
        return this.workspaceService.getForOwner(req.ipHash!, id);
    }

    @Patch(':id')
    async patch(
        @Req() req: IdentityRequest,
        @Param('id') id: string,
        @Body()
        body: {
            title?: string;
            language?: string;
            files?: Array<{ path: string; content: string }>;
        },
    ) {
        return this.workspaceService.patchForOwner(req.ipHash!, id, body);
    }
}
