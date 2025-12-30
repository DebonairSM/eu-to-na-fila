import { db, schema } from '../db/index.js';

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
  /**
   * Log an action to the audit log.
   * This is a fire-and-forget operation that doesn't block the request.
   * 
   * @param shopId - Shop ID
   * @param action - Action type
   * @param actorType - Type of actor performing the action
   * @param data - Additional data including ticketId, actorId, and metadata
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
    // Fire-and-forget: use setImmediate to defer execution
    setImmediate(async () => {
      try {
        await db.insert(schema.auditLog).values({
          shopId,
          ticketId: data.ticketId,
          action,
          actorType,
          actorId: data.actorId,
          metadata: data.metadata || {},
        });
      } catch (error) {
        // Log error but don't throw - audit logging should never break the main flow
        console.error('[AuditService] Failed to log action:', {
          shopId,
          action,
          actorType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Log ticket creation.
   */
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

  /**
   * Log barber assignment.
   */
  logBarberAssigned(
    ticketId: number,
    shopId: number,
    barberId: number,
    data: {
      actorType?: ActorType;
      actorId?: number;
    } = {}
  ): void {
    this.logAction(shopId, 'barber_assigned', data.actorType || 'staff', {
      ticketId,
      actorId: data.actorId || barberId,
      metadata: {
        barberId,
      },
    });
  }

  /**
   * Log service start.
   */
  logServiceStarted(
    ticketId: number,
    shopId: number,
    barberId: number,
    data: {
      actorType?: ActorType;
      actorId?: number;
    } = {}
  ): void {
    this.logAction(shopId, 'service_started', data.actorType || 'staff', {
      ticketId,
      actorId: data.actorId || barberId,
      metadata: {
        barberId,
      },
    });
  }

  /**
   * Log service completion.
   */
  logServiceCompleted(
    ticketId: number,
    shopId: number,
    barberId: number,
    data: {
      actorType?: ActorType;
      actorId?: number;
    } = {}
  ): void {
    this.logAction(shopId, 'service_completed', data.actorType || 'staff', {
      ticketId,
      actorId: data.actorId || barberId,
      metadata: {
        barberId,
      },
    });
  }

  /**
   * Log ticket cancellation.
   */
  logTicketCancelled(
    ticketId: number,
    shopId: number,
    data: {
      reason?: string;
      actorType?: ActorType;
      actorId?: number;
    } = {}
  ): void {
    this.logAction(shopId, 'ticket_cancelled', data.actorType || 'customer', {
      ticketId,
      actorId: data.actorId,
      metadata: {
        reason: data.reason,
      },
    });
  }

  /**
   * Log position update.
   */
  logPositionUpdated(
    ticketId: number,
    shopId: number,
    oldPosition: number,
    newPosition: number
  ): void {
    this.logAction(shopId, 'position_updated', 'system', {
      ticketId,
      metadata: {
        oldValue: oldPosition,
        newValue: newPosition,
      },
    });
  }

  /**
   * Log wait time update.
   */
  logWaitTimeUpdated(
    ticketId: number,
    shopId: number,
    oldWaitTime: number | null,
    newWaitTime: number | null
  ): void {
    this.logAction(shopId, 'wait_time_updated', 'system', {
      ticketId,
      metadata: {
        oldValue: oldWaitTime,
        newValue: newWaitTime,
      },
    });
  }

  /**
   * Log barber preference set.
   */
  logBarberPreferenceSet(
    ticketId: number,
    shopId: number,
    preferredBarberId: number
  ): void {
    this.logAction(shopId, 'barber_preference_set', 'customer', {
      ticketId,
      metadata: {
        preferredBarberId,
      },
    });
  }
}

/**
 * Singleton instance of AuditService.
 * Use this exported instance throughout the application.
 * 
 * @example
 * ```typescript
 * import { auditService } from './services/AuditService.js';
 * 
 * auditService.logTicketCreated(ticketId, shopId, { customerName, serviceId });
 * ```
 */
export const auditService = new AuditService();



