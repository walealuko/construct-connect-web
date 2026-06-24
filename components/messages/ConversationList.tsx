"use client";

import React from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { getOtherParticipant } from "@/lib/messages-client";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  conversations: Conversation[];
  activeConv: Conversation | null;
  loading: boolean;
  currentUserId: string | undefined;
  onSelect: (conv: Conversation) => void;
}

/**
 * Returns true if this conversation has messages the current user
 * hasn't seen yet. Three conditions must hold:
 *   1. There's a message at all (`last_message_at` is set).
 *   2. The latest message was NOT sent by me — otherwise there's
 *      nothing actionable; the other party hasn't read my message
 *      but I don't need to know that.
 *   3. Either I've never opened this conversation
 *      (`last_read_at` is null) or the latest message is newer
 *      than my last-read timestamp.
 */
function hasUnread(conv: Conversation, currentUserId: string | undefined): boolean {
  if (!conv.last_message_at) return false;
  if (conv.last_message_sender_id && conv.last_message_sender_id === currentUserId) return false;
  if (!conv.last_read_at) return true;
  return new Date(conv.last_message_at).getTime() > new Date(conv.last_read_at).getTime();
}

/**
 * Sidebar list of conversations. Pure presentation — the parent
 * owns the conversation state, the active selection, and the
 * loading flag.
 */
export function ConversationList({
  conversations,
  activeConv,
  loading,
  currentUserId,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white space-y-3">
        <Link
          href="/dashboard"
          className="text-gray-500 text-xs inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h2 className="text-xl font-bold text-slate-900">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No conversations yet. <br /> Start chatting with sellers!
          </div>
        ) : (
          conversations.map((conv) => {
            const other = getOtherParticipant(conv, currentUserId);
            const unread = hasUnread(conv, currentUserId);
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`p-4 cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-100 ${
                  activeConv?.id === conv.id
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {other.first_name[0]}
                  </div>
                  {unread && (
                    // The unread dot. aria-label makes it discoverable
                    // to screen readers; the surrounding row is a
                    // clickable div without a label, so the dot is the
                    // only accessible cue. Color matches the active-row
                    // border so the user has a visual cue that maps to
                    // the same idea ("you're here").
                    <span
                      aria-label="Unread messages"
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p
                      className={`text-sm truncate ${
                        unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                      }`}
                    >
                      {other.first_name} {other.last_name}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p
                    className={`text-xs truncate ${
                      unread ? "text-slate-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {conv.last_message || "Start a conversation..."}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
