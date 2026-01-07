import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';

/**
 * WebSocket message types
 */
interface SubscribeMessage {
  type: 'subscribe';
  companyId: number;
}

interface AdUpdatedMessage {
  type: 'ads.updated';
  companyId: number;
  adType: 'ad1' | 'ad2';
  version: number;
}

type ClientMessage = SubscribeMessage;

/**
 * WebSocket connection with subscription info
 */
interface WSConnection {
  socket: WebSocket;
  companyId: number | null;
}

/**
 * WebSocket manager for broadcasting ad updates
 */
export class WebSocketManager {
  private connections: Set<WSConnection> = new Set();

  /**
   * Register a new WebSocket connection
   */
  addConnection(socket: WebSocket): WSConnection {
    const conn: WSConnection = {
      socket,
      companyId: null,
    };
    this.connections.add(conn);

    // Handle messages from client
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as ClientMessage;
        this.handleMessage(conn, data);
      } catch (error) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });

    // Handle connection close
    socket.on('close', () => {
      this.connections.delete(conn);
    });

    return conn;
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(conn: WSConnection, message: ClientMessage): void {
    if (message.type === 'subscribe') {
      conn.companyId = message.companyId;
      conn.socket.send(JSON.stringify({
        type: 'subscribed',
        companyId: message.companyId,
      }));
    }
  }

  /**
   * Broadcast ad update to all subscribed clients for a company
   */
  broadcastAdUpdate(companyId: number, adType: 'ad1' | 'ad2', version: number): void {
    const message: AdUpdatedMessage = {
      type: 'ads.updated',
      companyId,
      adType,
      version,
    };

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    for (const conn of this.connections) {
      if (conn.companyId === companyId && conn.socket.readyState === 1) {
        try {
          conn.socket.send(messageStr);
          sentCount++;
        } catch (error) {
          // Connection might be closing, remove it
          this.connections.delete(conn);
        }
      }
    }

    // Log broadcast for debugging (optional)
    if (sentCount > 0) {
      console.log(`[WS] Broadcasted ad update to ${sentCount} client(s): companyId=${companyId}, adType=${adType}, version=${version}`);
    }
  }

  /**
   * Get connection count (for monitoring)
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

/**
 * Register WebSocket route handler
 */
export async function registerWebSocket(fastify: FastifyInstance): Promise<void> {
  const wsManager = new WebSocketManager();

  // Attach manager to fastify instance for use in routes
  (fastify as any).wsManager = wsManager;

  // Register WebSocket route at /ws
  fastify.get('/ws', { websocket: true }, (connection: WebSocket, req: FastifyRequest) => {
    wsManager.addConnection(connection);
  });

  console.log('[WS] WebSocket server registered at /ws');
}

