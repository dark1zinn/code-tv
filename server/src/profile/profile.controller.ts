import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import type { IdentityRequest } from '../identity/identity.middleware';
import { ProfileService } from './profile.service';

function toProfileResponse(profile: {
    ipAddress: string;
    username: string;
    githubLink: string | null;
    youtubeLink: string | null;
    chatColor: string;
    updatedAt: Date;
    createdAt: Date;
}) {
    return {
        ipAddress: profile.ipAddress,
        username: profile.username,
        githubLink: profile.githubLink,
        youtubeLink: profile.youtubeLink,
        chatColor: profile.chatColor,
        updatedAt: profile.updatedAt,
        createdAt: profile.createdAt,
    };
}

@Controller('_api/profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get()
    async getProfile(@Req() req: IdentityRequest) {
        const profile = await this.profileService.hydrate(req.ipHash!);
        return toProfileResponse(profile);
    }

    @Patch()
    async patchProfile(
        @Req() req: IdentityRequest,
        @Body()
        body: {
            username?: string;
            githubLink?: string | null;
            youtubeLink?: string | null;
            chatColor?: string;
        },
    ) {
        const profile = await this.profileService.updateProfile(req.ipHash!, body);
        return toProfileResponse(profile);
    }
}
