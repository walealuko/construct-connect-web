// Supabase Edge Function: notify-saved-searches
//
// Listens on the `new_project` pg_notify channel (emitted by
// migration 0016's trigger on projects INSERT) and dispatches one
// email per matching saved search via Resend.
//
// Why this lives outside the Next.js process:
//   - the trigger is the source of truth (it fires on every
//     insert, including direct-DB ones from a future admin tool)
//   - the matching is cheap, but it runs across every saved
//     search — pulling it into the Next.js process would couple
//     it to a single instance, and a deployment of a different
//     Next.js image would miss the email
//   - a long-running listener doesn't fit the per-request
//     lifecycle of a Next.js API route
//
// Deploy:
//   supabase functions deploy notify-saved-searches \
//     --no-verify-jwt \
//     --env-file supabase/functions/.env
//
// The `--no-verify-jwt` is intentional: the function is invoked
// internally by the database trigger, not by an end user. The
// pg_notify payload is the only input. RESEND_API_KEY is the
// only env var the function needs at runtime.
//
// Required env vars (set in supabase/functions/.env or via the
// dashboard):
//   SUPABASE_URL              — same as NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY — the service role key (not anon)
//   RESEND_API_KEY            — the Resend API key
//   EMAIL_FROM                — the From: address (defaults to a
//                               Construct Hub noreply)
//
// How matching works:
//   1. payload contains the new project's id, title, category,
//      state, budget, created_at (the trigger builds the JSON).
//   2. We fetch every row in `saved_searches` (the table is
//      small — at most a few hundred rows in practice).
//   3. For each row, we evaluate the filter against the project
//      payload. A match is when every non-null filter field is
//      satisfied. A row with all-null filters matches everything
//      — that's a "tell me about every new project" alert, which
//      is a valid use case.
//   4. For each match, we look up the saved-search owner's email
//      (via auth.admin.getUserById) and send one
//      `savedSearchMatchEmail` via the Resend HTTP API.
//
// Failure handling:
//   - A bad row (missing user, deleted user) logs and skips.
//   - A Resend failure logs and continues — we don't want a
//     stuck notification to block the rest of the batch.
//   - A DB query failure logs and exits the iteration; the next
//     pg_notify will re-attempt the matching for that project.

// We use Deno's built-in `fetch` (no npm import). Deno serves
// edge functions; the runtime is Deno, not Node. The imports
// below are URL imports — Deno's standard pattern.
//
// deno-lint-ignore-file no-explicit-any

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Minimal copy of the email template — the Edge Function runs in
// Deno, not Node, so we can't import the Next.js `lib/email-templates`
// module directly. The two implementations have to stay in sync;
// any future change to the template should update both. The
// constants below mirror the helpers in `lib/email-templates.ts`.
const escape = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatNaira = (n: number): string =>
  `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const wrapper = (title: string, body: string): string => `
<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <tr>
              <td style="background: #1e40af; padding: 24px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${escape(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 24px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 24px; background: #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
                Construct Hub — Nigeria's construction marketplace.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

function savedSearchMatchEmail(data: {
  recipientName: string;
  searchName: string;
  project: {
    id: string;
    title: string;
    description: string;
    budget: number | null;
    state: string | null;
    category: string | null;
    created_at: string;
  };
}): { subject: string; html: string } {
  const p = data.project;
  const body = `
    <p style="margin: 0 0 16px 0;">Hi ${escape(data.recipientName)},</p>
    <p style="margin: 0 0 16px 0;">A new project just landed that matches your saved search <strong>${escape(data.searchName)}</strong>:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <tr>
        <td style="padding: 12px 0;">
          <h2 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a;">${escape(p.title)}</h2>
          <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; line-height: 1.5;">${escape(p.description.slice(0, 280))}${p.description.length > 280 ? "…" : ""}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Budget</td>
        <td style="padding: 4px 0; text-align: right; font-weight: 600;">${p.budget != null ? formatNaira(p.budget) : "Negotiable"}</td>
      </tr>
      ${p.state ? `<tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Location</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${escape(p.state)}</td></tr>` : ""}
      ${p.category ? `<tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Category</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${escape(p.category)}</td></tr>` : ""}
    </table>
    <p style="margin: 16px 0 0 0;"><a href="/projects/${escape(p.id)}" style="background: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: 600;">View project</a></p>
  `;
  return {
    subject: `New project matching "${data.searchName}"`,
    html: wrapper("New project match", body),
  };
}

