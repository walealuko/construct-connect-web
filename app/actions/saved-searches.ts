"use server";

// Server actions for the /projects "saved search" feature. The
// user can save a combination of filters (free-text query,
// category, state, min/max budget) with a name, list their saved
// searches, and delete them. The Edge Function
// `notify-saved-searches` (deployed separately) reads this table
// to fan out new-project alerts.
//
// All three actions run on the cookie-bound server client, so RLS
// enforces self-only access at the database level. The action
// layer is a safety net: re-validates input, re-fetches the user
// id, and returns a typed result so the client can show a toast
// on failure.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { savedSearchSchema, type SavedSearchInput } from "@/lib/validations";
import { log } from "@/lib/logger";

/**
 * The shape of a row in the saved_searches table, with the
 * `id`, `user_id`, and `created_at` columns that the action
 * layer guarantees on the way back to the client. Other columns
 * may be null when the saved search is filter-only.
 */
export interface SavedSearchRow {
  id: string;
  user_id: string;
  name: string;
  query: string | null;
  category: string | null;
  state: string | null;
  min_budget: number | null;
  max_budget: number | null;
  created_at: string;
}

/**
 * Save (insert or update) a saved search. If the input includes
 * an `id`, the row is upserted by primary key — useful for "edit
 * a saved search" flows. Without an `id`, a fresh row is inserted
 * and the generated id is returned.
 *
 * Returns `{ success, id }` on success so the client can show the
 * new row immediately. On validation or DB failure, returns
 * `{ success: false, error }` with a user-readable message.
 */
export async function saveSearchAction(
  input: SavedSearchInput,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const parsed = savedSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid search" };
  }

  // Cross-field refinement: max_budget must be >= min_budget when
  // both are set. This isn't expressible in the column-level
  // CHECK constraints cleanly, and the client could send
  // contradictory values from a stale form.
  const data = parsed.data;
  if (data.min_budget != null && data.max_budget != null && data.max_budget < data.min_budget) {
    return { success: false, error: "Max budget must be at least the min budget" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // When editing an existing row, we want the row to keep its id
  // AND stay owned by the same user. RLS would catch a user_id
  // mismatch, but we set the user_id explicitly here for clarity.
  const row = {
    id: data.id,
    user_id: user.id,
    name: data.name,
    query: data.query ?? null,
    category: data.category ?? null,
    state: data.state ?? null,
    min_budget: data.min_budget ?? null,
    max_budget: data.max_budget ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("saved_searches")
    .upsert(row, { onConflict: "id" })
    .select("id")
    .single();

  if (error || !inserted) {
    log.error("save_search_failed", {
      userId: user.id,
      message: error?.message,
    });
    return { success: false, error: error?.message ?? "Failed to save search" };
  }

  revalidatePath("/projects");
  return { success: true, id: inserted.id };
}

/**
 * Delete a saved search by id. The action layer explicitly checks
 * the row's user_id matches the caller — RLS would catch a
 * mismatch, but the check here is the audit-trail-friendly
 * version: a stolen id from another user's row logs as a
 * "permission denied" without touching the row.
 */
export async function deleteSavedSearchAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id || !z.uuid().safeParse(id).success) {
    return { success: false, error: "Invalid id" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // Explicit ownership check before the delete. RLS also enforces
  // this, but the pre-check returns a clearer error and gives the
  // audit log a record of the attempt.
  const { data: row, error: selectError } = await supabase
    .from("saved_searches")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (selectError) {
    return { success: false, error: selectError.message };
  }
  if (!row) {
    return { success: false, error: "Saved search not found" };
  }
  if (row.user_id !== user.id) {
    log.warn("delete_saved_search_wrong_owner", {
      userId: user.id,
      targetId: id,
    });
    return { success: false, error: "Not found" };
  }

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  return { success: true };
}

/**
 * List the caller's saved searches, newest first. RLS scopes the
 * result to user_id = auth.uid() — the action layer doesn't need
 * to add a `.eq` filter, but the explicit filter is the
 * "defense in depth" version that the rest of the codebase uses.
 */
export async function listSavedSearchesAction(): Promise<{
  success: true;
  items: SavedSearchRow[];
} | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, items: (data ?? []) as SavedSearchRow[] };
}
