import type { WebSocket } from '@fastify/websocket';
import type { 
  WebSocketEvent, 
  TicketCreatedEvent,
  TicketStatusChangedEvent,
  MetricsUpdatedEvent,
  TicketStatus,
} from '@eutonafila/shared';
import type { Ticket } from '@eutonafila/shared';

/**
 * Client connection information.
 */
interface Client {
  socket: WebSocket;
  shopId: string;
  connectedAt: Date;
}

/**
 * Service for managing WebSocket connections and broadcasting events.
 * 
 * Handles:
 * - Client connection/disconnection
 * - Broadcasting events to specific shops
 * - Event creation and formatting
 * - Connection management
 */
export class WebSocketService {
  /**
   * Map of client ID to client connection.
   */
  private clients: Map<string, Client> = new Map();

  /**
   * Counter for generating client IDs.
   */
  private clientIdCounter = 0;

  /**
   * Register a new WebSocket client.
   * 
   * @param socket - WebSocket connection
   * @param shopId - Shop identifier the client is subscribing to
   * @returns The generated client ID
   * 
   * @example
   * ```typescript
   * const clientId = websocketService.addClient(socket, 'mineiro');
   * ```
   */
  addClient(socket: WebSocket, shopId: string): string {
    const clientId = `client-${++this.clientIdCounter}`;
    
    this.clients.set(clientId, {
      socket,
      shopId,
      connectedAt: new Date(),
    });

    console.log(`WebSocket client ${clientId} connected to shop ${shopId}`);
    console.log(`Total connected clients: ${this.clients.size}`);

    return clientId;
  }

  /**
   * Remove a WebSocket client.
   * 
   * @param clientId - Client ID to remove
   * 
   * @example
   * ```typescript
   * websocketService.removeClient('client-123');
   * ```
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`WebSocket client ${clientId} disconnected`);
      console.log(`Total connected clients: ${this.clients.size}`);
    }
  }

  /**
   * Broadcast an event to all clients subscribed to a shop.
   * 
   * @param shopId - Shop identifier
   * @param event - Event to broadcast
   * 
   * @example
   * ```typescript
   * websocketService.broadcast('mineiro', {
   *   type: 'ticket.created',
   *   shopId: 'mineiro',
   *   timestamp: new Date().toISOString(),
   *   data: { ticket }
   * });
   * ```
   */
  broadcast(shopId: string, event: WebSocketEvent): void {
    const message = JSON.stringify(event);
    let sentCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      // Only send to clients subscribed to this shop
      if (client.shopId === shopId) {
        try {
          if (client.socket.readyState === 1) { // WebSocket.OPEN
            client.socket.send(message);
            sentCount++;
          } else {
            // Remove disconnected clients
            this.removeClient(clientId);
          }
        } catch (error) {
          console.error(`Failed to send to client ${clientId}:`, error);
          this.removeClient(clientId);
        }
      }
    }

    console.log(`Broadcasted ${event.type} to ${sentCount} clients for shop ${shopId}`);
  }

  /**
   * Broadcast a ticket.created event.
   * 
   * @param shopId - Shop identifier
   * @param ticket - The created ticket
   * 
   * @example
   * ```typescript
   * websocketService.broadcastTicketCreated('mineiro', ticket);
   * ```
   */
  broadcastTicketCreated(shopId: string, ticket: Ticket): void {
    const event: TicketCreatedEvent = {
      type: 'ticket.created',
      shopId,
      timestamp: new Date().toISOString(),
      data: {
        ticket,
      },
    };

    this.broadcast(shopId, event);
  }

  /**
   * Broadcast a ticket.status.changed event.
   * 
   * @param shopId - Shop identifier
   * @param ticket - The updated ticket
   * @param previousStatus - The previous status
   * 
   * @example
   * ```typescript
   * websocketService.broadcastTicketStatusChanged(
   *   'mineiro',
   *   updatedTicket,
   *   'waiting'
   * );
   * ```
   */
  broadcastTicketStatusChanged(
    shopId: string,
    ticket: Ticket,
    previousStatus: TicketStatus
  ): void {
    const event: TicketStatusChangedEvent = {
      type: 'ticket.status.changed',
      shopId,
      timestamp: new Date().toISOString(),
      data: {
        ticket,
        previousStatus,
      },
    };

    this.broadcast(shopId, event);
  }

  /**
   * Broadcast a metrics.updated event.
   * 
   * @param shopId - Shop identifier
   * @param metrics - Updated metrics
   * 
   * @example
   * ```typescript
   * websocketService.broadcastMetricsUpdated('mineiro', {
   *   queueLength: 5,
   *   averageWaitTime: 35,
   *   activeBarbers: 2
   * });
   * ```
   */
  broadcastMetricsUpdated(
    shopId: string,
    metrics: {
      queueLength: number;
      averageWaitTime: number;
      activeBarbers: number;
      ticketsInProgress: number;
    }
  ): void {
    const event: MetricsUpdatedEvent = {
      type: 'metrics.updated',
      shopId,
      timestamp: new Date().toISOString(),
      data: metrics,
    };

    this.broadcast(shopId, event);
  }

  /**
   * Get the number of connected clients for a shop.
   * 
   * @param shopId - Shop identifier
   * @returns Number of connected clients
   */
  getClientCount(shopId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.shopId === shopId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get total number of connected clients across all shops.
   * 
   * @returns Total client count
   */
  getTotalClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get all shop IDs that have active clients.
   * 
   * @returns Array of shop IDs
   */
  getActiveShops(): string[] {
    const shops = new Set<string>();
    for (const client of this.clients.values()) {
      shops.add(client.shopId);
    }
    return Array.from(shops);
  }

  /**
   * Clean up disconnected clients.
   * Should be called periodically to remove stale connections.
   */
  cleanup(): void {
    const toRemove: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (client.socket.readyState !== 1) { // Not OPEN
        toRemove.push(clientId);
      }
    }

    for (const clientId of toRemove) {
      this.removeClient(clientId);
    }

    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} disconnected clients`);
    }
  }
}

/**
 * Singleton instance of WebSocketService.
 * Use this exported instance throughout the application.
 * 
 * @example
 * ```typescript
 * import { websocketService } from './services/WebSocketService.js';
 * 
 * websocketService.broadcastTicketCreated('mineiro', ticket);
 * ```
 */
export const websocketService = new WebSocketService();

// Cleanup disconnected clients every 30 seconds
setInterval(() => {
  websocketService.cleanup();
}, 30000);

