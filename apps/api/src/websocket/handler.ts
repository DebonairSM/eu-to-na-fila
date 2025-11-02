import type { FastifyPluginAsync } from 'fastify';
import type { WebSocketEvent } from '@eutonafila/shared';

export const websocketHandler: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const shopId = (request.query as { shopId?: string }).shopId || 'mineiro';

    console.log(`WebSocket client connected for shop: ${shopId}`);

    // Add client to the broadcast set
    (fastify as any).addWsClient(connection);

    // Send connection established event
    const event: WebSocketEvent = {
      type: 'connection.established',
      shopId,
      timestamp: new Date().toISOString(),
      data: { clientId: 'client' },
    };

    connection.send(JSON.stringify(event));

    connection.on('message', (message: any) => {
      console.log('Received message:', message.toString());
      // Handle incoming messages if needed
    });

    connection.on('close', () => {
      console.log(`WebSocket client disconnected for shop: ${shopId}`);
      (fastify as any).removeWsClient(connection);
    });

    connection.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  });
};

