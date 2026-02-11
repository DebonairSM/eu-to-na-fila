export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export function hasHoursForDay(
  operatingHours: Record<string, { open?: string; close?: string } | null | undefined> | undefined,
  date: Date
): boolean {
  if (!operatingHours) return false;
  const dayKey = DAY_KEYS[date.getDay()];
  const hours = operatingHours[dayKey];
  return hours != null && typeof hours === 'object' && hours.open != null && hours.close != null;
}

export function hasAnyOperatingHours(
  operatingHours: Record<string, { open?: string; close?: string } | null | undefined> | undefined
): boolean {
  if (!operatingHours) return false;
  return DAY_KEYS.some(
    (key) => {
      const h = operatingHours[key];
      return h != null && typeof h === 'object' && h.open != null && h.close != null;
    }
  );
}
