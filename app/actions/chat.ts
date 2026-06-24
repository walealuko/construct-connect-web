"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { messageReceivedEmail } from "@/lib/email-templates";
import { shouldEmailForPresence } from "@/lib/presence";

// The presence helper is imported from "@/lib/presence" because
// "use server" files can only export async functions. The chat
// trigger uses it inline; tests import it from "@/lib/presence"
// directly.

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
  // can update the conversation row's snapshot fields. We also
  // clear `last_message_sender_id` because there's no "latest
  // message" left, and leaving the prior sender pointer would
  // leave the unread-comparison logic comparing against an
  // unrelated user's id.
  const { error: convError } = await supabase
    .from("conversations")
    .update({
      last_message: "",
      last_message_at: new Date().toISOString(),
      last_message_sender_id: null,
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

/**
 * Mark a conversation as read for the caller. Upserts a row in
 * `conversation_reads` keyed on (conversation_id, user_id) so the
 * next sidebar render drops the unread badge. Idempotent — calling
 * twice in a row is safe.
 *
 * RLS gates the upsert: the user can only write their own row, and
 * the SELECT pre-check below also confirms the user is a participant
 * of the conversation before they touch the read table.
 */
export async function markConversationReadAction(
  conversationId: string,
): Promise<{ success: true; lastReadAt: string } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  // Confirm the caller is a participant. RLS on conversation_reads
  // doesn't enforce this (it's per-user, not per-conv), so we check
  // it ourselves here. Without this check a user could mark a
  // conversation they're not in as "read" — they'd see no effect,
  // but the row would still get written and pollute the table.
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .select("participant_ids")
    .eq("id", conversationId)
    .maybeSingle();
  if (convError) return { success: false, error: convError.message };
  if (!conv || !(conv.participant_ids ?? []).includes(user.id)) {
    return { success: false, error: "Not a participant of this conversation" };
  }

  const nowIso = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from("conversation_reads")
    .upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        last_read_at: nowIso,
      },
      { onConflict: "conversation_id,user_id" },
    );

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  return { success: true, lastReadAt: nowIso };
}

/**
 * Insert a message and update the conversation's last_message
 * snapshot. Server-side so the email trigger can run in the same
 * handler. Replaces the previous client-side insert in
 * app/messages/page.tsx.
 *
 * Email policy: when a message arrives, email the recipient — but
 * only if they haven't been active on the app recently. The
 * presence gate is `shouldEmailForPresence` (testable, pure).
 *
 * The conversation participant list is a uuid[] array column.
 * PostgREST can't auto-embed an array relation, so we read the
 * conversation row first, then look up the recipient's profile
 * directly. The sender's profile is read the same way.
 */
export async function sendMessageAction(
  conversationId: string,
  content: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };

  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: "Message is empty" };

  // 1. Insert the message. RLS enforces that the caller is a
  //    participant of the conversation.
  const { error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
    });
  if (msgError) return { success: false, error: msgError.message };

  // 2. Update the conversation's last_message snapshot. Same shape
  //    the previous client code did. We also write
  //    `last_message_sender_id` so the sidebar's "unread" check can
  //    skip conversations where I was the most recent sender.
  const { error: convError } = await supabase
    .from("conversations")
    .update({
      last_message: trimmed,
      last_message_at: new Date().toISOString(),
      last_message_sender_id: user.id,
    })
    .eq("id", conversationId);

  if (convError) {
    // Non-fatal — the message is in, the sidebar preview will be
    // stale until the next message is sent. The client optimistically
    // updates its local state, so the sender doesn't notice.
    log.error("chat_conv_snapshot_failed", {
      conversationId,
      message: convError.message,
    });
  }

  // 3. Fire the email. Look up the recipient (the participant who
  //    isn't the sender), then check their last_seen before
  //    sending. We use the admin client to read auth.users for the
  //    recipient's email — the cookie-bound client can only see the
  //    caller's own row.
  void (async () => {
    try {
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseServiceKey || !supabaseUrl) {
        log.error("email_chat_admin_env_missing", { conversationId });
        return;
      }
      const admin = createAdminClient(supabaseUrl, supabaseServiceKey);

      const { data: conv, error: convLookupError } = await admin
        .from("conversations")
        .select("participant_ids")
        .eq("id", conversationId)
        .maybeSingle();
      if (convLookupError || !conv) {
        log.error("email_chat_conv_lookup_failed", {
          conversationId,
          message: convLookupError?.message,
        });
        return;
      }
      const recipientId = (conv.participant_ids ?? []).find((id: string) => id !== user.id);
      if (!recipientId) {
        // Self-conversation or degenerate case — no email.
        return;
      }

      // Skip if the recipient is currently active.
      const { data: recipientProfile, error: profileError } = await admin
        .from("profiles")
        .select("first_name, last_name, last_seen")
        .eq("id", recipientId)
        .maybeSingle();
      if (profileError) {
        log.error("email_chat_profile_lookup_failed", {
          conversationId,
          message: profileError.message,
        });
        return;
      }
      if (!shouldEmailForPresence(Date.now(), recipientProfile?.last_seen)) {
        // Recipient is online — no email.
        return;
      }

      const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(recipientId);
      if (recipientError || !recipient?.user?.email) {
        log.error("email_chat_recipient_email_missing", {
          conversationId,
          recipientId,
        });
        return;
      }

      // Sender name — same lookup, but for the sender.
      const { data: senderProfile } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      const senderName =
        [senderProfile?.first_name, senderProfile?.last_name].filter(Boolean).join(" ").trim() ||
        "Someone";
      const recipientName =
        [recipientProfile?.first_name, recipientProfile?.last_name].filter(Boolean).join(" ").trim() ||
        "there";

      // Preview = the message text, capped so a wall of text doesn't
      // blow out the email body. 240 chars is enough to know what
      // the message is about without being the whole thing.
      const preview = trimmed.length > 240 ? trimmed.slice(0, 240) + "…" : trimmed;

      const tpl = messageReceivedEmail({
        recipientName,
        senderName,
        preview,
        conversationId,
      });
      await sendEmail({
        to: recipient.user.email,
        subject: tpl.subject,
        html: tpl.html,
      });
    } catch (e) {
      log.error("email_chat_threw", {
        conversationId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  })();

  revalidatePath("/messages");
  return { success: true };
}
