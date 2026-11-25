import type { Language } from '../i18n';

const pad = (n: number) => String(n).padStart(2, '0');

/** "dd/MM" in local time, e.g. 05/03 (S06 "Tranh vẽ dd/MM"). */
export function formatDayMonth(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** "dd/MM/yyyy" in local time (S08 "Hoàn thành 12/11/2026"). */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Local calendar day "YYYY-MM-DD" (active days for the streak, Q20). */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The local day before `day` ("YYYY-MM-DD"). Works across months, years and DST. */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
}

/**
 * "Chuỗi liên tiếp" (S07, Q20): consecutive days with colouring / drawing that end today.
 * Today without activity yet does not break the streak: it then ends yesterday
 * (the child has the whole day to keep it going).
 */
export function streakDays(activeDays: readonly string[], now: number): number {
  const set = new Set(activeDays);
  let day = dayKey(now);
  if (!set.has(day)) day = previousDay(day);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = previousDay(day);
  }
  return n;
}

/**
 * Time spent, short (S07 stat, S08 line).
 * vi: "45 phút", "9 giờ 40", "2 giờ" · en: "45 min", "9 h 40", "2 h". Under a minute counts as 1 minute
 * once anything was done, so a finished picture never shows "0 phút".
 */
export function formatDuration(ms: number, lang: Language): string {
  const totalMin = ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const [hour, min] = lang === 'vi' ? ['giờ', 'phút'] : ['h', 'min'];
  if (h === 0) return `${m} ${min}`;
  if (m === 0) return `${h} ${hour}`;
  return `${h} ${hour} ${pad(m)}`;
}

/** Long form for the detail line (S08 "1 giờ 12 phút"). */
export function formatDurationLong(ms: number, lang: Language): string {
  const totalMin = ms <= 0 ? 0 : Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const [hour, min] = lang === 'vi' ? ['giờ', 'phút'] : ['h', 'min'];
  if (h === 0) return `${m} ${min}`;
  if (m === 0) return `${h} ${hour}`;
  return `${h} ${hour} ${m} ${min}`;
}
