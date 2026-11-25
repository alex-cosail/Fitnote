/**
 * File saving that works on phones.
 *
 * - The blob URL is released only after a delay: Chrome on Android starts
 *   the download asynchronously, and revoking the URL right after click()
 *   makes the download silently fail (field report, v2.2).
 * - The share sheet on Android accepts only some file types (not JSON), so
 *   files are offered as text/plain with their real name; the receiving app
 *   (Files, Drive, Telegram) keeps the .json name.
 */

const REVOKE_DELAY_MS = 60_000;

export function downloadFile(name: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, REVOKE_DELAY_MS);
}

/**
 * Offers the file through the system share sheet when the device can share
 * files, otherwise downloads it. Resolves to 'shared' | 'downloaded';
 * rejects with AbortError when the user closes the share sheet.
 */
export async function shareOrDownloadFile(
  name: string,
  text: string,
  title: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([text], name, { type: 'text/plain' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return 'shared';
  }
  downloadFile(name, text);
  return 'downloaded';
}

/**
 * Hands a calendar event to the phone: share sheet with a text/calendar file
 * when supported (calendar apps pick it up), otherwise a download that the
 * system opens with the calendar (iPhone shows "Add to Calendar").
 */
export async function shareOrDownloadCalendar(name: string, ics: string): Promise<'shared' | 'downloaded'> {
  const file = new File([ics], name, { type: 'text/calendar' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Fitnote — тренировка' });
    return 'shared';
  }
  downloadFile(name, ics, 'text/calendar');
  return 'downloaded';
}
