"use client";

import React from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { getOtherParticipant } from "@/lib/messages-client";
import { formatRelativeShort } from "@/lib/formatRelativeShort";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  conversations: Conversation[];
  activeConv: Conversation | null;
  loading: boolean;
  currentUserId: string | undefined;
  onSelect: (conv: Conversation) => void;
  onHide: (conv: Conversation) => void;
  // Set of conversation ids currently being hidden, so the trash
  // button shows a spinner / is disabled during the round-trip.
  hidingId?: string | null;
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
  onHide,
  hidingId,
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
            const isActive = activeConv?.id === conv.id;
            // Layer backgrounds: unread + active gets the strongest tint,
            // unread alone gets a clear blue wash, read rows stay neutral.
            // The dot + bold name are still drawn for a redundant cue.
            const rowBg = isActive
              ? "bg-blue-50 border-l-4 border-l-blue-600"
              : unread
                ? "bg-blue-50/70 border-l-4 border-l-blue-400"
                : "border-l-4 border-l-transparent hover:bg-gray-100";
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv)}
                aria-label={unread ? `${other.first_name} ${other.last_name}, unread` : undefined}
                className={`group p-4 cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-100 ${rowBg}`}
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-transform group-hover:scale-105 ${
                      unread ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {other.displayInitial ?? other.first_name[0]}
                  </div>
                  {unread && (
                    // The unread dot. Color matches the row's left border
                    // so the user has a visual cue that maps to the same
                    // idea ("you're behind on this one"). aria-label makes
                    // it discoverable to screen readers — the row itself
                    // is a clickable div without a label.
                    <span
                      aria-label="Unread messages"
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p
                      className={`text-sm truncate ${
                        unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                      }`}
                    >
                      {other.first_name} {other.last_name}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {unread && (
                        <span
                          title="Unread messages"
                          className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded"
                        >
                          New
                        </span>
                      )}
                      <span
                        className="text-[10px] text-gray-400"
                        title={new Date(conv.last_message_at).toLocaleString()}
                      >
                        {formatRelativeShort(conv.last_message_at)}
                      </span>
                    </div>
                  </div>
                  {/*
                    Business-name subtitle. We only render it for
                    `business` / `artisan` accounts; individuals (and
                    admins) have a NULL column but tier filters those
                    out. The briefcase glyph is the only icon in the
                    app's vocabulary here — matches the empty-state
                    emoji on the chat pane, and avoids pulling in an
                    icon library.
                  */}
                  {(other.tier === "business" || other.tier === "artisan") &&
                    other.business_name && (
                      <p
                        className={`text-[11px] truncate flex items-center gap-1 ${
                          unread ? "text-slate-600" : "text-gray-500"
                        }`}
                        title={other.business_name}
                      >
                        <span aria-hidden="true">🏢</span>
                        <span className="truncate">{other.business_name}</span>
                      </p>
                    )}
                  <p
                    className={`text-xs truncate ${
                      unread ? "text-slate-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {conv.last_message || "Start a conversation..."}
                  </p>
                </div>
                {/* Hover-revealed "remove from my inbox" button.
                    stopPropagation so the row's onClick (which
                    selects the conversation) doesn't fire when the
                    user just wants to hide it. The other
                    participant is unaffected — we write to
                    `conversation_hides` per-user, and the sidebar
                    query filters hidden rows out for the caller
                    only. Hidden via opacity rather than display
                    so the row layout doesn't shift on hover. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHide(conv);
                  }}
                  disabled={hidingId === conv.id}
                  aria-label={`Remove ${other.first_name} ${other.last_name} from inbox`}
                  title="Remove from inbox"
                  className="opacity-0 group-hover:opacity-100 disabled:opacity-100 w-8 h-8 rounded-full text-red-500 hover:bg-red-50 transition-all inline-flex items-center justify-center flex-shrink-0"
                >
                  {hidingId === conv.id ? (
                    <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-sm font-bold leading-none">✕</span>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
