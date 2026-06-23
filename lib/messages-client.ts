import { supabase } from "@/lib/supabase";
import type { Conversation, Message, Profile } from "@/types/chat";

/**
 * Load all conversations for the current user, with their participant
 * profiles stitched in. The `participant_ids` column is a uuid[] —
 * PostgREST can't auto-embed an array relation, so we fetch
 * conversations then profiles in a second query.
 *
 * Throws on any Supabase error so the caller can toast it. The
 * profile-lookup failure is non-fatal: the conversation still renders
 * with "Unknown" participants, matching the previous behavior.
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
