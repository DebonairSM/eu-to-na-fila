declare module 'fastify-websocket' {
  import { FastifyPluginCallback, RouteShorthandOptions } from 'fastify';
  import { WebSocket as WSWebSocket } from 'ws';

  export interface SocketStream {
    socket: WSWebSocket;
    isServer: boolean;
  }

  export interface FastifyWebsocketOptions {
    options?: {
      maxPayload?: number;
      perMessageDeflate?: boolean;
      clientTracking?: boolean;
    };
  }

  export interface FastifyWebsocketRouteOptions extends RouteShorthandOptions {
    websocket: true;
  }

  const fastifyWebsocket: FastifyPluginCallback<FastifyWebsocketOptions>;

  export default fastifyWebsocket;
  export type { WSWebSocket as WebSocket };
}

