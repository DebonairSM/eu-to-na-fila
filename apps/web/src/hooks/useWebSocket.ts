import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketEvent } from '@eutonafila/shared';
import { config } from '../lib/config';

export function useWebSocket(shopId: string = config.slug) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldConnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!shouldConnectRef.current) return;
    
    // Don't create a new connection if one already exists and is open
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Close any existing connection first
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${config.wsBase}/ws?shopId=${shopId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketEvent;
        console.log('WebSocket message:', data);
        setLastEvent(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      // Only log errors for connections we're actually trying to maintain
      // Ignore errors on connections that are being closed (e.g., during React StrictMode unmount)
      if (ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        console.error('WebSocket error:', error);
      }
    };

    ws.onclose = () => {
      // Only log unexpected disconnects (not during cleanup)
      if (shouldConnectRef.current) {
        console.log('WebSocket disconnected');
      }
      setIsConnected(false);
      
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Only reconnect if we should be connected AND there isn't already an active connection
      if (shouldConnectRef.current && wsRef.current?.readyState !== WebSocket.OPEN) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          // Double-check before reconnecting
          if (shouldConnectRef.current && wsRef.current?.readyState !== WebSocket.OPEN) {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }
        }, 3000);
      }
    };

    wsRef.current = ws;
  }, [shopId]);

  useEffect(() => {
    shouldConnectRef.current = true;
    connect();

    return () => {
      shouldConnectRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastEvent, ws: wsRef.current };
}

