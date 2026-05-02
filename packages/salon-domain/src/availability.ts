import type { AvailabilitySlot, Reservation } from '@salon-harness/shared';

export interface BusinessWindow {
  open_time: string;
  close_time: string;
  is_closed: number;
}

export interface ScheduleOverride {
  is_closed: number;
  open_time: string | null;
  close_time: string | null;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function toDateTime(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00+09:00`);
}

export function toJstIso(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
  return parts.replace(' ', 'T') + '+09:00';
}

export function dateKeyJst(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function buildAvailabilitySlots(args: {
  date: string;
  durationMin: number;
  businessHours: BusinessWindow | null;
  override: ScheduleOverride | null;
  reservations: Pick<Reservation, 'start_at' | 'end_at' | 'status'>[];
  now?: Date;
  stepMin?: number;
}): AvailabilitySlot[] {
  const stepMin = args.stepMin ?? 15;
  const now = args.now ?? new Date();
  const minimumStart = args.date === dateKeyJst(now) ? addMinutes(now, 120) : null;

  if (args.override?.is_closed) return [];
  const openTime = args.override?.open_time ?? args.businessHours?.open_time;
  const closeTime = args.override?.close_time ?? args.businessHours?.close_time;
  if (!openTime || !closeTime || args.businessHours?.is_closed) return [];

  const open = toDateTime(args.date, openTime);
  const close = toDateTime(args.date, closeTime);
  const busy = args.reservations
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .map((r) => ({ start: new Date(r.start_at), end: new Date(r.end_at) }));

  const slots: AvailabilitySlot[] = [];
  for (let cursor = open; addMinutes(cursor, args.durationMin) <= close; cursor = addMinutes(cursor, stepMin)) {
    const end = addMinutes(cursor, args.durationMin);
    if (minimumStart && cursor < minimumStart) continue;
    const conflicts = busy.some((b) => cursor < b.end && end > b.start);
    if (!conflicts) slots.push({ start_at: toJstIso(cursor), end_at: toJstIso(end) });
  }
  return slots;
}
