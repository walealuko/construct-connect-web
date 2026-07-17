// Email dispatch. Provider-agnostic; the sink is selected at module
// load time based on environment variables. The point of this layer
// is that the rest of the app calls `sendEmail(...)` without caring
// whether it's Resend, Postmark, a console log, or a no-op.
//
// Sink selection (in order):
//   1. RESEND_API_KEY set → Resend HTTP API.
//   2. NODE_ENV === 'production' and no provider → no-op.
//      (We don't log PII to a server console in prod. A no-op
//      means the email is silently dropped; better that than
//      leaking customer emails to log aggregators.)
//   3. Otherwise (dev / test) → console sink, which logs a
//      structured JSON line per send.

import { log } from "@/lib/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export type EmailSink = (msg: EmailMessage) => Promise<void>;

// ----------------------------------------------------------------
// Sink implementations
// ----------------------------------------------------------------

/** Resend HTTP API sink. Sends via fetch; logs and swallows errors. */
const resendSink: EmailSink = async (msg) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Construct Centre <noreply@construct-centre.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      log.error("email_send_failed", { provider: "resend", status: res.status, body });
    }
  } catch (e) {
    log.error("email_send_threw", {
      provider: "resend",
      message: e instanceof Error ? e.message : String(e),
    });
  }
};

/**
 * Console sink: emits the email as a structured log line. Used in
 * dev and by the test suite (which captures the log line). Never
 * used in production — production without a provider falls through
 * to noopSink.
 */
const consoleSink: EmailSink = async (msg) => {
  log.info("email_send", { to: msg.to, subject: msg.subject, html: msg.html });
};

/** No-op: silently drops the email. */
const noopSink: EmailSink = async () => {
  // The email is acknowledged as "sent" by virtue of the call
  // returning successfully; the message is intentionally dropped.
  // We don't log here — production logs would leak PII.
};

// ----------------------------------------------------------------
// Sink selection
// ----------------------------------------------------------------

/**
 * Pick the right sink for the current environment. Exported for
 * tests — callers should normally go through `sendEmail`.
 */
export function selectSink(): EmailSink {
  if (process.env.RESEND_API_KEY) return resendSink;
  if (process.env.NODE_ENV === "production") return noopSink;
  return consoleSink;
}

let activeSink: EmailSink = selectSink();

/**
 * Test hook: override the sink for the current process. Returns a
 * function that restores the original sink — call it from afterEach.
 */
export function __setEmailSinkForTests(sink: EmailSink | null): () => void {
  const previous = activeSink;
  activeSink = sink ?? selectSink();
  return () => {
    activeSink = previous;
  };
}

/**
 * Send an email. The sink swallows its own errors; sendEmail also
 * catches anything that escapes, so a broken provider or a custom
 * test sink that throws will never propagate up to the caller.
 * Returns void — fire and forget.
 *
 * The contract is: calling `sendEmail` either delivers the message
 * to the configured provider, logs it (in dev), or no-ops. It does
 * not throw.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  try {
    await activeSink(msg);
  } catch (e) {
    log.error("email_dispatch_threw", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
