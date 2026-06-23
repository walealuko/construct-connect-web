type Level = "info" | "warn" | "error";

// Sink is captured at module init. Tests override it via
// __setSinkForTests so they can assert on emitted JSON without
// spying on console. The default sink writes to stdout/stderr.
type Sink = (level: Level, line: string) => void;
let sink: Sink = (level, line) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

function emit(level: Level, msg: string, extra?: Record<string, unknown>) {
  const line = {
    t: new Date().toISOString(),
    level,
    msg,
    ...(extra ?? {}),
  };
  sink(level, JSON.stringify(line));
}

/**
 * Minimal JSON-shaped logger. Writes one line per call to stdout/stderr
 * so Vercel/Logtail/etc. can index by `msg` and `t`.
 *
 * Existing `console.error` call sites in the codebase are intentionally
 * left alone — only the hot paths (payment verify, payment init, admin
 * actions) were migrated as part of the security pass. Migrating the
 * rest is a follow-up.
 */
export const log = {
  info: (msg: string, extra?: Record<string, unknown>) => emit("info", msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => emit("warn", msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => emit("error", msg, extra),
};

/**
 * Test-only helper. Redirects log output to a custom sink so tests
 * can capture and assert on emitted JSON. Pass `null` to restore the
 * default stdout/stderr sink.
 */
export function __setSinkForTests(next: Sink | null): void {
  sink = next ?? ((level, line) => {
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  });
}
