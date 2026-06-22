type Level = "info" | "warn" | "error";

function emit(level: Level, msg: string, extra?: Record<string, unknown>) {
  const line = {
    t: new Date().toISOString(),
    level,
    msg,
    ...(extra ?? {}),
  };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
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
