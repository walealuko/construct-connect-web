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
