import { Product } from "@/types/database";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message: string;
  last_message_at: string;
  profiles: Profile[]; // We'll join this in the query
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}
