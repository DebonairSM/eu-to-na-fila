import type { Ticket, TicketStatus } from '../schemas/ticket';

/**
 * All possible WebSocket event types.
 */
export type WebSocketEventType = 
  | 'connection.established'
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.status.changed'
  | 'ticket.deleted'
  | 'metrics.updated'
  | 'barber.status.changed'
  | 'queue.cleared'
  | 'error';

/**
 * Base WebSocket event structure.
 * All events follow this format.
 */
export interface WebSocketEvent {
  /**
   * Event type identifier.
   */
  type: WebSocketEventType;

  /**
   * Shop identifier this event belongs to.
   */
  shopId: string;

  /**
   * ISO 8601 timestamp when event occurred.
   */
  timestamp: string;

  /**
   * Event-specific data payload.
   */
  data: any;
}

/**
 * Sent immediately after client connects.
 * Confirms WebSocket connection is established.
 */
export interface ConnectionEstablishedEvent {
  type: 'connection.established';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * Unique client identifier for this connection.
     */
    clientId: string;
  };
}

/**
 * Sent when a new ticket is created.
 * All clients subscribed to the shop receive this event.
 */
export interface TicketCreatedEvent {
  type: 'ticket.created';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * The newly created ticket.
     */
    ticket: Ticket;
  };
}

/**
 * Sent when any ticket field is updated.
 * This is a general update event for non-status changes.
 */
export interface TicketUpdatedEvent {
  type: 'ticket.updated';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * The updated ticket.
     */
    ticket: Ticket;

    /**
     * Fields that were changed.
     */
    changedFields: string[];
  };
}

/**
 * Sent when a ticket's status changes.
 * This is the most important event for queue updates.
 */
export interface TicketStatusChangedEvent {
  type: 'ticket.status.changed';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * The ticket with updated status.
     */
    ticket: Ticket;

    /**
     * Previous status before the change.
     */
    previousStatus: TicketStatus;
  };
}

/**
 * Sent when a ticket is deleted (soft or hard delete).
 */
export interface TicketDeletedEvent {
  type: 'ticket.deleted';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * ID of the deleted ticket.
     */
    ticketId: number;
  };
}

/**
 * Queue metrics data.
 */
export interface QueueMetrics {
  /**
   * Number of tickets with status 'waiting'.
   */
  queueLength: number;

  /**
   * Number of tickets currently in progress.
   */
  ticketsInProgress: number;

  /**
   * Average estimated wait time in minutes.
   */
  averageWaitTime: number;

  /**
   * Number of active (available) barbers.
   */
  activeBarbers: number;

  /**
   * Number of tickets completed today.
   */
  completedToday?: number;
}

/**
 * Sent when queue metrics are recalculated.
 * Typically sent after ticket creation or status changes.
 */
export interface MetricsUpdatedEvent {
  type: 'metrics.updated';
  shopId: string;
  timestamp: string;
  data: QueueMetrics;
}

/**
 * Sent when a barber's availability status changes.
 */
export interface BarberStatusChangedEvent {
  type: 'barber.status.changed';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * Barber ID.
     */
    barberId: number;

    /**
     * New active status.
     */
    isActive: boolean;

    /**
     * Barber name.
     */
    name: string;
  };
}

/**
 * Sent when the entire queue is cleared.
 * This is an administrative action.
 */
export interface QueueClearedEvent {
  type: 'queue.cleared';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * Number of tickets that were cleared.
     */
    clearedCount: number;

    /**
     * Reason for clearing (optional).
     */
    reason?: string;
  };
}

/**
 * Sent when an error occurs that clients should be aware of.
 */
export interface ErrorEvent {
  type: 'error';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * Error message.
     */
    message: string;

    /**
     * Error code for programmatic handling.
     */
    code?: string;

    /**
     * Additional error details.
     */
    details?: Record<string, any>;
  };
}

/**
 * Union type of all possible WebSocket events.
 * Use this for type-safe event handling.
 */
export type AnyWebSocketEvent =
  | ConnectionEstablishedEvent
  | TicketCreatedEvent
  | TicketUpdatedEvent
  | TicketStatusChangedEvent
  | TicketDeletedEvent
  | MetricsUpdatedEvent
  | BarberStatusChangedEvent
  | QueueClearedEvent
  | ErrorEvent;

/**
 * Type guard to check if event is a ticket event.
 */
export function isTicketEvent(
  event: WebSocketEvent
): event is TicketCreatedEvent | TicketUpdatedEvent | TicketStatusChangedEvent {
  return (
    event.type === 'ticket.created' ||
    event.type === 'ticket.updated' ||
    event.type === 'ticket.status.changed'
  );
}

/**
 * Type guard to check if event is a metrics event.
 */
export function isMetricsEvent(
  event: WebSocketEvent
): event is MetricsUpdatedEvent {
  return event.type === 'metrics.updated';
}

/**
 * Type guard to check if event is an error event.
 */
export function isErrorEvent(
  event: WebSocketEvent
): event is ErrorEvent {
  return event.type === 'error';
}

