import type { OperatingHours } from '../schemas/shopConfig';

export interface ShopStatusResult {
  isOpen: boolean;
  isInLunch: boolean;
  nextOpenTime: Date | null;
  currentPeriod: 'before_open' | 'open' | 'lunch' | 'after_close' | 'closed_day' | null;
  isOverridden?: boolean;
  overrideReason?: string;
}

/**
 * Check if shop is currently open based on operating hours and timezone.
 * Handles lunch breaks and temporary manual overrides.
 */
export function getShopStatus(
  operatingHours: OperatingHours | undefined,
  timezone: string,
  temporaryOverride?: { isOpen: boolean; until: string; reason?: string } | null,
  allowQueueBeforeOpen: boolean = false,
  now: Date = new Date()
): ShopStatusResult {
  // Check temporary override first
  if (temporaryOverride) {
    const overrideUntil = new Date(temporaryOverride.until);
    if (now < overrideUntil) {
      return {
        isOpen: temporaryOverride.isOpen,
        isInLunch: false,
        nextOpenTime: temporaryOverride.isOpen ? null : findNextOpenTime(operatingHours, timezone, now),
        currentPeriod: temporaryOverride.isOpen ? 'open' : 'closed_day',
        isOverridden: true,
        overrideReason: temporaryOverride.reason,
      };
    }
  }

  if (!operatingHours) {
    return { isOpen: true, isInLunch: false, nextOpenTime: null, currentPeriod: null };
  }

  // Get current time in shop's timezone
  const shopNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const currentDay = dayNames[shopNow.getDay()];
  const currentTime = shopNow.getHours() * 60 + shopNow.getMinutes(); // minutes since midnight

  const todayHours = operatingHours[currentDay];

  // Shop is closed today
  if (!todayHours) {
    const nextOpen = findNextOpenTime(operatingHours, timezone, shopNow);
    return { 
      isOpen: false, 
      isInLunch: false, 
      nextOpenTime: nextOpen, 
      currentPeriod: 'closed_day' 
    };
  }

  const openTime = parseTime(todayHours.open);
  const closeTime = parseTime(todayHours.close);

  // Before opening
  if (currentTime < openTime) {
    const nextOpen = createDateFromTime(shopNow, todayHours.open, timezone);
    const result: ShopStatusResult = { 
      isOpen: false, 
      isInLunch: false, 
      nextOpenTime: nextOpen, 
      currentPeriod: 'before_open' 
    };
    
    // If allowQueueBeforeOpen is true, treat as open
    if (allowQueueBeforeOpen) {
      result.isOpen = true;
    }
    
    return result;
  }

  // After closing
  if (currentTime >= closeTime) {
    const nextOpen = findNextOpenTime(operatingHours, timezone, shopNow);
    return { 
      isOpen: false, 
      isInLunch: false, 
      nextOpenTime: nextOpen, 
      currentPeriod: 'after_close' 
    };
  }

  // Check lunch break
  if (todayHours.lunchStart && todayHours.lunchEnd) {
    const lunchStart = parseTime(todayHours.lunchStart);
    const lunchEnd = parseTime(todayHours.lunchEnd);

    if (currentTime >= lunchStart && currentTime < lunchEnd) {
      const nextOpen = createDateFromTime(shopNow, todayHours.lunchEnd, timezone);
      return { 
        isOpen: false, 
        isInLunch: true, 
        nextOpenTime: nextOpen, 
        currentPeriod: 'lunch' 
      };
    }
  }

  // Shop is open
  return { 
    isOpen: true, 
    isInLunch: false, 
    nextOpenTime: null, 
    currentPeriod: 'open' 
  };
}

/**
 * Parse "HH:MM" to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Create a Date object for a specific time today in the shop's timezone
 */
function createDateFromTime(baseDate: Date, timeStr: string, _timezone: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Find the next opening time (could be later today, tomorrow, or next week)
 */
function findNextOpenTime(
  operatingHours: OperatingHours | undefined,
  timezone: string,
  from: Date
): Date | null {
  if (!operatingHours) return null;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(from);
    checkDate.setDate(checkDate.getDate() + i);
    const dayName = dayNames[checkDate.getDay()];
    const dayHours = operatingHours[dayName];
    
    if (dayHours) {
      return createDateFromTime(checkDate, dayHours.open, timezone);
    }
  }
  
  return null; // No opening time in next 7 days
}
