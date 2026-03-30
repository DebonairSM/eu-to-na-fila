import { describe, it, expect } from 'vitest';
import {
  dedupePreserveOrder,
  allServiceIdsForTicket,
  resolveTicketServiceColumns,
  totalBundleMinutes,
} from './ticketServices.js';

describe('ticketServices', () => {
  it('dedupePreserveOrder keeps first occurrence', () => {
    expect(dedupePreserveOrder([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
  });

  it('allServiceIdsForTicket uses complementary list when non-empty', () => {
    expect(
      allServiceIdsForTicket({
        serviceId: 1,
        mainServiceId: 2,
        complementaryServiceIds: [3, 4],
      })
    ).toEqual([3, 4]);
  });

  it('allServiceIdsForTicket falls back to serviceId', () => {
    expect(
      allServiceIdsForTicket({
        serviceId: 7,
        complementaryServiceIds: [],
      })
    ).toEqual([7]);
  });

  it('resolveTicketServiceColumns picks first main in order', () => {
    const kinds = new Map<number, string>([
      [10, 'complementary'],
      [20, 'main'],
      [30, 'complementary'],
    ]);
    expect(resolveTicketServiceColumns([10, 20, 30], kinds)).toEqual({
      serviceId: 20,
      mainServiceId: 20,
      complementaryServiceIds: [10, 20, 30],
    });
  });

  it('resolveTicketServiceColumns uses first id when no main', () => {
    const kinds = new Map<number, string>([
      [1, 'complementary'],
      [2, 'complementary'],
    ]);
    expect(resolveTicketServiceColumns([1, 2], kinds)).toEqual({
      serviceId: 1,
      mainServiceId: null,
      complementaryServiceIds: [1, 2],
    });
  });

  it('totalBundleMinutes sums getDuration across bundle', () => {
    const t = { serviceId: 1, complementaryServiceIds: [1, 2] };
    const mins = totalBundleMinutes(t, (sid) => (sid === 1 ? 10 : 25));
    expect(mins).toBe(35);
  });
});
