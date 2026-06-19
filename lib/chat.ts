import { supabase } from "@/lib/supabase";

export async function startConversation(userId: string, currentUserId: string) {
  // 1. Check if a conversation already exists between these two users.
  //    .contains() matches the participant_ids uuid[] column regardless of
  //    element ordering, which .eq() cannot.
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('id')
    .contains('participant_ids', [currentUserId, userId])
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  // 2. Create new conversation if none exists.
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert({
      participant_ids: [currentUserId, userId],
    })
    .select()
    .single();

  if (createError) throw createError;
  return newConv;
}
