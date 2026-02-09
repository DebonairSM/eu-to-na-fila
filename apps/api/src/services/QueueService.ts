import type { DbClient } from '../db/types.js';
import { schema } from '../db/index.js';
import { eq, and, asc, inArray } from 'drizzle-orm';
import type { AuditService } from './AuditService.js';

/**
 * Service for managing queue operations.
 * 
 * General line: tickets with no preferred barber, or whose preferred barber is inactive.
 */
export class QueueService {
  constructor(
    private db: DbClient,
    private auditService: AuditService
  ) {}

  private async getActiveBarberIds(shopId: number): Promise<Set<number>> {
    const barbers = await this.db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true)
      ),
    });
    return new Set(barbers.map((b) => b.id));
  }

  private async getGeneralLineWaitingTickets(shopId: number) {
    const activeBarberIds = await this.getActiveBarberIds(shopId);
    const waitingTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });
    return waitingTickets.filter(
      (t) => t.preferredBarberId === null || !activeBarberIds.has(t.preferredBarberId!)
    );
  }

  private async loadServiceDurations(serviceIds: Set<number>): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (serviceIds.size === 0) return map;
    const services = await this.db.query.services.findMany({
      where: inArray(schema.services.id, [...serviceIds]),
    });
    for (const s of services) map.set(s.id, s.duration);
    return map;
  }

  private async loadBarberWeekdayStats(
    barberIds: number[],
    serviceIds: number[]
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (barberIds.length === 0 || serviceIds.length === 0) return map;
    const todayDow = new Date().getDay();
    const stats = await this.db.query.barberServiceWeekdayStats.findMany({
      where: and(
        eq(schema.barberServiceWeekdayStats.dayOfWeek, todayDow),
        inArray(schema.barberServiceWeekdayStats.barberId, barberIds),
        inArray(schema.barberServiceWeekdayStats.serviceId, serviceIds),
      ),
    });
    for (const s of stats) {
      if (s.totalCompleted >= 10) {
        map.set(`${s.barberId}:${s.serviceId}`, s.avgDuration);
      }
    }
    return map;
  }

  async calculatePosition(shopId: number, createdAt: Date = new Date()): Promise<number> {
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const ticketsAhead = generalLineTickets.filter(
      (ticket) => new Date(ticket.createdAt) < createdAt
    );
    return ticketsAhead.length + 1;
  }

  async calculateWaitTime(shopId: number, position: number): Promise<number | null> {
    if (position === 0) return null;
    const now = new Date();

    const activeBarbers = await this.db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true),
        eq(schema.barbers.isPresent, true)
      ),
    });

    const inProgressTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress')
      ),
    });
    const inProgressWithBarbers = inProgressTickets.filter(t => t.barberId !== null);

    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const ticketsAhead = generalLineTickets.slice(0, Math.max(position - 1, 0));

    const serviceIds = new Set<number>();
    for (const t of inProgressWithBarbers) serviceIds.add(t.serviceId);
    for (const t of ticketsAhead) serviceIds.add(t.serviceId);
    const durations = await this.loadServiceDurations(serviceIds);

    const barberIds = activeBarbers.map((b) => b.id);
    const barberStats = await this.loadBarberWeekdayStats(barberIds, [...serviceIds]);

    const getDuration = (serviceId: number, barberId?: number) => {
      if (barberId) {
        const avg = barberStats.get(`${barberId}:${serviceId}`);
        if (avg !== undefined) return avg;
      }
      return durations.get(serviceId) ?? 20;
    };

    const barberAvailability: number[] = [];
    for (const barber of activeBarbers) {
      const inProgress = inProgressWithBarbers.find(t => t.barberId === barber.id);
      if (inProgress) {
        const startTime = inProgress.startedAt
          ? new Date(inProgress.startedAt)
          : inProgress.updatedAt ? new Date(inProgress.updatedAt) : now;
        const elapsedMinutes = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);
        const serviceDuration = getDuration(inProgress.serviceId, barber.id);
        barberAvailability.push(Math.max(0, serviceDuration - elapsedMinutes));
      } else {
        barberAvailability.push(0);
      }
    }

    if (barberAvailability.length === 0) {
      barberAvailability.push(0);
    }

    for (const ticket of ticketsAhead) {
      const minTime = Math.min(...barberAvailability);
      const minIdx = barberAvailability.indexOf(minTime);
      const barberId = activeBarbers[minIdx]?.id;
      barberAvailability[minIdx] += getDuration(ticket.serviceId, barberId);
    }

    return Math.ceil(Math.min(...barberAvailability));
  }

  async recalculatePositions(shopId: number): Promise<number> {
    const waitingTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });

    let updateCount = 0;
    for (let i = 0; i < waitingTickets.length; i++) {
      const newPosition = i + 1;
      if (waitingTickets[i].position !== newPosition) {
        const oldPosition = waitingTickets[i].position;
        await this.db
          .update(schema.tickets)
          .set({ position: newPosition, updatedAt: new Date() })
          .where(eq(schema.tickets.id, waitingTickets[i].id));
        this.auditService.logPositionUpdated(waitingTickets[i].id, shopId, oldPosition, newPosition);
        updateCount++;
      }
    }

    await this.db
      .update(schema.tickets)
      .set({ position: 0 })
      .where(
        and(
          eq(schema.tickets.shopId, shopId),
          eq(schema.tickets.status, 'in_progress')
        )
      );

    return updateCount;
  }

  async getMetrics(shopId: number): Promise<{
    queueLength: number;
    averageWaitTime: number;
    activeBarbers: number;
    ticketsInProgress: number;
  }> {
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const totalWaitTime = generalLineTickets.reduce(
      (sum, t) => sum + (t.estimatedWaitTime ?? 0),
      0
    );
    const averageWaitTime = generalLineTickets.length > 0
      ? Math.ceil(totalWaitTime / generalLineTickets.length)
      : 0;

    const inProgressTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress')
      ),
    });

    const activeBarbers = await this.db.query.barbers.findMany({
      where: and(
        eq(schema.barbers.shopId, shopId),
        eq(schema.barbers.isActive, true),
        eq(schema.barbers.isPresent, true)
      ),
    });

    return {
      queueLength: generalLineTickets.length,
      averageWaitTime,
      activeBarbers: activeBarbers.length,
      ticketsInProgress: inProgressTickets.length,
    };
  }

  async isQueueFull(shopId: number, maxQueueSize: number = 80): Promise<boolean> {
    const { queueLength } = await this.getMetrics(shopId);
    return queueLength >= maxQueueSize;
  }

  async calculatePositionForPreferredBarber(
    shopId: number,
    preferredBarberId: number,
    createdAt: Date = new Date()
  ): Promise<number> {
    const waitingTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting'),
        eq(schema.tickets.preferredBarberId, preferredBarberId)
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });
    const ticketsAhead = waitingTickets.filter(
      ticket => new Date(ticket.createdAt) < createdAt
    );
    return ticketsAhead.length + 1;
  }

  async calculateWaitTimeForPreferredBarber(
    shopId: number,
    preferredBarberId: number,
    position: number,
    createdAt: Date = new Date()
  ): Promise<number | null> {
    if (position === 0) return null;
    const now = new Date();

    const waitingTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting'),
        eq(schema.tickets.preferredBarberId, preferredBarberId)
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });
    const ticketsAhead = waitingTickets.filter(
      ticket => new Date(ticket.createdAt) < createdAt
    );

    const inProgressTicket = await this.db.query.tickets.findFirst({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'in_progress'),
        eq(schema.tickets.barberId, preferredBarberId)
      ),
    });

    const serviceIds = new Set<number>();
    for (const t of ticketsAhead) serviceIds.add(t.serviceId);
    if (inProgressTicket) serviceIds.add(inProgressTicket.serviceId);
    const durations = await this.loadServiceDurations(serviceIds);

    const barberStats = await this.loadBarberWeekdayStats(
      [preferredBarberId],
      [...serviceIds]
    );

    const getDuration = (serviceId: number) => {
      const avg = barberStats.get(`${preferredBarberId}:${serviceId}`);
      if (avg !== undefined) return avg;
      return durations.get(serviceId) ?? 20;
    };

    let barberAvailability = 0;
    if (inProgressTicket) {
      const startTime = inProgressTicket.startedAt
        ? new Date(inProgressTicket.startedAt)
        : inProgressTicket.updatedAt ? new Date(inProgressTicket.updatedAt) : now;
      const elapsedMinutes = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);
      const serviceDuration = getDuration(inProgressTicket.serviceId);
      barberAvailability = Math.max(0, serviceDuration - elapsedMinutes);
    }

    let totalWait = barberAvailability;
    for (const ticket of ticketsAhead) {
      totalWait += getDuration(ticket.serviceId);
    }
    return Math.ceil(totalWait);
  }
}
