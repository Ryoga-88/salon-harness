/** Asia/Tokyo の暦日 YYYY-MM-DD */
export function jstYmd(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function jstTodayYmd(): string {
  return jstYmd(new Date());
}

export function reservationDateKey(startAt: string): string {
  return startAt.slice(0, 10);
}

/** 月プレフィックス YYYY-MM（東京暦・start_at が JST で格納されている前提で先頭10文字でも可） */
export function jstMonthPrefix(isoOrDate?: string): string {
  return jstYmd(isoOrDate ?? new Date()).slice(0, 7);
}

const WD_MON0: Record<string, number> = { Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };

/** 東京暦 weekday: Mon=0 … Sun=6 */
export function jstWeekdayMon0(ymd: string): number {
  const d = new Date(`${ymd}T12:00:00+09:00`);
  const w = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short' }).format(d);
  return WD_MON0[w] ?? 0;
}

export function jstAddDays(ymd: string, delta: number): string {
  const t = Date.parse(`${ymd}T12:00:00+09:00`);
  return jstYmd(new Date(t + delta * 86400000));
}

/** ymd が属する週の月曜〜日曜（東京暦・端はその暦日で包含） */
export function jstMondaySundayRangeContaining(ymd: string): { mon: string; sun: string } {
  const w = jstWeekdayMon0(ymd);
  const mon = jstAddDays(ymd, -w);
  const sun = jstAddDays(mon, 6);
  return { mon, sun };
}

export function daysSinceJst(ymdOrIso: string): number | null {
  if (!ymdOrIso) return null;
  const ymd = ymdOrIso.length >= 10 ? ymdOrIso.slice(0, 10) : ymdOrIso;
  const t0 = Date.parse(`${ymd}T12:00:00+09:00`);
  const t1 = Date.parse(`${jstTodayYmd()}T12:00:00+09:00`);
  return Math.floor((t1 - t0) / 86400000);
}
