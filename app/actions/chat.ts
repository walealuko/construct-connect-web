"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createConversationAction(participantId: string, projectId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to start a conversation" };
  }

  // 1. Ensure the participant is different from the user
  if (participantId === user.id) {
    return { success: false, error: "You cannot start a conversation with yourself" };
  }

  // 2. Check if a conversation already exists between these two users
  // (This is a simplified check, in production we'd query the participants junction table)
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .contains('participant_ids', [user.id])
    .contains('participant_ids', [participantId])
    .maybeSingle();

  if (existingConv) {
    return { success: true, conversationId: existingConv.id };
  }

  // 3. Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      participant_ids: [user.id, participantId],
      project_id: projectId,
      last_message: "Conversation started",
      last_message_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/messages');
  return { success: true, conversationId: newConv.id };
}

/**
 * Delete a single message from a conversation. Either participant of
 * the conversation can delete any message in it (not just the
 * sender). The actual delete is enforced at the RLS layer — this
 * action exists to (1) keep the conversation in a valid state (we
 * roll the conversation's last_message / last_message_at forward to
 * the most recent surviving message, or clear them if the deleted
 * message was the last one) and (2) give the client a single
 * server-rendered entry point so we can revalidate /messages.
 */
export async function deleteMessageAction(messageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  // Pull the message + its conversation in one query so we can update
  // the conversation's last_message snapshot after the row is gone.
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, created_at')
    .eq('id', messageId)
    .maybeSingle();

  if (msgError) return { success: false, error: msgError.message };
  if (!msg) return { success: false, error: "Message not found" };

  // RLS will block this if the caller isn't a participant of the
  // conversation. The action doesn't pre-check so the RLS policy
  // remains the single source of truth.
  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (deleteError) return { success: false, error: deleteError.message };

  // Roll the conversation's last_message / last_message_at forward
  // to the most recent surviving message, or clear them if the
  // deleted message was the most recent one and nothing else exists.
  const { data: latest } = await supabase
    .from('messages')
    .select('content, created_at')
    .eq('conversation_id', msg.conversation_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: convError } = await supabase
    .from('conversations')
    .update({
      last_message: latest?.content ?? "",
      last_message_at: latest?.created_at ?? new Date().toISOString(),
    })
    .eq('id', msg.conversation_id);

  if (convError) {
    // Non-fatal — the message is already deleted, the conversation
    // snapshot will be stale until the next message is sent. Don't
    // surface this to the user.
    console.error("Failed to roll conversation snapshot after delete:", convError);
  }

  revalidatePath('/messages');
  return { success: true };
}

/**
 * Empty a conversation — delete every message in it. Either participant
 * can do this (RLS-gated on the messages DELETE policy). The conversation
 * row itself is preserved so the participant still shows up in the
 * sidebar; only its `last_message` snapshot is cleared.
 *
 * We don't keep an "Empty" marker in `last_message` — an empty string
 * is what the sidebar shows as the placeholder ("Start a conversation…"),
 * so a clean empty is the right UI state.
 */
export async function clearConversationAction(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  // RLS blocks the delete if the caller isn't a participant. The action
  // doesn't pre-check membership — same pattern as deleteMessageAction.
  const { error: deleteError, count } = await supabase
    .from("messages")
    .delete({ count: "exact" })
    .eq("conversation_id", conversationId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Reset the snapshot so the sidebar doesn't keep showing the last
  // deleted message as a preview. After migration 0005, participants
  // can update the conversation row's snapshot fields.
  const { error: convError } = await supabase
    .from("conversations")
    .update({
      last_message: "",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (convError) {
    // Non-fatal — the messages are gone, the sidebar preview will be
    // stale until the next message is sent.
    console.error("Failed to reset conversation snapshot after clear:", convError);
  }

  revalidatePath("/messages");
  return { success: true, deleted: count ?? 0 };
}
