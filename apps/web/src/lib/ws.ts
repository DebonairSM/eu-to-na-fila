import { config } from './config';

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

interface SubscribedMessage {
  type: 'subscribed';
  companyId: number;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ServerMessage = AdUpdatedMessage | SubscribedMessage | ErrorMessage;

/**
 * WebSocket client for real-time ad updates
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers: Map<number, Set<(adType: 'ad1' | 'ad2', version: number) => void>> = new Map();
  private isConnecting = false;

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
        
        // Resubscribe to all active subscriptions
        for (const companyId of this.subscribers.keys()) {
          this.subscribe(companyId);
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
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        console.log('[WS] WebSocket connection closed');
        
        // Attempt to reconnect if we have subscribers
        if (this.subscribers.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
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
            callback(message.adType, message.version);
          } catch (error) {
            console.error('[WS] Error in ad update callback:', error);
          }
        });
      }
    } else if (message.type === 'subscribed') {
      console.log(`[WS] Subscribed to company ${message.companyId}`);
    } else if (message.type === 'error') {
      console.error('[WS] Server error:', message.message);
    }
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

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }
}

/**
 * Singleton WebSocket client instance
 */
export const wsClient = new WebSocketClient();

