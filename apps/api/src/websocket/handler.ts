import type { FastifyPluginAsync } from 'fastify';
import type { WebSocketEvent } from '@eutonafila/shared';
import { websocketService } from '../services/WebSocketService.js';

export const websocketHandler: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const shopId = (request.query as { shopId?: string }).shopId || 'mineiro';

    console.log(`WebSocket client connected for shop: ${shopId}`);

    // Add client to the WebSocket service
    const clientId = websocketService.addClient(connection, shopId);

    // Send connection established event
    const event: WebSocketEvent = {
      type: 'connection.established',
      shopId,
      timestamp: new Date().toISOString(),
      data: { clientId },
    };

    connection.send(JSON.stringify(event));

    connection.on('message', (message: any) => {
      console.log('Received message:', message.toString());
      // Handle incoming messages if needed
    });

    connection.on('close', () => {
      console.log(`WebSocket client disconnected for shop: ${shopId}`);
      websocketService.removeClient(clientId);
    });

    connection.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  });
};

