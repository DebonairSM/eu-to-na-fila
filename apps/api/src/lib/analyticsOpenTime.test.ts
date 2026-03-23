import { describe, it, expect } from 'vitest';
import {
  countOpenDaysInUtcRange,
  countCalendarDaysInUtcRange,
  isWithinShopOpenHours,
  filterTicketsByShopOpenHours,
} from './analyticsOpenTime.js';
import type { OperatingHours } from '@eutonafila/shared';

const BR: OperatingHours = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
};

describe('analyticsOpenTime', () => {
  it('countCalendarDaysInUtcRange counts inclusive shop-local days', () => {
    const since = new Date('2025-06-01T10:00:00.000Z');
    const until = new Date('2025-06-04T10:00:00.000Z');
    expect(countCalendarDaysInUtcRange('America/Sao_Paulo', since, until)).toBeGreaterThanOrEqual(1);
  });

  it('countOpenDaysInUtcRange without operating hours matches calendar days in range', () => {
    const since = new Date('2025-06-02T00:00:00.000Z');
    const until = new Date('2025-06-09T00:00:00.000Z');
    const n = countOpenDaysInUtcRange(undefined, 'America/Sao_Paulo', since, until);
    expect(n).toBe(countCalendarDaysInUtcRange('America/Sao_Paulo', since, until));
  });

  it('countOpenDaysInUtcRange excludes Sat/Sun when closed', () => {
    const since = new Date('2025-06-02T00:00:00.000Z');
    const until = new Date('2025-06-09T00:00:00.000Z');
    const cal = countCalendarDaysInUtcRange('America/Sao_Paulo', since, until);
    const open = countOpenDaysInUtcRange(BR, 'America/Sao_Paulo', since, until);
    expect(open).toBeLessThanOrEqual(cal);
    expect(open).toBeGreaterThanOrEqual(1);
  });

  it('isWithinShopOpenHours excludes lunch', () => {
    const oh: OperatingHours = {
      monday: { open: '09:00', close: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    };
    const local = new Date(2025, 5, 9, 12, 30, 0);
    expect(isWithinShopOpenHours(oh, local)).toBe(false);
    const localOpen = new Date(2025, 5, 9, 10, 0, 0);
    expect(isWithinShopOpenHours(oh, localOpen)).toBe(true);
  });

  it('isWithinShopOpenHours is true when no operating hours', () => {
    expect(isWithinShopOpenHours(undefined, new Date())).toBe(true);
  });

  it('filterTicketsByShopOpenHours keeps only tickets created during open hours (shop TZ)', () => {
    // Monday 2025-06-09 10:00 local SP ≈ 13:00 UTC; Wednesday 03:00 local ≈ closed night → excluded
    const mondayOpen = { createdAt: new Date('2025-06-09T13:00:00.000Z') };
    const mondayClosed = { createdAt: new Date('2025-06-09T06:00:00.000Z') };
    const out = filterTicketsByShopOpenHours([mondayOpen, mondayClosed], BR, 'America/Sao_Paulo');
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(mondayOpen);
  });
});
