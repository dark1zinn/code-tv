import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
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
        @Body() body: { title?: string; tags?: string[] },
    ) {
        return this.workspaceService.create(req.ipHash!, body);
    }

    @Get(':workspaceId/viewer')
    async viewer(@Param('workspaceId') workspaceId: string) {
        return this.workspaceService.getViewerContext(workspaceId);
    }

    @Get(':workspaceId/file')
    async file(@Param('workspaceId') workspaceId: string, @Query('path') path: string) {
        return this.workspaceService.getFileContent(workspaceId, path);
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
            tags?: string[];
            files?: Array<{ path: string; content: string }>;
        },
    ) {
        return this.workspaceService.patchForOwner(req.ipHash!, id, body);
    }

    @Delete(':id')
    @HttpCode(204)
    async remove(@Req() req: IdentityRequest, @Param('id') id: string) {
        await this.workspaceService.deleteForOwner(req.ipHash!, id);
    }
}
