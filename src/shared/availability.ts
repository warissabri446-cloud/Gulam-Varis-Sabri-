export const INTERVIEW_TIME_SLOTS = [
  '10:00 AM IST',
  '12:00 PM IST',
  '02:30 PM IST',
  '04:30 PM IST',
  '06:30 PM IST',
] as const;

export interface AvailabilityDay {
  isoDate: string;
  weekdayShort: string;
  dateShort: string;
  isToday: boolean;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getNextSevenDays(anchorDate = new Date()): AvailabilityDay[] {
  const days: AvailabilityDay[] = [];
  const startUtc = Date.UTC(
    anchorDate.getUTCFullYear(),
    anchorDate.getUTCMonth(),
    anchorDate.getUTCDate()
  );

  for (let i = 0; i < 7; i += 1) {
    const dt = new Date(startUtc + i * 24 * 60 * 60 * 1000);
    const isoDate = dt.toISOString().slice(0, 10);
    const weekdayShort = WEEKDAY_NAMES[dt.getUTCDay()];
    const dateShort = `${dt.getUTCDate()} ${MONTH_NAMES[dt.getUTCMonth()]}`;
    days.push({
      isoDate,
      weekdayShort,
      dateShort,
      isToday: i === 0,
    });
  }

  return days;
}

export function makeSlotKey(isoDate: string, timeSlot: string): string {
  return `${isoDate}|${timeSlot}`;
}

export function isValidSlotKey(slotKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}\|[A-Za-z0-9: ]{3,24}$/.test(slotKey);
}

export function summarizeAvailability(busySlots: string[] = []): {
  totalSlots: number;
  freeCount: number;
  busyCount: number;
  nextOpenSummary: string;
} {
  const days = getNextSevenDays();
  const busySet = new Set(busySlots);
  const totalSlots = days.length * INTERVIEW_TIME_SLOTS.length;
  let busyCount = 0;
  let firstOpenDay: AvailabilityDay | null = null;
  let firstOpenSlots: string[] = [];

  for (const day of days) {
    const dayFree: string[] = [];
    for (const slot of INTERVIEW_TIME_SLOTS) {
      if (busySet.has(makeSlotKey(day.isoDate, slot))) {
        busyCount += 1;
      } else {
        dayFree.push(slot);
      }
    }
    if (!firstOpenDay && dayFree.length > 0) {
      firstOpenDay = day;
      firstOpenSlots = dayFree;
    }
  }

  const freeCount = totalSlots - busyCount;
  const nextOpenSummary = firstOpenDay
    ? `Next free: ${firstOpenDay.weekdayShort} ${firstOpenDay.dateShort} (${firstOpenSlots
        .slice(0, 2)
        .map((s) => s.replace(' IST', ''))
        .join(', ')} IST)`
    : 'All upcoming 7-day slots marked busy';

  return {
    totalSlots,
    freeCount,
    busyCount,
    nextOpenSummary,
  };
}
