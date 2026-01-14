import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import type { WebSocket as WSWebSocket } from 'ws';

/**
 * WebSocket message types
 */
interface SubscribeMessage {
  type: 'subscribe';
  companyId: number;
}

interface AdsUpdatedMessage {
  type: 'ads.updated';
  companyId: number;
  shopId: number | null;
  manifestVersion: number;
}

type ClientMessage = SubscribeMessage;

/**
 * WebSocket connection with subscription info
 */
interface WSConnection {
  socket: WSWebSocket;
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
  addConnection(stream: SocketStream): WSConnection {
    const socket = stream.socket;
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
   * Broadcast ads updated event to all subscribed clients for a company.
   * Clients should refetch the manifest after receiving this.
   * 
   * @param companyId - Company ID
   * @param shopId - Shop ID (optional, null for company-wide ads)
   * @param manifestVersion - Current manifest version for cache busting
   */
  broadcastAdsUpdated(companyId: number, shopId: number | null, manifestVersion?: number): void {
    const message: AdsUpdatedMessage = {
      type: 'ads.updated',
      companyId,
      shopId,
      manifestVersion: manifestVersion || Date.now(), // Use timestamp as fallback
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
      console.log(`[WS] Broadcasted ads updated to ${sentCount} client(s): companyId=${companyId}, shopId=${shopId}, manifestVersion=${message.manifestVersion}`);
    }
  }

  /**
   * Legacy method for backward compatibility (deprecated, use broadcastAdsUpdated)
   * @deprecated Use broadcastAdsUpdated instead
   */
  broadcastAdUpdate(companyId: number, adType: 'ad1' | 'ad2', version: number): void {
    // Convert to new format
    this.broadcastAdsUpdated(companyId, null);
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
  // Important: disable implicit HEAD route creation for this GET route.
  // Fastify (v4) creates a sibling HEAD route for every GET route by default, and
  // @fastify/websocket throws if a websocket handler is declared on a non-GET method.
  fastify.get('/ws', { websocket: true, exposeHeadRoute: false }, (connection: SocketStream, req: FastifyRequest) => {
    wsManager.addConnection(connection);
  });

  console.log('[WS] WebSocket server registered at /ws');
}

