import type { DbClient } from '../db/types.js';
import { schema } from '../db/index.js';
import { eq, and, or, ne, sql, gt, asc, inArray } from 'drizzle-orm';
import type { CreateTicket, UpdateTicketStatus, Ticket } from '@eutonafila/shared';
import type { QueueService } from './QueueService.js';
import type { AuditService } from './AuditService.js';
import type { ClientService } from './ClientService.js';
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';
import { parseSettings } from '../lib/settings.js';

/**
 * Service for managing ticket operations.
 */
export class TicketService {
  constructor(
    private db: DbClient,
    private queueService: QueueService,
    private auditService: AuditService,
    private clientService: ClientService
  ) {}

  async getById(id: number): Promise<Ticket | null> {
    const ticket = await this.db.query.tickets.findFirst({
      where: eq(schema.tickets.id, id),
      with: { shop: true, service: true, barber: true },
    });
    return ticket as Ticket | null;
  }

  async getByShop(
    shopId: number,
    status?: 'pending' | 'waiting' | 'in_progress' | 'completed' | 'cancelled',
    settings?: { allowAppointments?: boolean }
  ): Promise<Ticket[]> {
    const whereClause = status
      ? and(eq(schema.tickets.shopId, shopId), eq(schema.tickets.status, status))
      : eq(schema.tickets.shopId, shopId);

    try {
      let tickets = await this.db.query.tickets.findMany({
        where: whereClause,
        with: { service: true, barber: true },
        orderBy: (tickets, { asc }) => [asc(tickets.createdAt)],
      });

      if (!status && settings?.allowAppointments) {
        const now = new Date();
        const waiting = tickets.filter((t) => t.status === 'waiting');
        const others = tickets.filter((t) => t.status !== 'waiting');
        const sortedWaiting = this.queueService.sortWaitingTicketsByWeighted(waiting as any, now) as typeof waiting;
        const order = ['in_progress', 'pending', 'completed', 'cancelled'] as const;
        const sortedOthers = order.flatMap((s) => others.filter((t) => t.status === s));
        tickets = [...sortedWaiting, ...sortedOthers];
      }

      return tickets as Ticket[];
    } catch (error) {
      throw error;
    }
  }

