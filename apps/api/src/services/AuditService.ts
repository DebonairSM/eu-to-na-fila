import type { DbClient } from '../db/types.js';
import { schema } from '../db/index.js';

/**
 * Actor types for audit logging.
 */
export type ActorType = 'customer' | 'staff' | 'owner' | 'system';

/**
 * Action types for audit logging.
 */
export type AuditAction =
  | 'ticket_created'
  | 'barber_assigned'
  | 'service_started'
  | 'service_completed'
  | 'ticket_cancelled'
  | 'position_updated'
  | 'wait_time_updated'
  | 'barber_preference_set';

/**
 * Metadata for audit log entries.
 */
export interface AuditMetadata {
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Service for audit logging.
 * 
 * All logging methods are fire-and-forget - they don't block the main request flow.
 * Errors are caught and logged but don't throw.
 */
export class AuditService {
  constructor(private db: DbClient) {}

  /**
   * Log an action to the audit log.
   * Fire-and-forget.
   */
  private async logAction(
    shopId: number,
    action: AuditAction,
    actorType: ActorType,
    data: {
      ticketId?: number;
      actorId?: number;
      metadata?: AuditMetadata;
    } = {}
  ): Promise<void> {
    setImmediate(async () => {
      try {
        await this.db.insert(schema.auditLog).values({
          shopId,
          ticketId: data.ticketId,
          action,
          actorType,
          actorId: data.actorId,
          metadata: data.metadata || {},
        });
      } catch (error) {
        console.error('[AuditService] Failed to log action:', {
          shopId,
          action,
          actorType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  logTicketCreated(
    ticketId: number,
    shopId: number,
    data: {
      customerName: string;
      serviceId: number;
      preferredBarberId?: number;
      actorType?: ActorType;
    }
  ): void {
    this.logAction(shopId, 'ticket_created', data.actorType || 'customer', {
      ticketId,
      metadata: {
        customerName: data.customerName,
        serviceId: data.serviceId,
        preferredBarberId: data.preferredBarberId,
      },
    });
  }

  logBarberAssigned(
    ticketId: number,
    shopId: number,
    barberId: number,
    data: { actorType?: ActorType; actorId?: number } = {}
  ): void {
    this.logAction(shopId, 'barber_assigned', data.actorType || 'staff', {
      ticketId,
      actorId: data.actorId || barberId,
      metadata: { barberId },
    });
  }

  logServiceStarted(
    ticketId: number,
    shopId: number,
    barberId: number,
    data: { actorType?: ActorType; actorId?: number } = {}
  ): void {
    this.logAction(shopId, 'service_started', data.actorType || 'staff', {
      ticketId,
      actorId: data.actorId || barberId,
      metadata: { barberId },
    });
  }

  logServiceCompleted(
    ticketId: number,
    shopId: number,
    barberId: number,
    data: { actorType?: ActorType; actorId?: number } = {}
  ): void {
    this.logAction(shopId, 'service_completed', data.actorType || 'staff', {
      ticketId,
      actorId: data.actorId || barberId,
      metadata: { barberId },
    });
  }

  logTicketCancelled(
    ticketId: number,
    shopId: number,
    data: { reason?: string; actorType?: ActorType; actorId?: number } = {}
  ): void {
    this.logAction(shopId, 'ticket_cancelled', data.actorType || 'customer', {
      ticketId,
      actorId: data.actorId,
      metadata: { reason: data.reason },
    });
  }

  logPositionUpdated(
    ticketId: number,
    shopId: number,
    oldPosition: number,
    newPosition: number
  ): void {
    this.logAction(shopId, 'position_updated', 'system', {
      ticketId,
      metadata: { oldValue: oldPosition, newValue: newPosition },
    });
  }

  logWaitTimeUpdated(
    ticketId: number,
    shopId: number,
    oldWaitTime: number | null,
    newWaitTime: number | null
  ): void {
    this.logAction(shopId, 'wait_time_updated', 'system', {
      ticketId,
      metadata: { oldValue: oldWaitTime, newValue: newWaitTime },
    });
  }

  logBarberPreferenceSet(
    ticketId: number,
    shopId: number,
    preferredBarberId: number
  ): void {
    this.logAction(shopId, 'barber_preference_set', 'customer', {
      ticketId,
      metadata: { preferredBarberId },
    });
  }
}
