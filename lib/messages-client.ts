import { supabase } from "@/lib/supabase";
import type { Conversation, Message, Profile, ConversationRead } from "@/types/chat";

/**
 * Load all conversations for the current user, with their participant
 * profiles stitched in. The `participant_ids` column is a uuid[] —
 * PostgREST can't auto-embed an array relation, so we fetch
 * conversations then profiles in a second query.
 *
 * We also fetch the caller's per-conversation `conversation_reads`
 * rows in a third query. The result is the *user's* read marker for
 * each conversation; missing rows are normalized to `null`, which
 * the UI treats as "never opened" → unread.
 *
 * Throws on the conversations query failure so the caller can toast.
 * The profile and read-row lookups are non-fatal: the conversation
 * still renders with "Unknown" participants and without an unread
 * marker, matching the previous behavior.
 */
export async function loadConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false });
  if (error) throw error;

  const idSet = new Set<string>();
  for (const c of data || []) {
    for (const pid of c.participant_ids || []) idSet.add(pid);
  }
  const ids = Array.from(idSet);
  const convIds = (data || []).map((c) => c.id);

  // Look up the caller's read rows for every conversation they
  // participate in. RLS scopes this to user_id = auth.uid() so we
  // never see another participant's marker.
  const { data: reads, error: readsError } = await supabase
    .from("conversation_reads")
    .select("conversation_id, user_id, last_read_at")
    .in("conversation_id", convIds);
  if (readsError) {
    // Non-fatal — every conversation gets a null last_read_at and
    // the UI shows them all as unread. That's wrong but not broken.
    console.error("Failed to load conversation reads:", readsError);
  }
  const readByConv: Record<string, ConversationRead> = {};
  for (const r of reads || []) readByConv[r.conversation_id] = r as ConversationRead;

  let profileById: Record<string, Profile> = {};
  if (ids.length > 0) {
    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .in("id", ids);
    if (pError) {
      // Non-fatal — render with "Unknown" participants.
      console.error("Failed to load conversation participants:", pError);
    } else {
      for (const p of profiles || []) profileById[p.id] = p as Profile;
    }
  }

  return (data || []).map((c) => ({
    ...c,
    profiles: (c.participant_ids || [])
      .map((pid: string) => profileById[pid])
      .filter(Boolean),
    // Stitch the caller's read marker. A row from the read table
    // always belongs to the caller (RLS). Missing → null → unread.
    last_read_at: readByConv[c.id]?.last_read_at ?? null,
  })) as Conversation[];
}

/**
 * Load all messages in a conversation, oldest first. Throws on
 * Supabase error so the caller can toast.
 */
export async function loadMessages(convId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Message[];
}

/**
 * Resolve the *other* participant's profile for a conversation. Used
 * by both the sidebar and the chat header. Falls back to an
 * "Unknown" stub so callers can render unconditionally.
 */
export function getOtherParticipant(
  conv: Conversation,
  currentUserId: string | undefined,
): Profile {
  const otherId = conv.participant_ids.find((id) => id !== currentUserId);
  const profile = conv.profiles?.find((p) => p.id === otherId);
  return profile || { id: otherId || "", first_name: "Unknown", last_name: "" };
}
