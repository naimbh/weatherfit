import type { HourOutfit, OutfitChange } from '../types';

/**
 * Browsers cannot wake a closed tab on a schedule without a push server, so
 * these alerts are timer-based and only fire while the app is open in a tab —
 * backgrounded is fine, closed is not. Installing the app to the home screen
 * makes that far more useful, because the tab tends to stay alive.
 *
 * Notifications are shown through the service worker when one is registered,
 * which is what lets them appear on Android and on installed iOS web apps.
 */

let timers: number[] = [];

export const supported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const permission = (): NotificationPermission =>
  supported() ? Notification.permission : 'denied';

export async function requestPermission(): Promise<boolean> {
  if (!supported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

async function show(title: string, body: string): Promise<void> {
  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'outfit-change',
  };
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* fall through to the direct constructor */
  }
  new Notification(title, options);
}

export function cancelAll(): void {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Replace every pending alert with the current forecast's change points.
 * Fires `leadMinutes` ahead so there is time to actually fetch the jacket.
 * Returns how many were scheduled.
 */
export function scheduleChangeAlerts(
  list: HourOutfit[],
  changes: OutfitChange[],
  leadMinutes = 45,
): number {
  cancelAll();
  if (permission() !== 'granted') return 0;

  const now = Date.now();
  let scheduled = 0;

  for (const change of changes) {
    const at = new Date(list[change.index].hour.time).getTime() - leadMinutes * 60_000;
    const delay = at - now;

    // setTimeout overflows past ~24.8 days; forecasts never reach that, but
    // clamping keeps a bad clock from firing everything immediately.
    if (delay <= 60_000 || delay > 2_147_483_647) continue;

    timers.push(
      window.setTimeout(() => {
        void show(
          `Time to ${change.instruction}`,
          `The change lands around ${clock(list[change.index].hour.time)}.`,
        );
      }, delay),
    );
    scheduled++;
  }

  return scheduled;
}

/** Used by the test button so people can confirm alerts actually appear. */
export async function sendTestNotification(next: OutfitChange | null): Promise<void> {
  if (!(await requestPermission())) return;
  await show(
    next ? `Time to ${next.instruction}` : 'Your outfit is set for today',
    next
      ? `This is a preview. The real alert arrives 45 minutes before ${clock(next.time)}.`
      : 'This is a preview. Nothing needs changing right now.',
  );
}

export { capitalise, clock };
