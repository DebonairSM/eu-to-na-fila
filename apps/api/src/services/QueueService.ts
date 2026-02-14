import type { DbClient } from '../db/types.js';
import { schema } from '../db/index.js';
import { eq, and, asc, inArray, gt } from 'drizzle-orm';
import type { AuditService } from './AuditService.js';
import type { ShopSettings } from '@eutonafila/shared';

/** Minimal ticket shape for wait-time computation. */
export interface TicketForRecalc {
  id: number;
  serviceId: number;
  preferredBarberId: number | null;
  createdAt: Date;
}

/** In-progress ticket shape for wave simulation. */
export interface InProgressForRecalc {
  barberId: number | null;
  serviceId: number;
  startedAt: Date | null;
  updatedAt: Date | null;
}

/** Barber shape for context. */
export interface BarberForRecalc {
  id: number;
  isActive: boolean;
  isPresent: boolean;
}

/** Pre-loaded shop context for batch wait-time computation (avoids N+1 queries). */
export interface PreloadedShopContext {
  activeBarberIds: Set<number>;
  presentBarbers: BarberForRecalc[];
  waitingTickets: TicketForRecalc[];
  inProgressTickets: InProgressForRecalc[];
  serviceDurations: Map<number, number>;
  barberStats: Map<string, number>;
  /** Fallback duration (minutes) when service duration is not found. */
  defaultServiceDuration: number;
}

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

  /**
   * Load all context needed to compute wait times for a shop in one shot.
   * Used by TicketService.recalculateWaitTimes to avoid N+1 queries.
   */
  async loadContextForRecalc(
    shopId: number,
    waitingTickets: TicketForRecalc[],
    defaultServiceDuration: number = 20
  ): Promise<PreloadedShopContext> {
    const [barbers, inProgressRows] = await Promise.all([
      this.db.query.barbers.findMany({
        where: and(eq(schema.barbers.shopId, shopId), eq(schema.barbers.isActive, true)),
      }),
      this.db.query.tickets.findMany({
        where: and(
          eq(schema.tickets.shopId, shopId),
          eq(schema.tickets.status, 'in_progress')
        ),
      }),
    ]);

    const activeBarberIds = new Set(barbers.map((b) => b.id));
    const presentBarbers: BarberForRecalc[] = barbers
      .filter((b) => b.isPresent)
      .map((b) => ({ id: b.id, isActive: b.isActive, isPresent: b.isPresent }));

    const inProgressTickets: InProgressForRecalc[] = inProgressRows.map((t) => ({
      barberId: t.barberId,
      serviceId: t.serviceId,
      startedAt: t.startedAt,
      updatedAt: t.updatedAt,
    }));

    const serviceIds = new Set<number>();
    for (const t of waitingTickets) serviceIds.add(t.serviceId);
    for (const t of inProgressRows) serviceIds.add(t.serviceId);

    const barberIds = barbers.map((b) => b.id);
    const [serviceDurations, barberStats] = await Promise.all([
      this.loadServiceDurations(serviceIds),
      this.loadBarberWeekdayStats(barberIds, [...serviceIds]),
    ]);

    return {
      activeBarberIds,
      presentBarbers,
      waitingTickets,
      inProgressTickets,
      serviceDurations,
      barberStats,
      defaultServiceDuration,
    };
  }

  /**
   * Compute position and estimated wait time for every waiting ticket using pre-loaded context.
   * Pure in-memory wave simulation; no DB reads.
   */
  computeWaitTimesForWaitingTickets(
    _shopId: number,
    ctx: PreloadedShopContext
  ): Map<number, { position: number; estimatedWaitTime: number | null }> {
    const now = new Date();
    const result = new Map<number, { position: number; estimatedWaitTime: number | null }>();

    const getDuration = (serviceId: number, barberId?: number) => {
      if (barberId) {
        const avg = ctx.barberStats.get(`${barberId}:${serviceId}`);
        if (avg !== undefined) return avg;
      }
      return ctx.serviceDurations.get(serviceId) ?? ctx.defaultServiceDuration;
    };

    const inProgressWithBarbers = ctx.inProgressTickets.filter((t) => t.barberId !== null);

    const generalLineTickets = ctx.waitingTickets
      .filter(
        (t) =>
          t.preferredBarberId === null || !ctx.activeBarberIds.has(t.preferredBarberId!)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const ticket of ctx.waitingTickets) {
      const ticketCreatedAt = new Date(ticket.createdAt);
      const usePreferred =
        ticket.preferredBarberId !== null &&
        ctx.activeBarberIds.has(ticket.preferredBarberId);

      let position: number;
      let estimatedWaitTime: number | null;

      if (usePreferred && ticket.preferredBarberId !== null) {
        const preferredLine = ctx.waitingTickets
          .filter((t) => t.preferredBarberId === ticket.preferredBarberId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const ticketsAhead = preferredLine.filter(
          (t) => new Date(t.createdAt) < ticketCreatedAt
        );
        position = ticketsAhead.length + 1;

        const inProgressForBarber = inProgressWithBarbers.find(
          (t) => t.barberId === ticket.preferredBarberId
        );
        let barberAvailability = 0;
        if (inProgressForBarber) {
          const startTime = inProgressForBarber.startedAt
            ? new Date(inProgressForBarber.startedAt)
            : inProgressForBarber.updatedAt
              ? new Date(inProgressForBarber.updatedAt)
              : now;
          const elapsedMinutes = Math.max(
            0,
            (now.getTime() - startTime.getTime()) / 60000
          );
          const serviceDuration = getDuration(
            inProgressForBarber.serviceId,
            ticket.preferredBarberId
          );
          barberAvailability = Math.max(0, serviceDuration - elapsedMinutes);
        }
        let totalWait = barberAvailability;
        for (const t of ticketsAhead) {
          totalWait += getDuration(t.serviceId, ticket.preferredBarberId);
        }
        estimatedWaitTime = position === 0 ? null : Math.ceil(totalWait);
      } else {
        const ticketsAhead = generalLineTickets.filter(
          (t) => new Date(t.createdAt) < ticketCreatedAt
        );
        position = ticketsAhead.length + 1;

        const activeBarbers = ctx.presentBarbers;
        const barberAvailability: number[] = [];
        for (const barber of activeBarbers) {
          const inProgress = inProgressWithBarbers.find((t) => t.barberId === barber.id);
          if (inProgress) {
            const startTime = inProgress.startedAt
              ? new Date(inProgress.startedAt)
              : inProgress.updatedAt
                ? new Date(inProgress.updatedAt)
                : now;
            const elapsedMinutes = Math.max(
              0,
              (now.getTime() - startTime.getTime()) / 60000
            );
            const serviceDuration = getDuration(inProgress.serviceId, barber.id);
            barberAvailability.push(Math.max(0, serviceDuration - elapsedMinutes));
          } else {
            barberAvailability.push(0);
          }
        }
        if (barberAvailability.length === 0) barberAvailability.push(0);

        for (const t of ticketsAhead) {
          const minTime = Math.min(...barberAvailability);
          const minIdx = barberAvailability.indexOf(minTime);
          const barberId = activeBarbers[minIdx]?.id;
          barberAvailability[minIdx] += getDuration(t.serviceId, barberId);
        }
        estimatedWaitTime =
          position === 0 ? null : Math.ceil(Math.min(...barberAvailability));
      }

      result.set(ticket.id, { position, estimatedWaitTime });
    }

    return result;
  }

  async calculatePosition(shopId: number, createdAt: Date = new Date()): Promise<number> {
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const ticketsAhead = generalLineTickets.filter(
      (ticket) => new Date(ticket.createdAt) < createdAt
    );
    return ticketsAhead.length + 1;
  }

  /** Run wave simulation for a given list of tickets ahead; returns wait in minutes. */
  private async runWaveWaitTime(
    shopId: number,
    ticketsAhead: Array<{ serviceId: number; preferredBarberId: number | null }>,
    defaultServiceDuration: number
  ): Promise<number | null> {
    if (ticketsAhead.length === 0) return 0;
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
      return durations.get(serviceId) ?? defaultServiceDuration;
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

  async calculateWaitTime(shopId: number, position: number, defaultServiceDuration: number = 20): Promise<number | null> {
    if (position === 0) return null;
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const ticketsAhead = generalLineTickets.slice(0, Math.max(position - 1, 0));
    return this.runWaveWaitTime(shopId, ticketsAhead, defaultServiceDuration);
  }

  /**
   * Per-appointment wait: when would THIS appointment be served if they and all other pending
   * appointments (same line) joined the queue now? Merges current waiting + all pending for
   * general line, sorts by weighted order, finds this appointment's position, returns wait for
   * tickets ahead. Only the closer appointment gets a short wait; one 3h away has many ahead.
   */
  async calculateWaitTimeForPendingAppointment(
    shopId: number,
    appointment: {
      id: number;
      serviceId: number;
      preferredBarberId: number | null;
      scheduledTime: Date | string | null;
    },
    allPendingAppointments: Array<{
      id: number;
      serviceId: number;
      preferredBarberId: number | null;
      scheduledTime: Date | string | null;
    }>,
    now: Date,
    defaultServiceDuration: number
  ): Promise<number | null> {
    const activeBarberIds = await this.getActiveBarberIds(shopId);
    const generalLinePending = allPendingAppointments.filter(
      (p) => p.preferredBarberId === null || !activeBarberIds.has(p.preferredBarberId!)
    );
    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const generalWithType = generalLineTickets.map((t) => ({
      ...t,
      id: t.id,
      type: (t as { type?: string }).type ?? 'walkin',
      scheduledTime: (t as { scheduledTime?: Date | string | null }).scheduledTime ?? null,
      checkInTime: (t as { checkInTime?: Date | string | null }).checkInTime ?? null,
      createdAt: t.createdAt,
      serviceId: t.serviceId,
      preferredBarberId: t.preferredBarberId,
    }));
    const pendingAsWaiting = generalLinePending.map((a) => ({
      ...a,
      type: 'appointment' as const,
      scheduledTime: a.scheduledTime,
      checkInTime: now,
      createdAt: now,
    }));
    const merged = this.sortWaitingTicketsByWeighted(
      [...generalWithType, ...pendingAsWaiting] as Array<{
        id: number;
        type?: string | null;
        scheduledTime?: Date | string | null;
        checkInTime?: Date | string | null;
        createdAt: Date | string;
        serviceId: number;
        preferredBarberId: number | null;
      }>,
      now
    );
    const appointmentIndex = merged.findIndex((t) => t.id === appointment.id);
    if (appointmentIndex < 0) return null;
    const ticketsAhead = merged.slice(0, appointmentIndex);
    return this.runWaveWaitTime(
      shopId,
      ticketsAhead.map((t) => ({ serviceId: t.serviceId, preferredBarberId: t.preferredBarberId })),
      defaultServiceDuration
    );
  }

  /**
   * Standard wait time including ALL pending appointments. Used when allowAppointments is true.
   * Accounts for multiple appointments in the same hour consuming barber slots - the wait
   * reflects when a new person would actually be served (current queue + all future appointments
   * in weighted order).
   */
  async calculateStandardWaitTimeIncludingAtRiskAppointments(
    shopId: number,
    settings: ShopSettings
  ): Promise<number | null> {
    const now = new Date();
    const defaultDuration = settings.defaultServiceDuration ?? 20;

    const generalLineTickets = await this.getGeneralLineWaitingTickets(shopId);
    const pendingAppointments = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'pending'),
        eq(schema.tickets.type, 'appointment'),
        gt(schema.tickets.scheduledTime, now)
      ),
      orderBy: [asc(schema.tickets.scheduledTime)],
    });

    if (pendingAppointments.length === 0) {
      const nextPosition = generalLineTickets.length + 1;
      return this.calculateWaitTime(shopId, nextPosition, defaultDuration);
    }

    const generalWithType = generalLineTickets.map((t) => ({
      ...t,
      type: (t as { type?: string }).type ?? 'walkin',
      scheduledTime: (t as { scheduledTime?: Date | string | null }).scheduledTime ?? null,
      checkInTime: (t as { checkInTime?: Date | string | null }).checkInTime ?? null,
      createdAt: t.createdAt,
    }));
    const pendingAsWaiting = pendingAppointments.map((a) => ({
      ...a,
      type: 'appointment' as const,
      scheduledTime: a.scheduledTime,
      checkInTime: now,
      createdAt: now,
    }));
    const merged = this.sortWaitingTicketsByWeighted(
      [...generalWithType, ...pendingAsWaiting] as Array<{
        type?: string | null;
        scheduledTime?: Date | string | null;
        checkInTime?: Date | string | null;
        createdAt: Date | string;
        serviceId: number;
        preferredBarberId: number | null;
      }>,
      now
    );
    return this.runWaveWaitTime(
      shopId,
      merged.map((t) => ({ serviceId: t.serviceId, preferredBarberId: t.preferredBarberId })),
      defaultDuration
    );
  }

  /**
   * Weighted order for hybrid mode: (1) appointments due or past by scheduled_time,
   * (2) future appointments by scheduled_time, (3) walk-ins by check_in_time/created_at.
   */
  sortWaitingTicketsByWeighted<T extends { type?: string | null; scheduledTime?: Date | string | null; checkInTime?: Date | string | null; createdAt: Date | string }>(
    tickets: T[],
    now: Date = new Date()
  ): T[] {
    const t = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : 0);
    return [...tickets].sort((a, b) => {
      const typeA = (a.type ?? 'walkin') as string;
      const typeB = (b.type ?? 'walkin') as string;
      const scheduledA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0;
      const scheduledB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0;
      const dueA = typeA === 'appointment' && scheduledA > 0 && scheduledA <= now.getTime();
      const dueB = typeB === 'appointment' && scheduledB > 0 && scheduledB <= now.getTime();
      const priorityA = dueA ? 0 : typeA === 'appointment' ? 1 : 2;
      const priorityB = dueB ? 0 : typeB === 'appointment' ? 1 : 2;
      if (priorityA !== priorityB) return priorityA - priorityB;
      if (priorityA === 0 || priorityA === 1) return scheduledA - scheduledB;
      const timeA = t(a.checkInTime) || t(a.createdAt);
      const timeB = t(b.checkInTime) || t(b.createdAt);
      return timeA - timeB;
    });
  }

  async recalculatePositions(shopId: number, settings?: ShopSettings): Promise<number> {
    let waitingTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      orderBy: [asc(schema.tickets.createdAt)],
    });

    if (settings?.allowAppointments) {
      const now = new Date();
      waitingTickets = this.sortWaitingTicketsByWeighted(waitingTickets as any, now) as typeof waitingTickets;
    }

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

  /**
   * Get the next ticket to serve (first in weighted order when allowAppointments).
   * When next is a walk-in and an appointment is due soon, returns deadZoneWarning.
   */
  async getNextTicket(
    shopId: number,
    settings: ShopSettings
  ): Promise<{
    next: Record<string, unknown> | null;
    deadZoneWarning?: { message: string; appointmentTicketNumber?: string };
  }> {
    let waitingTickets = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting')
      ),
      with: { service: true },
      orderBy: [asc(schema.tickets.createdAt)],
    });

    if (settings.allowAppointments) {
      waitingTickets = this.sortWaitingTicketsByWeighted(waitingTickets as any) as typeof waitingTickets;
    }

    const next = waitingTickets[0] ?? null;
    if (!next) return { next: null };

    let deadZoneWarning: { message: string; appointmentTicketNumber?: string } | undefined;
    if (settings.allowAppointments && (next.type ?? 'walkin') === 'walkin') {
      const now = new Date();
      const nextAppointment = waitingTickets.find(
        (t) => (t.type === 'appointment' && t.scheduledTime && new Date(t.scheduledTime) > now)
      );
      if (nextAppointment?.scheduledTime) {
        const scheduledTime = new Date(nextAppointment.scheduledTime);
        const serviceDuration = next.service?.duration ?? settings.defaultServiceDuration;
        const endOfService = new Date(now.getTime() + serviceDuration * 60 * 1000);
        if (endOfService > scheduledTime) {
          deadZoneWarning = {
            message: `Aguardando agendamento: ${nextAppointment.ticketNumber ?? `A-${nextAppointment.id}`}`,
            appointmentTicketNumber: nextAppointment.ticketNumber ?? `A-${nextAppointment.id}`,
          };
        }
      }
    }

    return {
      next: next as Record<string, unknown>,
      deadZoneWarning,
    };
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
    createdAt: Date = new Date(),
    defaultServiceDuration: number = 20
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
      return durations.get(serviceId) ?? defaultServiceDuration;
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
