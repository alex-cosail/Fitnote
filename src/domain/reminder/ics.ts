/**
 * Calendar reminders (docs/PRODUCT_MAP_V3.md, section 8): the app creates a
 * calendar event and the phone's calendar reminds — offline, no server.
 */

export interface ReminderPrefs {
  daysAhead: 0 | 1 | 2 | 3; // 0 = do not remind
  time: string; // "HH:MM", local
}

export const REMINDER_ALARM_MINUTES = 60;

/** Local date-time `daysAhead` days after `now` at "HH:MM". */
export function nextReminderDate(daysAhead: number, time: string, now: Date): Date {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, h || 0, m || 0, 0, 0);
  return d;
}

/** Current local time rounded to the nearest 15 minutes, "HH:MM". */
export function roundedTimeOfDay(now: Date): string {
  const total = Math.round((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC timestamp in iCalendar form: 20261126T160000Z. */
export function icsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escapes TEXT values (RFC 5545 §3.3.11). */
export function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds a content line to at most 75 octets (UTF-8), continuation lines start
 * with a space (RFC 5545 §3.1). Cyrillic letters are 2 bytes, so folding by
 * characters would break the limit.
 */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines carry a leading space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export interface CalendarEventInput {
  uid: string;
  title: string;
  description?: string;
  url?: string;
  start: Date;
  durationMinutes: number;
  alarmMinutesBefore?: number;
  now: Date;
}

/** A single-event iCalendar file with a display alarm. */
export function buildIcsEvent(e: CalendarEventInput): string {
  const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
  const alarm = e.alarmMinutesBefore ?? REMINDER_ALARM_MINUTES;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fitnote//Workout reminder//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${icsUtc(e.now)}`,
    `DTSTART:${icsUtc(e.start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(e.title)}`,
    `TRIGGER:-PT${alarm}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

/** Google Calendar "add event" link — a fallback when the device is online. */
export function googleCalendarUrl(e: Pick<CalendarEventInput, 'title' | 'description' | 'start' | 'durationMinutes'>): string {
  const end = new Date(e.start.getTime() + e.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${icsUtc(e.start)}/${icsUtc(end)}`,
    details: e.description ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Android: an intent that opens the phone's calendar on a pre-filled
 * "New event" screen (ACTION_INSERT, works with Xiaomi, Samsung and Google
 * calendars, offline). Downloaded .ics files are not opened automatically on
 * Android (field report: Xiaomi Calendar, v2.4). The calendar applies its
 * own default reminder; the alarm offset cannot be passed this way.
 * `fallbackUrl` opens in the browser if no app handles the intent.
 */
export function androidCalendarIntentUrl(
  e: Pick<CalendarEventInput, 'title' | 'description' | 'start' | 'durationMinutes'>,
  fallbackUrl?: string
): string {
  const begin = e.start.getTime();
  const end = begin + e.durationMinutes * 60_000;
  const parts = [
    'action=android.intent.action.INSERT',
    'type=vnd.android.cursor.dir/event',
    `S.title=${encodeURIComponent(e.title)}`,
    ...(e.description ? [`S.description=${encodeURIComponent(e.description)}`] : []),
    `l.beginTime=${begin}`,
    `l.endTime=${end}`,
    ...(fallbackUrl ? [`S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`] : []),
  ];
  return `intent:#Intent;${parts.join(';')};end`;
}

export function isAndroid(userAgent: string): boolean {
  return /android/i.test(userAgent);
}