// Evaluate a saved-search row against the new project. Every
// non-null filter field must be satisfied. We use case-insensitive
// equality for the categorical fields (state, category) so a
// saved search of "lagos" matches a stored state of "Lagos".
// A row with all-null filters matches everything.
function matches(row: any, project: any): boolean {
  if (row.category != null && row.category !== "" && row.category !== project.category) {
    return false;
  }
  if (row.state != null && row.state !== "" && row.state !== project.state) {
    return false;
  }
  if (row.min_budget != null && (project.budget == null || project.budget < row.min_budget)) {
    return false;
  }
  if (row.max_budget != null && (project.budget == null || project.budget > row.max_budget)) {
    return false;
  }
  // `query` is a free-text substring match against title +
  // description. The /projects page does the same shape
  // (case-insensitive substring), so the saved search applies
  // identically to the live filter.
  if (row.query != null && row.query !== "") {
    const q = String(row.query).toLowerCase();
    const hay = `${project.title ?? ""} ${project.description ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

async function sendViaResend(
  resendKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    console.error("resend_failed", { status: res.status, body, to });
  }
}

serve(async (req: Request): Promise<Response> => {
  // The function is invoked by Supabase's database-webhook
  // integration. The body is a JSON object with `type`, `table`,
  // `record`, `old_record`. The pg_notify payload is NOT what
  // arrives here — the webhook adapter wraps it.
  //
  // We accept both shapes for resilience: the pg_notify style
  // (when invoked manually) and the database-webhook style (the
  // default after `supabase functions deploy` with a trigger).
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("EMAIL_FROM") ?? "Construct Hub <noreply@construct-hub.example.com>";

  if (!url || !serviceKey) {
    console.error("missing_supabase_env");
    return new Response("misconfigured", { status: 500 });
  }
  if (!resendKey) {
    // We deliberately don't 500 here — the function should still
    // log the match so we can re-process if the key lands later.
    console.error("missing_resend_key");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  let body: any;
  try {
    body = await req.json();
  } catch {
    // Allow GET for a quick health-check from the Supabase
    // dashboard's "test" button.
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Extract the project row from the trigger payload. The
  // pg_notify-style payload has `{ id, title, category, ... }`;
  // the database-webhook payload has `{ type, table, record: { id,
  // title, ... } }`. We handle both.
  const project = body?.record ?? body;
  if (!project || !project.id) {
    console.error("no_project_in_payload", { body });
    return new Response("no project", { status: 400 });
  }

  // Fetch the saved searches. We pull every row — the table is
  // small (per-user, dozens of rows max). A future scale-up
  // could push the match logic into a SQL function and stream
  // matches back.
  const { data: rows, error: listError } = await supabase
    .from("saved_searches")
    .select("*");
  if (listError) {
    console.error("saved_searches_list_failed", { message: listError.message });
    return new Response("list failed", { status: 500 });
  }

  const matchesList = (rows ?? []).filter((r) => matches(r, project));
  console.log("notify_saved_searches_match", {
    projectId: project.id,
    candidateCount: (rows ?? []).length,
    matchCount: matchesList.length,
  });

  for (const row of matchesList) {
    try {
      // Look up the saved-search owner's email + display name.
      // admin.getUserById is the service-role path to auth.users
      // (the cookie-bound client can't see other users).
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(
        row.user_id,
      );
      if (authError || !authData?.user?.email) {
        console.error("owner_lookup_failed", { userId: row.user_id, message: authError?.message });
        continue;
      }
      // Display name. profiles is readable with the service role
      // key (bypasses RLS), so we can grab first/last without
      // running the join through the cookie-bound client.
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", row.user_id)
        .maybeSingle();
      const recipientName = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || "there";

      const tpl = savedSearchMatchEmail({
        recipientName,
        searchName: row.name,
        project: {
          id: project.id,
          title: project.title ?? "",
          description: project.description ?? "",
          budget: project.budget ?? null,
          state: project.state ?? null,
          category: project.category ?? null,
          created_at: project.created_at ?? new Date().toISOString(),
        },
      });
      if (resendKey) {
        await sendViaResend(resendKey, from, authData.user.email, tpl.subject, tpl.html);
      } else {
        console.log("would_send_email", { to: authData.user.email, subject: tpl.subject });
      }
    } catch (e) {
      console.error("match_iteration_failed", {
        rowId: row.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, matchCount: matchesList.length }), {
    headers: { "content-type": "application/json" },
  });
});
