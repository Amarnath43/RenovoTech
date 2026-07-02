const IST_OFFSET_MIN = 330; // UTC + 5:30
const IST_OFFSET_MS = IST_OFFSET_MIN * 60 * 1000;

/**
 * Parse a slot label like "2:00 PM" into minutes-from-midnight.
 * "12:00 AM" -> 0, "9:00 AM" -> 540, "2:00 PM" -> 840, "12:00 PM" -> 720
 * Returns -1 if the format is invalid.
 */
export const parseSlotMinutes = (slot: string): number => {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!match) return -1;

  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const period = match[3];

  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return hour * 60 + min;
};

/**
 * Current time in IST as minutes-from-midnight.
 * e.g. 4:00 PM IST -> 960
 */
export const getISTNowMinutes = (): number => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
};

/**
 * Returns midnight UTC of the current IST calendar date.
 * Use this for date-range validation so "today" means today in India,
 * not today in UTC (which lags IST by 5h 30m).
 */
export const getTodayIST = (): Date => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
};

/**
 * Is the given date "today" in IST?
 * Compares the IST calendar day of `date` against the IST calendar day now.
 */
export const isTodayIST = (date: Date): boolean => {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const istTarget = new Date(date.getTime() + IST_OFFSET_MS);

  return (
    istNow.getUTCFullYear() === istTarget.getUTCFullYear() &&
    istNow.getUTCMonth() === istTarget.getUTCMonth() &&
    istNow.getUTCDate() === istTarget.getUTCDate()
  );
};

/**
 * UTC range covering tomorrow's IST calendar date, as [start, end).
 * Matches how date fields like pickupDate are stored: UTC midnight of the date string.
 */
export const getTomorrowISTRange = (): { start: Date; end: Date } => {
  const today = getTodayIST();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 2);

  return { start, end };
};

export const nowISTString = (): string => {
  return new Date().toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
  });
};