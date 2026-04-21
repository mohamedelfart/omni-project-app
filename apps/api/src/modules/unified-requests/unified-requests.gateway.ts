import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Server, Socket } from 'socket.io';

type SocketUser = {
  sub: string;
  role?: string;
  roles?: string[];
};

@WebSocketGateway({
  namespace: '/requests',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class UnifiedRequestsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(UnifiedRequestsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.authenticateClient(client);
      await client.join(`user:${user.sub}`);

      const effectiveRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
      for (const role of effectiveRoles) {
        await client.join(`role:${role}`);
      }
      console.log('[server] socket joined rooms', client.id, [...client.rooms]);
    } catch (error) {
      this.logger.warn(`Socket connection rejected: ${error instanceof Error ? error.message : 'auth error'}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket): void {
    // No-op for now; room cleanup is handled by Socket.IO.
  }

  emitToRooms(eventName: string, roomNames: string[], payload: unknown): void {
    const uniqueRooms = [...new Set(roomNames.filter(Boolean))];
    if (uniqueRooms.length === 0) {
      return;
    }
    // Deduplicate by socket id: a client may be in several target rooms (e.g. `role:admin` and
    // `role:command-center`); emit once per socket instead of once per room.
    const adapter = (this.server as unknown as Namespace).adapter;
    const recipients = new Set<string>();
    for (const roomName of uniqueRooms) {
      const ids = adapter.rooms.get(roomName);
      if (!ids) continue;
      for (const socketId of ids) {
        recipients.add(socketId);
      }
    }
    if (eventName === 'request.created') {
      let requestId: string | undefined;
      if (payload && typeof payload === 'object' && 'request' in payload) {
        const req = (payload as { request?: { id?: unknown } }).request;
        if (req && typeof req === 'object' && typeof req.id === 'string') {
          requestId = req.id;
        }
      }
      console.log('[server] emitting request.created', { rooms: uniqueRooms, requestId });
    }
    for (const socketId of recipients) {
      this.server.to(socketId).emit(eventName, payload);
    }
  }

  private async authenticateClient(client: Socket): Promise<SocketUser> {
    const handshakeToken = typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : undefined;
    const headerValue = client.handshake.headers.authorization;
    const headerToken = typeof headerValue === 'string' && headerValue.startsWith('Bearer ')
      ? headerValue.slice('Bearer '.length)
      : undefined;
    const rawToken = handshakeToken ?? headerToken;

    if (!rawToken) {
      throw new UnauthorizedException('Missing socket token');
    }

    return this.jwtService.verifyAsync<SocketUser>(rawToken, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }
}
