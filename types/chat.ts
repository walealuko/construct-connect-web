import { Product } from "@/types/database";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

/**
 * One row from `conversation_reads`. Tracks the last time *this user*
 * opened a particular conversation. The unread dot in the sidebar
 * shows when a conversation's `last_message_at` is newer than this
 * timestamp. We don't model the other participant's read state here
 * — the column `user_id` is always the caller's own id.
 */
export interface ConversationRead {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message: string;
  last_message_at: string;
  /**
   * ID of the user who sent the most recent message in this
   * conversation. Used by the sidebar to skip the unread dot for
   * conversations where *I* was the most recent sender — those are
   * never unread for me.
   *
   * Nullable for legacy rows that pre-date this column. The
   * sendMessageAction always writes it alongside last_message_at,
   * so any new activity backfills it.
   */
  last_message_sender_id?: string | null;
  project_id?: string | null;
  profiles: Profile[]; // We'll join this in the query
  /**
   * Filled in by `loadConversations` from the caller's row in
   * `conversation_reads`. Null if the user has never opened the
   * conversation. Compare against `last_message_at` to determine
   * whether the conversation has unread messages for this user.
   */
  last_read_at?: string | null;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}
