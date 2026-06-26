import { Settings, ISettings } from '../models/Settings.js';
import { SlotCounter } from '../models/SlotCounter.js';
import {
  parseSlotMinutes,
  getISTNowMinutes,
  isTodayIST,
} from '../utils/slotTime.js';


// ── Types ─────────────────────────────────────────
export interface ISlot {
  slot:      string;
  available: boolean;
  count:     number;
  max:       number;
}

// ── Constants ─────────────────────────────────────
const DAYS = [
  'sunday', 'monday', 'tuesday',
  'wednesday', 'thursday', 'friday', 'saturday',
];

// ── Settings Cache ────────────────────────────────
let cachedSettings: ISettings | null = null;
let cacheExpiry:    number            = 0;
const CACHE_TTL = 5 * 60 * 1000;

const getSettings = async (): Promise<ISettings> => {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) return cachedSettings;
  const settings = await Settings.findOne();
  if (!settings) throw new Error('Settings not configured');
  cachedSettings = settings;
  cacheExpiry    = now + CACHE_TTL;
  return settings;
};

// ── Helpers ───────────────────────────────────────
const isWorkingDay = (
  date:        Date,
  workingDays: string[],
): boolean => workingDays.includes(DAYS[date.getUTCDay()]);

const formatHour = (hours: number, minutes: number): string => {
  const period  = hours < 12 ? 'AM' : 'PM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  const padded  = String(minutes).padStart(2, '0');
  return `${display}:${padded} ${period}`;
};

const generateSlots = (
  startTime: string,
  endTime:   string,
  duration:  number,
): string[] => {
  const slots: string[] = [];

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour,   endMin]   = endTime.split(':').map(Number);

  const startMins = startHour * 60 + startMin;
  const endMins   = endHour   * 60 + endMin;

  for (let mins = startMins; mins < endMins; mins += duration) {
    slots.push(formatHour(Math.floor(mins / 60), mins % 60));
  }

  return slots;
};

// ── Get Available Dates ───────────────────────────
export const getAvailableDates = async (): Promise<string[]> => {
  const settings = await getSettings();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setUTCDate(today.getUTCDate() + settings.calendarDays);

  // one query for all slot counters in range
  const slotCounters = await SlotCounter.find({
    date: { $gte: today, $lt: maxDate }
  });

  // count full slots per date
  const fullSlotsByDate: Record<string, number> = {};
  slotCounters.forEach(sc => {
    const dateKey = sc.date.toISOString().split('T')[0];
    if (sc.count >= settings.maxPickupsPerSlot) {
      fullSlotsByDate[dateKey] = (fullSlotsByDate[dateKey] ?? 0) + 1;
    }
  });

  // total slots per day
  const totalSlotsPerDay = generateSlots(
    settings.workingHoursStart,
    settings.workingHoursEnd,
    settings.pickupSlotDurationMins,
  ).length;

  const dates: string[] = [];

  for (let i = 0; i <= settings.calendarDays; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + i);

    if (!isWorkingDay(date, settings.workingDays)) continue;

    const dateKey   = date.toISOString().split('T')[0];
    const fullSlots = fullSlotsByDate[dateKey] ?? 0;

    if (fullSlots >= totalSlotsPerDay) continue;

    dates.push(dateKey);
  }

  return dates;
};

// ── Get Available Slots ───────────────────────────


const LEAD_BUFFER_MIN = 60;

type SlotReason = 'full' | 'passed' | null;

interface SlotInfo {
  slot:      string;
  available: boolean;
  reason:    SlotReason;
  count:     number;
}

export const getAvailableSlots = async (date: string): Promise<SlotInfo[]> => {
  const settings = await getSettings();

  // explicit UTC day range for the SlotCounter query
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // one query: counters for this date
  const counters = await SlotCounter.find({
    date: { $gte: startOfDay, $lt: endOfDay },
  });

  const counterMap = new Map<string, number>();
  counters.forEach((c) => counterMap.set(c.slot, c.count));

  // all slots for the working window
  const allSlots = generateSlots(
    settings.workingHoursStart,
    settings.workingHoursEnd,
    settings.pickupSlotDurationMins,
  );

  // same-day check (IST)
  const targetDate = new Date(date);
  const checkToday = isTodayIST(targetDate);
  const nowMinutes = getISTNowMinutes();

  // build reason-based slot list
  const slots: SlotInfo[] = allSlots.map((slot) => {
    const count = counterMap.get(slot) ?? 0;

    // reason 1 — fully booked (checked first)
    if (count >= settings.maxPickupsPerSlot) {
      return { slot, available: false, reason: 'full', count };
    }

    // reason 2 — time already passed (today only, with lead buffer)
    if (checkToday) {
      const slotMin = parseSlotMinutes(slot);
      if (slotMin < nowMinutes + LEAD_BUFFER_MIN) {
        return { slot, available: false, reason: 'passed', count };
      }
    }

    // bookable
    return { slot, available: true, reason: null, count };
  });

  return slots;
};