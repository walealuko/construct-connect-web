import { supabase } from "@/lib/supabase";

export async function startConversation(userId: string, currentUserId: string) {
  // 1. Check if conversation already exists
  const { data: existingConv, error: fetchError } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_ids', [userId, currentUserId]) // Note: Postgres array ordering might matter
    .single();

  if (!existingConv) {
    const { data: reversedConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_ids', [currentUserId, userId])
      .single();

    if (reversedConv) return reversedConv;
  } else {
    return existingConv;
  }

  // 2. Create new conversation if not found
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
