import type { FastifyPluginAsync } from 'fastify';
import type { WebSocketEvent } from '@eutonafila/shared';

export const websocketHandler: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const shopId = (request.query as { shopId?: string }).shopId || 'mineiro';

    console.log(`WebSocket client connected for shop: ${shopId}`);

    // Send connection established event
    const event: WebSocketEvent = {
      type: 'connection.established',
      shopId,
      timestamp: new Date().toISOString(),
      data: { clientId: connection.socket.remoteAddress || 'unknown' },
    };

    connection.socket.send(JSON.stringify(event));

    connection.socket.on('message', (message) => {
      console.log('Received message:', message.toString());
      // Handle incoming messages if needed
    });

    connection.socket.on('close', () => {
      console.log(`WebSocket client disconnected for shop: ${shopId}`);
    });

    connection.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
};

