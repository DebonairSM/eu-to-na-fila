import { db, schema as s } from '../db/index.js';
import { eq, and, or, gte, lt, inArray } from 'drizzle-orm';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { parseSettings } from './settings.js';
import { NotFoundError, ValidationError } from './errors.js';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export async function getAppointmentSlots(
  shop: { id: number; settings: unknown },
  dateStr: string,
  serviceId: number,
  barberId?: number,
  estimatedQueueClearMinutes?: number
): Promise<{ slots: Array<{ time: string; available: boolean }> }> {
  const settings = parseSettings(shop.settings);
  if (!settings.allowAppointments) throw new NotFoundError('Appointments not enabled');

  const appointmentCap = Math.floor(settings.maxQueueSize * (settings.maxAppointmentsFraction ?? 0.5));
  const existingCount = await db
    .select({ id: s.tickets.id })
    .from(s.tickets)
    .where(
      and(
        eq(s.tickets.shopId, shop.id),
        eq(s.tickets.type, 'appointment'),
        inArray(s.tickets.status, ['pending', 'waiting'])
      )
    );
  if (existingCount.length >= appointmentCap) {
    return { slots: [] };
  }

  const timezone = settings.timezone ?? DEFAULT_TIMEZONE;

  const service = await db.query.services.findFirst({
    where: and(eq(s.services.id, serviceId), eq(s.services.shopId, shop.id)),
  });
  if (!service) throw new NotFoundError('Service not found');
  if (!service.isActive) throw new ValidationError('Service is not active');

  const [y, mo, d] = dateStr.split('-').map(Number);
  if (!y || !mo || !d) throw new ValidationError('Invalid date');
  const localDate = new Date(y, mo - 1, d, 12, 0, 0);
  if (isNaN(localDate.getTime())) throw new ValidationError('Invalid date');

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayKey = dayKeys[localDate.getDay()];
  const hours = settings.operatingHours?.[dayKey];
  if (!hours || typeof hours !== 'object') return { slots: [] };

  const slotDurationMin = service.duration + 5;
  const parseTime = (str: string) => {
    const [h, m] = str.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const openMin = parseTime(hours.open ?? '09:00');
  const closeMin = parseTime(hours.close ?? '18:00');
  
  // Check for lunch break
  const lunchStartMin = hours.lunchStart ? parseTime(hours.lunchStart) : null;
  const lunchEndMin = hours.lunchEnd ? parseTime(hours.lunchEnd) : null;
  const hasLunch = lunchStartMin !== null && lunchEndMin !== null;
  
  const slotStarts: number[] = [];
  for (let t = openMin; t + service.duration <= closeMin; t += slotDurationMin) {
    // Skip slots that overlap with lunch break
    if (hasLunch && lunchStartMin !== null && lunchEndMin !== null) {
      const slotEnd = t + slotDurationMin;
      // Skip if slot overlaps with lunch (slot starts before lunch ends AND slot ends after lunch starts)
      if (t < lunchEndMin && slotEnd > lunchStartMin) {
        continue;
      }
    }
    slotStarts.push(t);
  }

  const dayStartLocal = new Date(y, mo - 1, d, 0, 0, 0);
  const dayEndLocal = new Date(y, mo - 1, d + 1, 0, 0, 0);
  const dayStart = fromZonedTime(dayStartLocal, timezone);
  const dayEnd = fromZonedTime(dayEndLocal, timezone);

  const barbersList = await db.query.barbers.findMany({
    where: and(eq(s.barbers.shopId, shop.id), eq(s.barbers.isActive, true)),
    columns: { id: true },
  });
  const barberIds = barbersList.map((b) => b.id);
  if (barberIds.length === 0) {
    return { slots: [] };
  }

  const filterBarber = barberId != null ? (barberIds.includes(barberId) ? [barberId] : []) : barberIds;

  const ticketsOnDay = await db
    .select({
      id: s.tickets.id,
      barberId: s.tickets.barberId,
      preferredBarberId: s.tickets.preferredBarberId,
      scheduledTime: s.tickets.scheduledTime,
      startedAt: s.tickets.startedAt,
      serviceId: s.tickets.serviceId,
      type: s.tickets.type,
      status: s.tickets.status,
    })
    .from(s.tickets)
    .where(
      and(
        eq(s.tickets.shopId, shop.id),
        or(
          and(
            eq(s.tickets.type, 'appointment'),
            inArray(s.tickets.status, ['pending', 'waiting', 'in_progress']),
            gte(s.tickets.scheduledTime, dayStart),
            lt(s.tickets.scheduledTime, dayEnd)
          ),
          and(
            eq(s.tickets.status, 'in_progress'),
            gte(s.tickets.startedAt, dayStart),
            lt(s.tickets.startedAt, dayEnd)
          )
        )
      )
    );

  const servicesById = await db.query.services.findMany({
    where: eq(s.services.shopId, shop.id),
    columns: { id: true, duration: true },
  });
  const durationByServiceId = Object.fromEntries(servicesById.map((svc) => [svc.id, svc.duration]));

  type Block = { barberId: number; startMin: number; endMin: number };
  type Window = { startMin: number; endMin: number };
  const blocks: Block[] = [];
  const generalLineWindows: Window[] = [];
  for (const t of ticketsOnDay) {
    const start = t.scheduledTime ?? t.startedAt;
    if (!start) continue;
    const startUtc = new Date(start);
    const startZoned = toZonedTime(startUtc, timezone);
    const startMin = startZoned.getHours() * 60 + startZoned.getMinutes();
    const dur = durationByServiceId[t.serviceId] ?? settings.defaultServiceDuration;
    const endMin = startMin + dur;
    const bid = t.barberId ?? t.preferredBarberId;
    if (bid != null) {
      blocks.push({ barberId: bid, startMin, endMin });
    } else if (
      t.type === 'appointment' &&
      (t.status === 'pending' || t.status === 'waiting') &&
      t.scheduledTime
    ) {
      generalLineWindows.push({ startMin, endMin });
    }
  }

  const slots = slotStarts.map((slotStart) => {
    const slotEnd = slotStart + slotDurationMin;
    const overlapsBlock = (b: Block) => slotStart < b.endMin && slotEnd > b.startMin;
    const overlapsWindow = (w: Window) => slotStart < w.endMin && slotEnd > w.startMin;
    const freeBarberCount = filterBarber.filter(
      (bid) => !blocks.some((b) => b.barberId === bid && overlapsBlock(b))
    ).length;
    const generalLineAtSlot = generalLineWindows.filter(overlapsWindow).length;
    const available = freeBarberCount > generalLineAtSlot;
    const h = Math.floor(slotStart / 60);
    const m = slotStart % 60;
    return {
      time: `${h}`.padStart(2, '0') + ':' + `${m}`.padStart(2, '0'),
      available,
      slotStart,
    };
  });

  const nowInTz = toZonedTime(new Date(), timezone);
  const isToday =
    y === nowInTz.getFullYear() &&
    mo === nowInTz.getMonth() + 1 &&
    d === nowInTz.getDate();
  const nowMin = isToday ? nowInTz.getHours() * 60 + nowInTz.getMinutes() : -1;
  const notPast = (s: { available: boolean; time: string; slotStart: number }) =>
    !isToday || s.slotStart > nowMin;
  const notOccupiedByQueue = (s: { available: boolean; time: string; slotStart: number }) =>
    !isToday ||
    estimatedQueueClearMinutes == null ||
    s.slotStart > nowMin + estimatedQueueClearMinutes;

  return {
    slots: slots
      .filter((s) => s.available && notPast(s) && notOccupiedByQueue(s))
      .map(({ time, available }) => ({ time, available })),
  };
}

/** Convert UTC ISO string to shop-local dateStr and timeStr for slot validation. */
export function utcToShopLocal(utcIso: string, timezone: string): { dateStr: string; timeStr: string } {
  const tz = timezone || DEFAULT_TIMEZONE;
  const utc = new Date(utcIso);
  if (isNaN(utc.getTime())) throw new ValidationError('Invalid scheduledTime');
  const zoned = toZonedTime(utc, tz);
  const y = zoned.getFullYear();
  const mo = zoned.getMonth() + 1;
  const d = zoned.getDate();
  const h = zoned.getHours();
  const m = zoned.getMinutes();
  const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { dateStr, timeStr };
}
