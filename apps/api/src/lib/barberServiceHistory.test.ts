import { describe, it, expect } from 'vitest';
import { allServiceIdsForTicket } from './barberServiceHistory.js';

describe('allServiceIdsForTicket', () => {
  it('uses complementaryServiceIds as full selection when non-empty', () => {
    expect(
      allServiceIdsForTicket({ serviceId: 1, complementaryServiceIds: [2, 3, 4] })
    ).toEqual([2, 3, 4]);
  });

  it('falls back to serviceId when no complementary services', () => {
    expect(allServiceIdsForTicket({ serviceId: 7, complementaryServiceIds: [] })).toEqual([7]);
  });
});
