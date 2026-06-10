import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StorageService } from '../storage/storage.service';
import { StreamService } from '../stream/stream.service';
import { ProfileService } from '../profile/profile.service';
import { extractRawIp, hashIpAddress } from '../identity/ip-hash';

export type MessagePayload = { sender: string; text: string; timestamp: number };

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
    private readonly latestCodeSnapshots = new Map<string, string>();

    constructor(
        private readonly streamService: StreamService,
        private readonly storageService: StorageService,
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

    @SubscribeMessage('room:create')
    async handleRoomCreate(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomSlug: string,
    ) {
        const profile = this.socketProfiles.get(client.id);
        if (!profile) return { error: 'unauthenticated' };

        await this.streamService.createStream(profile.ipHash, { title: roomSlug }, roomSlug);
        this.ephemeralChatBuffer.set(roomSlug, []);
        this.roomHosts.set(roomSlug, profile.ipHash);
        client.join(roomSlug);
        return { roomSlug };
    }

    @SubscribeMessage('room:join')
    handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() roomSlug: string) {
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

        this.latestCodeSnapshots.set(payload.roomSlug, payload.fileValueString);
        client.to(payload.roomSlug).emit('code:stream', payload);
        return { ok: true };
    }

    @SubscribeMessage('chat:send')
    handleChatSend(@ConnectedSocket() client: Socket, @MessageBody() payload: ChatMessagePayload) {
        const profile = this.socketProfiles.get(client.id);
        if (!profile) return { error: 'unauthenticated' };

        const message: MessagePayload = {
            sender: profile.username,
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

        const snapshot =
            this.latestCodeSnapshots.get(roomSlug) ??
            JSON.stringify({ roomSlug, closedAt: Date.now() });
        const s3Key = await this.storageService.uploadArchive(roomSlug, snapshot);
        await this.streamService.closeStream(roomSlug, s3Key);

        this.ephemeralChatBuffer.delete(roomSlug);
        this.roomHosts.delete(roomSlug);
        this.latestCodeSnapshots.delete(roomSlug);
        this.server.to(roomSlug).emit('room:closed', { roomSlug, s3Key });
        return { roomSlug, s3Key };
    }
}
