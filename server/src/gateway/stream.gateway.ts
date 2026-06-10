import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamService } from '../stream/stream.service';
import { ProfileService } from '../profile/profile.service';
import { DEFAULT_CHAT_COLOR } from '../profile/profile.utils';
import { extractRawIp, hashIpAddress } from '../identity/ip-hash';

export type MessagePayload = {
    sender: string;
    text: string;
    timestamp: number;
    color: string;
};

export interface CodeStreamPayload {
    roomSlug: string;
    activeFileId: string;
    fileValueString: string;
    cursorCoordinates: { line: number; column: number };
}

export interface ChatMessagePayload {
    roomSlug: string;
    messageText: string;
}

const MAX_CHAT_MESSAGES = 50;

@WebSocketGateway({ path: '/_ws', cors: { origin: '*' } })
export class StreamGateway implements OnGatewayConnection {
    @WebSocketServer()
    server!: Server;

    private readonly ephemeralChatBuffer = new Map<string, MessagePayload[]>();
    private readonly roomHosts = new Map<string, string>();
    private readonly socketProfiles = new Map<string, { ipHash: string; username: string }>();
    constructor(
        private readonly streamService: StreamService,
        private readonly profileService: ProfileService,
    ) {}

    async handleConnection(client: Socket) {
        const rawIp = extractRawIp(
            client.handshake.headers['x-forwarded-for'] as string | string[] | undefined,
            client.handshake.address,
        );
        const ipHash = await hashIpAddress(rawIp);
        const profile = await this.profileService.hydrate(ipHash);
        this.socketProfiles.set(client.id, { ipHash, username: profile.username });
    }

    @SubscribeMessage('room:host-join')
    async handleRoomHostJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomSlug: string,
    ) {
        const profile = this.socketProfiles.get(client.id);
        if (!profile) return { error: 'unauthenticated' };

        try {
            await this.streamService.assertHost(roomSlug, profile.ipHash);
        } catch {
            return { error: 'forbidden' };
        }

        if (!this.ephemeralChatBuffer.has(roomSlug)) {
            this.ephemeralChatBuffer.set(roomSlug, []);
        }
        this.roomHosts.set(roomSlug, profile.ipHash);
        client.join(roomSlug);
        return { roomSlug };
    }

    @SubscribeMessage('room:create')
    async handleRoomCreate(@ConnectedSocket() client: Socket, @MessageBody() roomSlug: string) {
        const profile = this.socketProfiles.get(client.id);
        if (!profile) return { error: 'unauthenticated' };

        try {
            const existing = await this.streamService.getStream(roomSlug);
            if (existing.hostIp === profile.ipHash && existing.isLive) {
                this.ephemeralChatBuffer.set(roomSlug, this.ephemeralChatBuffer.get(roomSlug) ?? []);
                this.roomHosts.set(roomSlug, profile.ipHash);
                client.join(roomSlug);
                return { roomSlug };
            }
        } catch {
            // stream does not exist — create below
        }

        await this.streamService.createStream(profile.ipHash, { title: roomSlug }, roomSlug);
        this.ephemeralChatBuffer.set(roomSlug, []);
        this.roomHosts.set(roomSlug, profile.ipHash);
        client.join(roomSlug);
        return { roomSlug };
    }

    @SubscribeMessage('room:join')
    async handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() roomSlug: string) {
        try {
            const stream = await this.streamService.getStream(roomSlug);
            if (!stream.isLive) return { error: 'stream_offline' };
        } catch {
            return { error: 'not_found' };
        }

        if (!this.ephemeralChatBuffer.has(roomSlug)) {
            this.ephemeralChatBuffer.set(roomSlug, []);
        }
        client.join(roomSlug);
        const history = this.ephemeralChatBuffer.get(roomSlug) ?? [];
        client.emit('chat:history', history);
        return { roomSlug, history };
    }

    @SubscribeMessage('code:stream')
    handleCodeStream(@ConnectedSocket() client: Socket, @MessageBody() payload: CodeStreamPayload) {
        const profile = this.socketProfiles.get(client.id);
        const hostIp = this.roomHosts.get(payload.roomSlug);
        if (!profile || hostIp !== profile.ipHash) {
            return { error: 'forbidden' };
        }

        client.to(payload.roomSlug).emit('code:stream', payload);
        return { ok: true };
    }

    @SubscribeMessage('chat:send')
    async handleChatSend(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: ChatMessagePayload,
    ) {
        const profile = this.socketProfiles.get(client.id);
        if (!profile) return { error: 'unauthenticated' };

        const record = await this.profileService.getProfile(profile.ipHash);
        const message: MessagePayload = {
            sender: record?.username ?? profile.username,
            color: record?.chatColor ?? DEFAULT_CHAT_COLOR,
            text: payload.messageText,
            timestamp: Date.now(),
        };

        const buffer = this.ephemeralChatBuffer.get(payload.roomSlug) ?? [];
        buffer.push(message);
        if (buffer.length > MAX_CHAT_MESSAGES) {
            buffer.splice(0, buffer.length - MAX_CHAT_MESSAGES);
        }
        this.ephemeralChatBuffer.set(payload.roomSlug, buffer);

        this.server.to(payload.roomSlug).emit('chat:message', message);
        return { ok: true };
    }

    @SubscribeMessage('room:close')
    async handleRoomClose(@ConnectedSocket() client: Socket, @MessageBody() roomSlug: string) {
        const profile = this.socketProfiles.get(client.id);
        const hostIp = this.roomHosts.get(roomSlug);
        if (!profile || hostIp !== profile.ipHash) {
            return { error: 'forbidden' };
        }

        const result = await this.streamService.endStream(roomSlug, profile.ipHash);

        this.ephemeralChatBuffer.delete(roomSlug);
        this.roomHosts.delete(roomSlug);
        this.server.to(roomSlug).emit('room:closed', { roomSlug });
        return { roomSlug, streamId: result.streamId };
    }
}