  async findActiveTicketByCustomer(shopId: number, customerName: string): Promise<Ticket | null> {
    const ticket = await this.db.query.tickets.findFirst({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.customerName, customerName),
        or(eq(schema.tickets.status, 'waiting'), eq(schema.tickets.status, 'in_progress'))
      ),
      with: { shop: true, service: true, barber: true },
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    });
    return ticket as Ticket | null;
  }

  async findActiveTicketByDevice(shopId: number, deviceId: string): Promise<Ticket | null> {
    if (!deviceId || deviceId.trim().length === 0) return null;
    const ticket = await this.db.query.tickets.findFirst({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.deviceId, deviceId),
        or(eq(schema.tickets.status, 'waiting'), eq(schema.tickets.status, 'in_progress'))
      ),
      with: { shop: true, service: true, barber: true },
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    });
    return ticket as Ticket | null;
  }

  async create(shopId: number, data: CreateTicket): Promise<Ticket> {
    const shop = await this.db.query.shops.findFirst({
      where: eq(schema.shops.id, shopId),
    });
    if (!shop) throw new NotFoundError('Shop not found');

    const settings = parseSettings(shop.settings);

    const service = await this.db.query.services.findFirst({
      where: and(eq(schema.services.id, data.serviceId), eq(schema.services.shopId, shopId)),
    });
    if (!service) throw new NotFoundError('Service not found');
    if (!service.isActive) throw new ConflictError('Service is not active');

    if (settings.deviceDeduplication && data.deviceId && data.deviceId.trim().length > 0) {
      const existingTicketByDevice = await this.findActiveTicketByDevice(shopId, data.deviceId);
      if (existingTicketByDevice) return existingTicketByDevice;
    }

    if (!settings.allowDuplicateNames) {
      const existingTicket = await this.findActiveTicketByCustomer(shopId, data.customerName);
      if (existingTicket) {
        throw new ConflictError('Este nome já está em uso. Por favor, escolha outro nome.');
      }
    }

    const isQueueFull = await this.queueService.isQueueFull(shopId, settings.maxQueueSize);
    if (isQueueFull) throw new ConflictError('Queue is full');

    if (settings.allowAppointments) {
      await this.promoteDueAppointments(shopId);
    }

    if (data.preferredBarberId) {
      const preferredBarber = await this.db.query.barbers.findFirst({
        where: eq(schema.barbers.id, data.preferredBarberId),
      });
      if (!preferredBarber) throw new NotFoundError('Preferred barber not found');
      if (!preferredBarber.isActive) throw new ConflictError('Preferred barber is not active');
      if (preferredBarber.shopId !== shopId) throw new ConflictError('Preferred barber does not belong to this shop');
    }

    const now = new Date();
    let position: number;
    let estimatedWaitTime: number | null;

    if (data.preferredBarberId) {
      position = await this.queueService.calculatePositionForPreferredBarber(shopId, data.preferredBarberId, now);
      estimatedWaitTime = await this.queueService.calculateWaitTimeForPreferredBarber(shopId, data.preferredBarberId, position, now, settings.defaultServiceDuration);
    } else {
      position = await this.queueService.calculatePosition(shopId, now);
      estimatedWaitTime = await this.queueService.calculateWaitTime(shopId, position, settings.defaultServiceDuration);
    }

    const insertValues: Record<string, unknown> = {
      shopId,
      serviceId: data.serviceId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deviceId: data.deviceId || null,
      preferredBarberId: data.preferredBarberId,
      status: 'waiting',
      position,
      estimatedWaitTime,
      type: 'walkin',
    };
    if (settings.allowAppointments) {
      (insertValues as any).checkInTime = now;
    }

    const [ticket] = await this.db
      .insert(schema.tickets)
      .values(insertValues as any)
      .returning();

    if (settings.allowAppointments && ticket) {
      const ticketNumber = `W-${ticket.id}`;
      await this.db
        .update(schema.tickets)
        .set({ ticketNumber, updatedAt: now })
        .where(eq(schema.tickets.id, ticket.id));
      (ticket as any).ticketNumber = ticketNumber;
      (ticket as any).checkInTime = now;
    }

    // Client resolution: use authenticated clientId when provided, otherwise resolve by phone
    const dataWithClient = data as CreateTicket & { clientId?: number };
    let clientId: number | null = dataWithClient.clientId ?? null;
    if (clientId == null && data.customerPhone && data.customerPhone.trim().length > 0) {
      try {
        const client = await this.clientService.findOrCreateByPhone(
          shopId,
          data.customerPhone,
          data.customerName
        );
        clientId = client.id;
      } catch (err) {
        console.warn('[TicketService] Client resolution failed:', err);
      }
    }
    if (clientId != null) {
      await this.db
        .update(schema.tickets)
        .set({ clientId, updatedAt: now })
        .where(eq(schema.tickets.id, ticket.id));
      (ticket as any).clientId = clientId;
    }

    this.auditService.logTicketCreated(ticket.id, shopId, {
      customerName: data.customerName,
      serviceId: data.serviceId,
      preferredBarberId: data.preferredBarberId,
      actorType: 'customer',
    });

    if (data.preferredBarberId) {
      this.auditService.logBarberPreferenceSet(ticket.id, shopId, data.preferredBarberId);
    }

    await this.recalculateWaitTimes(shopId);

    return ticket as Ticket;
  }

  async updateStatus(id: number, data: UpdateTicketStatus): Promise<Ticket> {
    const existingTicket = await this.getById(id);
    if (!existingTicket) throw new Error('Ticket not found');

    if (existingTicket.status !== data.status) {
      this.validateStatusTransition(existingTicket.status, data.status);
    }

    if (data.barberId) {
      const barber = await this.db.query.barbers.findFirst({
        where: eq(schema.barbers.id, data.barberId),
      });
      if (!barber) throw new Error('Barber not found');
      if (!barber.isActive) throw new Error('Barber is not active');
      if (barber.shopId !== existingTicket.shopId) throw new Error('Barber does not belong to this shop');

      if (data.status === 'in_progress') {
        const existingInProgressTicket = await this.db.query.tickets.findFirst({
          where: and(
            eq(schema.tickets.barberId, data.barberId),
            eq(schema.tickets.status, 'in_progress'),
            ne(schema.tickets.id, id)
          ),
        });
        if (existingInProgressTicket) {
          throw new ConflictError('Barbeiro já está atendendo outro cliente');
        }
      }
    }

    const now = new Date();
    const updateData: any = { status: data.status, updatedAt: now };

    if (data.status === 'in_progress' && existingTicket.status !== 'in_progress') updateData.startedAt = now;
    if (data.status === 'waiting' && existingTicket.status === 'in_progress') updateData.startedAt = null;
    if (data.status === 'completed' && existingTicket.status !== 'completed') updateData.completedAt = now;
    if (data.status === 'cancelled' && existingTicket.status !== 'cancelled') updateData.cancelledAt = now;

    if (data.status === 'in_progress' || data.status === 'completed' || data.status === 'cancelled') {
      updateData.position = 0;
      updateData.estimatedWaitTime = null;
    }

    if (data.barberId !== undefined) {
      const isNewAssignment = existingTicket.barberId !== data.barberId && data.barberId !== null;
      const isUnassignment = data.barberId === null && existingTicket.barberId !== null;
      updateData.barberId = data.barberId;
      if (isNewAssignment) updateData.barberAssignedAt = now;
      else if (isUnassignment) updateData.barberAssignedAt = null;
    }

    const [ticket] = await this.db
      .update(schema.tickets)
      .set(updateData)
      .where(eq(schema.tickets.id, id))
      .returning();

    if (data.barberId !== undefined && existingTicket.barberId !== data.barberId && data.barberId !== null) {
      this.auditService.logBarberAssigned(id, existingTicket.shopId, data.barberId, { actorType: 'staff' });
    }
    if (data.status === 'in_progress' && existingTicket.status !== 'in_progress') {
      const barberIdForLog = data.barberId || existingTicket.barberId;
      if (barberIdForLog) this.auditService.logServiceStarted(id, existingTicket.shopId, barberIdForLog, { actorType: 'staff' });
    }
    if (data.status === 'completed' && existingTicket.status !== 'completed') {
      const barberIdForLog = data.barberId || existingTicket.barberId || ticket.barberId;
      if (barberIdForLog) this.auditService.logServiceCompleted(id, existingTicket.shopId, barberIdForLog, { actorType: 'staff' });
    }
    if (data.status === 'cancelled' && existingTicket.status !== 'cancelled') {
      this.auditService.logTicketCancelled(id, existingTicket.shopId, { reason: 'Status updated to cancelled', actorType: 'staff' });
    }

    // Update per-barber weekday stats when a ticket is completed
    if (data.status === 'completed' && existingTicket.status !== 'completed') {
      const completedBarberId = ticket.barberId ?? existingTicket.barberId;
      const completedStartedAt = existingTicket.startedAt ? new Date(existingTicket.startedAt) : null;
      if (completedBarberId && completedStartedAt) {
        const serviceTimeMinutes = (now.getTime() - completedStartedAt.getTime()) / 60000;
        if (serviceTimeMinutes > 0 && serviceTimeMinutes < 120) {
          const dayOfWeek = now.getDay();
          await this.db
            .insert(schema.barberServiceWeekdayStats)
            .values({
              barberId: completedBarberId,
              serviceId: existingTicket.serviceId,
              shopId: existingTicket.shopId,
              dayOfWeek,
              avgDuration: serviceTimeMinutes,
              totalCompleted: 1,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                schema.barberServiceWeekdayStats.barberId,
                schema.barberServiceWeekdayStats.serviceId,
                schema.barberServiceWeekdayStats.dayOfWeek,
              ],
              set: {
                totalCompleted: sql`${schema.barberServiceWeekdayStats.totalCompleted} + 1`,
                avgDuration: sql`(${schema.barberServiceWeekdayStats.avgDuration} * ${schema.barberServiceWeekdayStats.totalCompleted} + ${serviceTimeMinutes}) / (${schema.barberServiceWeekdayStats.totalCompleted} + 1)`,
                updatedAt: now,
              },
            });
        }
      }
    }

    const shopIdForRecalc = existingTicket.shopId;
    this.db.query.shops.findFirst({
      where: eq(schema.shops.id, shopIdForRecalc),
      columns: { settings: true },
    }).then((s) => {
      const settingsForRecalc = parseSettings(s?.settings);
      return this.queueService.recalculatePositions(shopIdForRecalc, settingsForRecalc);
    }).then(() => this.recalculateWaitTimes(shopIdForRecalc))
      .catch((err) => {
        console.error('[TicketService] Deferred recalc failed for shop', shopIdForRecalc, err);
      });

    return ticket as Ticket;
  }

  async cancel(id: number, reason?: string, actorType: 'customer' | 'staff' | 'owner' = 'customer'): Promise<Ticket> {
    const ticket = await this.updateStatus(id, { status: 'cancelled' });
    if (reason) {
      this.auditService.logTicketCancelled(id, ticket.shopId, { reason, actorType });
    }
    return ticket;
  }

  /**
   * Cancel using an already-fetched ticket. Avoids a second getById for the public cancel route.
   */
  async cancelWithExisting(
    existingTicket: { id: number; shopId: number; status: string },
    reason?: string,
    actorType: 'customer' | 'staff' | 'owner' = 'customer'
  ): Promise<Ticket> {
    this.validateStatusTransition(existingTicket.status, 'cancelled');
    const now = new Date();
    const [ticket] = await this.db
      .update(schema.tickets)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
        position: 0,
        estimatedWaitTime: null,
      })
      .where(eq(schema.tickets.id, existingTicket.id))
      .returning();

    if (reason) {
      this.auditService.logTicketCancelled(existingTicket.id, existingTicket.shopId, { reason, actorType });
    }

    this.db.query.shops.findFirst({
      where: eq(schema.shops.id, existingTicket.shopId),
      columns: { settings: true },
    }).then((s) => {
      const settingsForRecalc = parseSettings(s?.settings);
      return this.queueService.recalculatePositions(existingTicket.shopId, settingsForRecalc);
    }).then(() => this.recalculateWaitTimes(existingTicket.shopId))
      .catch((err) => {
        console.error('[TicketService] Deferred recalc failed for shop', existingTicket.shopId, err);
      });

    return ticket as Ticket;
  }

  private async recalculateWaitTimes(shopId: number): Promise<void> {
    const waitingTickets = await this.getByShop(shopId, 'waiting');
    if (waitingTickets.length === 0) return;

    // Load shop settings for defaultServiceDuration
    const shop = await this.db.query.shops.findFirst({
      where: eq(schema.shops.id, shopId),
      columns: { settings: true },
    });
    const settings = parseSettings(shop?.settings);

    const ticketsForRecalc = waitingTickets.map((t) => ({
      id: t.id,
      serviceId: t.serviceId,
      preferredBarberId: t.preferredBarberId ?? null,
      createdAt: new Date(t.createdAt),
    }));

    const context = await this.queueService.loadContextForRecalc(shopId, ticketsForRecalc, settings.defaultServiceDuration);
    const computed = this.queueService.computeWaitTimesForWaitingTickets(shopId, context);

    const now = new Date();
    for (const ticket of waitingTickets) {
      const entry = computed.get(ticket.id);
      if (!entry) continue;
      const { position, estimatedWaitTime: waitTime } = entry;

      if (ticket.position !== position) {
        this.auditService.logPositionUpdated(ticket.id, shopId, ticket.position, position);
      }
      if (ticket.estimatedWaitTime !== waitTime) {
        this.auditService.logWaitTimeUpdated(ticket.id, shopId, ticket.estimatedWaitTime ?? null, waitTime);
      }

      await this.db
        .update(schema.tickets)
        .set({ position, estimatedWaitTime: waitTime, updatedAt: now })
        .where(eq(schema.tickets.id, ticket.id));
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      pending: ['waiting', 'cancelled'],
      waiting: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled', 'waiting'],
      completed: [],
      cancelled: [],
    };
    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  async getStatistics(shopId: number, since?: Date): Promise<{
    total: number; waiting: number; inProgress: number; completed: number; cancelled: number;
  }> {
    const whereClause = since
      ? and(eq(schema.tickets.shopId, shopId))
      : eq(schema.tickets.shopId, shopId);
    const tickets = await this.db.query.tickets.findMany({ where: whereClause });
    return {
      total: tickets.length,
      waiting: tickets.filter(t => t.status === 'waiting').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      completed: tickets.filter(t => t.status === 'completed').length,
      cancelled: tickets.filter(t => t.status === 'cancelled').length,
    };
  }

  async recalculateShopQueue(shopId: number): Promise<void> {
    const shop = await this.db.query.shops.findFirst({
      where: eq(schema.shops.id, shopId),
      columns: { settings: true },
    });
    const settings = parseSettings(shop?.settings);
    await this.queueService.recalculatePositions(shopId, settings);
    await this.recalculateWaitTimes(shopId);
  }

  /**
   * Create an appointment (staff or public book). Requires shop settings.allowAppointments.
   * Inserts with type=appointment, status=pending, scheduledTime; ticket_number set to A-{id}.
   */
  async createAppointment(
    shopId: number,
    data: { serviceId: number; customerName: string; customerPhone?: string; preferredBarberId?: number; scheduledTime: Date | string; clientId?: number }
  ): Promise<Ticket> {
    const shop = await this.db.query.shops.findFirst({
      where: eq(schema.shops.id, shopId),
    });
    if (!shop) throw new NotFoundError('Shop not found');
    const settings = parseSettings(shop.settings);
    if (!settings.allowAppointments) throw new ConflictError('Appointments are not enabled for this shop');

    const service = await this.db.query.services.findFirst({
      where: and(eq(schema.services.id, data.serviceId), eq(schema.services.shopId, shopId)),
    });
    if (!service) throw new NotFoundError('Service not found');
    if (!service.isActive) throw new ConflictError('Service is not active');

    const scheduledTime = typeof data.scheduledTime === 'string' ? new Date(data.scheduledTime) : data.scheduledTime;
    if (isNaN(scheduledTime.getTime())) throw new ValidationError('Invalid scheduledTime');

    const appointmentCap = Math.floor(settings.maxQueueSize * (settings.maxAppointmentsFraction ?? 0.5));
    const existingAppointmentCount = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.type, 'appointment'),
        inArray(schema.tickets.status, ['pending', 'waiting'])
      ),
      columns: { id: true },
    });
    if (existingAppointmentCount.length >= appointmentCap) {
      throw new ConflictError('Appointment capacity reached. Maximum appointments for this queue is ' + appointmentCap + '.');
    }

    const now = new Date();
    const [ticket] = await this.db
      .insert(schema.tickets)
      .values({
        shopId,
        serviceId: data.serviceId,
        customerName: data.customerName,
        customerPhone: data.customerPhone ?? null,
        deviceId: null,
        preferredBarberId: data.preferredBarberId ?? null,
        status: 'pending',
        position: 0,
        estimatedWaitTime: null,
        type: 'appointment',
        scheduledTime,
        checkInTime: null,
        ticketNumber: null,
      })
      .returning();

    const ticketNumber = `A-${ticket.id}`;
    let clientId: number | null = data.clientId ?? null;
    if (clientId == null && data.customerPhone && data.customerPhone.trim().length > 0) {
      try {
        const client = await this.clientService.findOrCreateByPhone(
          shopId,
          data.customerPhone,
          data.customerName
        );
        clientId = client.id;
      } catch (err) {
        console.warn('[TicketService] Client resolution failed for appointment:', err);
      }
    }

    await this.db
      .update(schema.tickets)
      .set({
        ticketNumber,
        ...(clientId != null ? { clientId } : {}),
        updatedAt: now,
      })
      .where(eq(schema.tickets.id, ticket.id));

    this.auditService.logTicketCreated(ticket.id, shopId, {
      customerName: data.customerName,
      serviceId: data.serviceId,
      preferredBarberId: data.preferredBarberId,
      actorType: 'staff',
    });

    return { ...ticket, ticketNumber, clientId } as Ticket;
  }

  /** Buffer (minutes): demote waiting appointment only if they would be served this much earlier than their slot. */
  private static readonly DEMOTE_BUFFER_MINUTES = 15;

  /**
   * Promote pending appointments to waiting when:
   * (1) Time until appointment <= current estimated wait time (general or preferred barber line), or
   * (2) Time until appointment <= 30 minutes.
   * Respects preferred barber: uses that barber's line for position/wait when set.
   * Called periodically (e.g. by queue countdown job).
   * At start: demote waiting appointments that would be served too early (minutesUntil - estimatedWait >= buffer).
   */
  async promoteDueAppointments(shopId: number): Promise<number> {
    const shop = await this.db.query.shops.findFirst({
      where: eq(schema.shops.id, shopId),
      columns: { settings: true },
    });
    const settings = parseSettings(shop?.settings);
    if (!settings.allowAppointments) return 0;

    const now = new Date();

    const waitingAppointmentsWithFuture = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'waiting'),
        eq(schema.tickets.type, 'appointment'),
        gt(schema.tickets.scheduledTime, now)
      ),
    });
    const toDemote: number[] = [];
    for (const t of waitingAppointmentsWithFuture) {
      const scheduled = t.scheduledTime ? new Date(t.scheduledTime) : null;
      if (!scheduled) continue;
      const minutesUntil = (scheduled.getTime() - now.getTime()) / 60_000;
      const estimatedWait = t.estimatedWaitTime ?? 0;
      if (minutesUntil - estimatedWait >= TicketService.DEMOTE_BUFFER_MINUTES) {
        toDemote.push(t.id);
      }
    }
    if (toDemote.length > 0) {
      for (const id of toDemote) {
        await this.db
          .update(schema.tickets)
          .set({
            status: 'pending',
            checkInTime: null,
            position: 0,
            estimatedWaitTime: null,
            updatedAt: now,
          })
          .where(eq(schema.tickets.id, id));
      }
      await this.queueService.recalculatePositions(shopId, settings);
      await this.recalculateWaitTimes(shopId);
    }

    const pendingAppointments = await this.db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.shopId, shopId),
        eq(schema.tickets.status, 'pending'),
        eq(schema.tickets.type, 'appointment'),
        gt(schema.tickets.scheduledTime, now)
      ),
      orderBy: [asc(schema.tickets.scheduledTime)],
    });

    const toPromote: number[] = [];
    const defaultDuration = settings.defaultServiceDuration ?? 20;

    for (const ticket of pendingAppointments) {
      const scheduled = ticket.scheduledTime ? new Date(ticket.scheduledTime) : null;
      if (!scheduled || scheduled.getTime() <= now.getTime()) continue;

      const minutesUntil = (scheduled.getTime() - now.getTime()) / 60_000;

      let estimatedWaitMinutes: number;
      if (ticket.preferredBarberId != null) {
        const position = await this.queueService.calculatePositionForPreferredBarber(shopId, ticket.preferredBarberId, now);
        const wait = await this.queueService.calculateWaitTimeForPreferredBarber(
          shopId,
          ticket.preferredBarberId,
          position,
          now,
          defaultDuration
        );
        estimatedWaitMinutes = wait ?? 0;
      } else {
        // Use standard wait including ALL pending appointments. This accounts for multiple appointments
        // in the same hour consuming barber slots - the wait reflects when a new person would actually
        // be served (current queue + all future appointments in weighted order).
        const wait = await this.queueService.calculateStandardWaitTimeIncludingAtRiskAppointments(shopId, settings);
        estimatedWaitMinutes = wait ?? 0;
      }

      if (minutesUntil <= estimatedWaitMinutes || minutesUntil <= 30) {
        toPromote.push(ticket.id);
      }
    }

    if (toPromote.length === 0) return 0;

    for (const ticketId of toPromote) {
      await this.db
        .update(schema.tickets)
        .set({ status: 'waiting', checkInTime: now, updatedAt: now })
        .where(eq(schema.tickets.id, ticketId));
    }

    await this.queueService.recalculatePositions(shopId, settings);
    await this.recalculateWaitTimes(shopId);
    return toPromote.length;
  }

  /**
   * Check in an appointment (pending -> waiting, set check_in_time). Staff/owner only.
   */
  async checkIn(ticketId: number): Promise<Ticket> {
    const existingTicket = await this.getById(ticketId);
    if (!existingTicket) throw new NotFoundError('Ticket not found');
    if ((existingTicket as any).type !== 'appointment') throw new ConflictError('Only appointments can be checked in');
    if (existingTicket.status === 'waiting') return existingTicket as Ticket;
    if (existingTicket.status !== 'pending') throw new ConflictError('Ticket is not pending');

    const now = new Date();
    const [ticket] = await this.db
      .update(schema.tickets)
      .set({ status: 'waiting', checkInTime: now, updatedAt: now })
      .where(eq(schema.tickets.id, ticketId))
      .returning();

    const shop = await this.db.query.shops.findFirst({
      where: eq(schema.shops.id, existingTicket.shopId),
      columns: { settings: true },
    });
    const settings = parseSettings(shop?.settings);
    await this.queueService.recalculatePositions(existingTicket.shopId, settings);
    await this.recalculateWaitTimes(existingTicket.shopId);

    return ticket as Ticket;
  }

  /**
   * Reschedule a pending appointment. Staff/owner/barber only.
   */
  async rescheduleAppointment(ticketId: number, scheduledTime: Date | string): Promise<Ticket> {
    const existingTicket = await this.getById(ticketId);
    if (!existingTicket) throw new NotFoundError('Ticket not found');
    if ((existingTicket as any).type !== 'appointment') throw new ConflictError('Only appointments can be rescheduled');
    if (existingTicket.status !== 'pending') throw new ConflictError('Only pending appointments can be rescheduled');

    const scheduled = typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;
    if (isNaN(scheduled.getTime())) throw new ValidationError('Invalid scheduledTime');

    const now = new Date();
    const [ticket] = await this.db
      .update(schema.tickets)
      .set({ scheduledTime: scheduled, updatedAt: now })
      .where(eq(schema.tickets.id, ticketId))
      .returning();

    return ticket as Ticket;
  }
}
