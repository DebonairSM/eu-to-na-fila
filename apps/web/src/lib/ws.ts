import { config } from './config';

/**
 * WebSocket message types
 */
interface SubscribeMessage {
  type: 'subscribe';
  companyId: number;
}

interface SubscribeQueueMessage {
  type: 'subscribe.queue';
  shopSlug: string;
}

interface AdsUpdatedMessage {
  type: 'ads.updated';
  companyId: number;
  shopId: number | null;
  manifestVersion: number;
}

interface QueueUpdatedMessage {
  type: 'queue.updated';
  shopSlug: string;
  queueVersion: number;
}

interface SubscribedMessage {
  type: 'subscribed';
  companyId: number;
}

interface SubscribedQueueMessage {
  type: 'subscribed.queue';
  shopSlug: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ServerMessage = AdsUpdatedMessage | QueueUpdatedMessage | SubscribedMessage | SubscribedQueueMessage | ErrorMessage;

/**
 * WebSocket client for ads and queue invalidation.
 * Queue: subscribeQueue(shopSlug) receives queue.updated; consumers should refetch HTTP GET /shops/:slug/queue
 * (useQueue debounces refetches). WS does not carry ticket payloads.
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers: Map<number, Set<(adType: 'ad1' | 'ad2', version: number) => void>> = new Map();
  private queueSubscribers: Map<string, Set<(queueVersion: number) => void>> = new Map();
  private connectionSubscribers: Set<(connected: boolean) => void> = new Set();
  private isConnecting = false;

  private hasActiveSubscriptions(): boolean {
    return this.subscribers.size > 0 || this.queueSubscribers.size > 0;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    // Determine WebSocket URL
    // In dev, use ws://localhost:4041/ws (via proxy)
    // In prod, use wss://api-domain/ws
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = config.apiBase.startsWith('http') 
      ? new URL(config.apiBase).host 
      : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[WS] Connected to WebSocket server');
        this.notifyConnectionState(true);
        
        // Resubscribe to all active subscriptions by sending subscribe messages
        for (const companyId of this.subscribers.keys()) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: SubscribeMessage = {
              type: 'subscribe',
              companyId,
            };
            this.ws.send(JSON.stringify(message));
          }
        }
        for (const shopSlug of this.queueSubscribers.keys()) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: SubscribeQueueMessage = {
              type: 'subscribe.queue',
              shopSlug,
            };
            this.ws.send(JSON.stringify(message));
          }
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        this.isConnecting = false;
        this.notifyConnectionState(false);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        console.log('[WS] WebSocket connection closed');
        this.notifyConnectionState(false);
        
        // Attempt to reconnect if we still have active subscribers.
        if (this.hasActiveSubscriptions() && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('[WS] Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Handle incoming message from server
   */
  private handleMessage(message: ServerMessage): void {
    if (message.type === 'ads.updated') {
      const callbacks = this.subscribers.get(message.companyId);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback('ad1', message.manifestVersion);
            callback('ad2', message.manifestVersion);
          } catch (error) {
            console.error('[WS] Error in ad update callback:', error);
          }
        });
      }
    } else if (message.type === 'queue.updated') {
      const callbacks = this.queueSubscribers.get(message.shopSlug);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(message.queueVersion);
          } catch (error) {
            console.error('[WS] Error in queue update callback:', error);
          }
        });
      }
    } else if (message.type === 'subscribed') {
      console.log(`[WS] Subscribed to company ${message.companyId}`);
    } else if (message.type === 'subscribed.queue') {
      console.log(`[WS] Subscribed to queue ${message.shopSlug}`);
    } else if (message.type === 'error') {
      console.error('[WS] Server error:', message.message);
    }
  }

  private notifyConnectionState(connected: boolean): void {
    this.connectionSubscribers.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error('[WS] Error in connection callback:', error);
      }
    });
  }

  /**
   * Subscribe to ad updates for a company
   */
  subscribe(companyId: number, callback: (adType: 'ad1' | 'ad2', version: number) => void): () => void {
    // Ensure connection is established
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Add callback to subscribers
    if (!this.subscribers.has(companyId)) {
      this.subscribers.set(companyId, new Set());
    }
    this.subscribers.get(companyId)!.add(callback);

    // Send subscribe message if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: SubscribeMessage = {
        type: 'subscribe',
        companyId,
      };
      this.ws.send(JSON.stringify(message));
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(companyId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(companyId);
        }
      }
    };
  }

  subscribeQueue(shopSlug: string, callback: (queueVersion: number) => void): () => void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    if (!this.queueSubscribers.has(shopSlug)) {
      this.queueSubscribers.set(shopSlug, new Set());
    }
    this.queueSubscribers.get(shopSlug)!.add(callback);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: SubscribeQueueMessage = {
        type: 'subscribe.queue',
        shopSlug,
      };
      this.ws.send(JSON.stringify(message));
    }

    return () => {
      const callbacks = this.queueSubscribers.get(shopSlug);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.queueSubscribers.delete(shopSlug);
        }
      }
    };
  }

  onConnectionStateChange(callback: (connected: boolean) => void): () => void {
    this.connectionSubscribers.add(callback);
    callback(this.ws?.readyState === WebSocket.OPEN);
    return () => {
      this.connectionSubscribers.delete(callback);
    };
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.queueSubscribers.clear();
    this.connectionSubscribers.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }
}

/**
 * Singleton WebSocket client instance
 */
export const wsClient = new WebSocketClient();

