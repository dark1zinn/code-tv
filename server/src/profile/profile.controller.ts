import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import type { IdentityRequest } from '../identity/identity.middleware';
import { ProfileService } from './profile.service';

@Controller('_api/profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get()
    async getProfile(@Req() req: IdentityRequest) {
        const profile = await this.profileService.hydrate(req.ipHash!);
        return {
            ipAddress: profile.ipAddress,
            username: profile.username,
            githubLink: profile.githubLink,
            youtubeLink: profile.youtubeLink,
            updatedAt: profile.updatedAt,
            createdAt: profile.createdAt,
        };
    }

    @Patch()
    async patchProfile(
        @Req() req: IdentityRequest,
        @Body() body: { username?: string; githubLink?: string; youtubeLink?: string },
    ) {
        const profile = await this.profileService.updateProfile(req.ipHash!, body);
        return {
            ipAddress: profile.ipAddress,
            username: profile.username,
            githubLink: profile.githubLink,
            youtubeLink: profile.youtubeLink,
            updatedAt: profile.updatedAt,
            createdAt: profile.createdAt,
        };
    }
}
