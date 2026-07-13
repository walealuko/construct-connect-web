/**
 * Compact timestamp for the inbox sidebar. Picks the most
 * readable format for a 30-pixel column on a chat list:
 *
 *   - same day                → "2:14 PM"
 *   - yesterday               → "Yesterday"
 *   - within the last 6 days  → "Mon", "Tue", … (weekday)
 *   - same calendar year      → "Mar 12"
 *   - older                   → "Mar 12, 2024"
 *
 * The function is pure (input is a parsed Date, output is a
 * string) so it's trivial to unit-test if we ever want to. The
 * `now` parameter exists for the same reason — tests can pin
 * time without monkey-patching Date.
 */
export function formatRelativeShort(ts: string | Date, now: Date = new Date()): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return "";

  // Compare calendar days in the local timezone — not absolute
  // hours — so a message from 11pm and a check at 1am the next
  // day count as "yesterday", not "earlier today".
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayDiff = Math.floor(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000,
  );

  if (dayDiff === 0) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  // Older than a week.
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
