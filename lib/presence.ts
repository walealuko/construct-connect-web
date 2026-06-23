/**
 * Pure presence helper. Lives in lib/ (not in app/actions/) so it
 * can be a regular function and be imported by both the chat server
 * action and the test suite.
 *
 * The presence gate decides whether the chat message-received
 * email should fire. We send only when the recipient hasn't been
 * active on the app recently — below the window, we assume they
 * already see the message via realtime.
 *
 * lastSeen may be null/undefined (user has never signed in on a
 * device that writes the column, e.g. they signed in before this
 * migration shipped). In that case we treat them as "not recently
 * active" and send — better to over-email than miss a notification
 * for a real user.
 */

export const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

export function shouldEmailForPresence(
  now: number,
  lastSeen: string | null | undefined,
): boolean {
  if (!lastSeen) return true;
  const lastSeenMs = new Date(lastSeen).getTime();
  if (Number.isNaN(lastSeenMs)) return true; // bad data; default to sending
  // Strictly greater than: at exactly the window boundary, the user
  // is still treated as online (a "5 minutes ago" user is plausibly
  // still looking at the app).
  return now - lastSeenMs > PRESENCE_WINDOW_MS;
}
