import type { Ticket } from '../schemas/ticket';

export type WebSocketEventType = 
  | 'ticket.created'
  | 'ticket.status.changed'
  | 'metrics.updated'
  | 'connection.established'
  | 'error';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  shopId: string;
  timestamp: string;
  data: T;
}

export interface TicketCreatedEvent extends WebSocketEvent<Ticket> {
  type: 'ticket.created';
}

export interface TicketStatusChangedEvent extends WebSocketEvent<Ticket> {
  type: 'ticket.status.changed';
}

export interface QueueMetrics {
  waitingCount: number;
  inProgressCount: number;
  completedToday: number;
  averageWaitTime: number;
}

export interface MetricsUpdatedEvent extends WebSocketEvent<QueueMetrics> {
  type: 'metrics.updated';
}

export interface ConnectionEstablishedEvent extends WebSocketEvent<{ clientId: string }> {
  type: 'connection.established';
}

export interface ErrorEvent extends WebSocketEvent<{ message: string; code?: string }> {
  type: 'error';
}

