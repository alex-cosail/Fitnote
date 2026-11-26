import { describe, expect, it } from 'vitest';
import {
  androidCalendarIntentUrl,
  buildIcsEvent,
  googleCalendarUrl,
  icsEscape,
  icsFold,
  icsUtc,
  isAndroid,
  nextReminderDate,
  roundedTimeOfDay,
} from './ics';

describe('reminder dates', () => {
  it('next date at a local time, days ahead', () => {
    const now = new Date(2026, 10, 25, 19, 40); // 25 Nov, 19:40 local
    const d = nextReminderDate(2, '18:30', now);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 27, 18, 30]);
  });

  it('crosses month and year ends', () => {
    const d = nextReminderDate(1, '07:00', new Date(2026, 11, 31, 20, 0));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 0, 1]);
  });

  it('rounds the current time to 15 minutes', () => {
    expect(roundedTimeOfDay(new Date(2026, 10, 25, 19, 38))).toBe('19:45');
    expect(roundedTimeOfDay(new Date(2026, 10, 25, 19, 7))).toBe('19:00');
    expect(roundedTimeOfDay(new Date(2026, 10, 25, 23, 55))).toBe('00:00');
  });
});

describe('iCalendar', () => {
  it('formats UTC and escapes text', () => {
    expect(icsUtc(new Date(Date.UTC(2026, 10, 27, 15, 30, 0)))).toBe('20261127T153000Z');
    expect(icsEscape('A, B; C\\D\nE')).toBe('A\\, B\\; C\\\\D\\nE');
  });

  it('folds long lines at 75 bytes counting Cyrillic as 2 bytes', () => {
    const line = 'SUMMARY:' + 'Тренировка '.repeat(10);
    const folded = icsFold(line);
    const enc = new TextEncoder();
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(line);
  });

  it('builds an event with a one-hour alarm', () => {
    const start = new Date(Date.UTC(2026, 10, 27, 15, 30));
    const ics = buildIcsEvent({
      uid: 'abc@fitnote',
      title: 'Fitnote: следующая тренировка',
      description: 'Открыть: https://example.org/#/workout',
      url: 'https://example.org/#/workout',
      start,
      durationMinutes: 60,
      now: new Date(Date.UTC(2026, 10, 25, 17, 0)),
    });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261127T153000Z');
    expect(ics).toContain('DTEND:20261127T163000Z');
    expect(ics).toContain('TRIGGER:-PT60M');
    expect(ics).toContain('UID:abc@fitnote');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.includes('\n') && !/[^\r]\n/.test(ics)).toBe(true); // CRLF only
  });

  it('Google Calendar link carries title and dates', () => {
    const url = googleCalendarUrl({
      title: 'Fitnote',
      start: new Date(Date.UTC(2026, 10, 27, 15, 30)),
      durationMinutes: 45,
    });
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('dates=20261127T153000Z%2F20261127T161500Z');
  });
});

describe('Android calendar intent', () => {
  it('opens a pre-filled new event with begin and end times', () => {
    const start = new Date(Date.UTC(2026, 10, 27, 15, 30));
    const url = androidCalendarIntentUrl(
      { title: 'Fitnote: следующая тренировка', description: 'Открыть Fitnote', start, durationMinutes: 60 },
      'https://calendar.google.com/x?a=1&b=2'
    );
    expect(url.startsWith('intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/event;')).toBe(true);
    expect(url).toContain(`l.beginTime=${start.getTime()}`);
    expect(url).toContain(`l.endTime=${start.getTime() + 3_600_000}`);
    expect(url).toContain(`S.title=${encodeURIComponent('Fitnote: следующая тренировка')}`);
    expect(url).toContain('S.browser_fallback_url=https%3A%2F%2Fcalendar.google.com%2Fx%3Fa%3D1%26b%3D2');
    expect(url.endsWith(';end')).toBe(true);
    // No raw separators inside values.
    const body = url.slice('intent:#Intent;'.length, -';end'.length);
    for (const part of body.split(';')) expect(part).toMatch(/^[A-Za-z._]+=[^;#]*$/);
  });

  it('detects Android user agents', () => {
    expect(isAndroid('Mozilla/5.0 (Linux; Android 14; 23078PND5G) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36')).toBe(true);
    expect(isAndroid('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(false);
  });
});

describe('weekly repeat', () => {
  const base = { uid: 'u', title: 'Fitnote', start: new Date(2026, 10, 27, 18, 0), durationMinutes: 45, now: new Date(2026, 10, 26), rrule: 'FREQ=WEEKLY;BYDAY=TU,FR' };
  it('goes into the .ics file, the Android intent and the Google link', () => {
    expect(buildIcsEvent(base)).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU,FR\r\n');
    expect(androidCalendarIntentUrl(base)).toContain('S.rrule=FREQ%3DWEEKLY%3BBYDAY%3DTU%2CFR');
    expect(googleCalendarUrl(base)).toContain('recur=RRULE%3AFREQ%3DWEEKLY%3BBYDAY%3DTU%2CFR');
  });
});
