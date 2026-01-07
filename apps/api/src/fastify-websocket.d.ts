declare module 'fastify-websocket' {
  import { FastifyPluginCallback, RouteShorthandOptions } from 'fastify';
  import { WebSocket } from 'ws';

  export interface SocketStream {
    socket: WebSocket;
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
  export type { WebSocket };
}

