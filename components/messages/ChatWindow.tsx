"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { getOtherParticipant } from "@/lib/messages-client";
import type { Conversation, Message } from "@/types/chat";

interface ChatWindowProps {
  activeConv: Conversation;
  messages: Message[];
  currentUserId: string | undefined;
  deletingId: string | null;
  clearing: boolean;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  /**
   * Fired from the composer on each keystroke. The page debounces
   * and broadcasts to the typing channel. Optional so the prop
   * can be omitted in tests / Storybook.
   */
  onTyping?: () => void;
  /**
   * Display name of the other participant who's currently typing,
   * or null if nobody is. We show "{name} is typing…" above the
   * composer with a small dot animation.
   */
  otherTypingName?: string | null;
}

/**
 * The right-hand pane: header (other participant + Empty button),
 * scrollable message list, and the composer. Renders nothing if
 * `activeConv` is null — the page shows the empty state instead.
 */
export function ChatWindow({
  activeConv,
  messages,
  currentUserId,
  deletingId,
  clearing,
  newMessage,
  onNewMessageChange,
  onSend,
  onDelete,
  onClear,
  onTyping,
  otherTypingName,
}: ChatWindowProps) {
  const other = getOtherParticipant(activeConv, currentUserId);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0 transition-transform hover:scale-105">
            {other.displayInitial ?? other.first_name[0]}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">
              {other.first_name} {other.last_name}
            </h3>
            {/*
              Business-name subtitle in the chat header. Same gate
              as the sidebar (business / artisan only, non-empty
              string). `truncate` so a long company name doesn't
              push the action buttons off-screen.
            */}
            {(other.tier === "business" || other.tier === "artisan") &&
              other.business_name && (
                <p
                  className="text-xs text-slate-500 truncate flex items-center gap-1"
                  title={other.business_name}
                >
                  <span aria-hidden="true">🏢</span>
                  <span className="truncate">{other.business_name}</span>
                </p>
              )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeConv.project_id && (
            <Badge variant="info" className="px-3">
              Project Context: {activeConv.project_id.slice(0, 8)}...
            </Badge>
          )}
          <button
            type="button"
            onClick={onClear}
            disabled={clearing || messages.length === 0}
            aria-label="Empty conversation"
            title="Empty this conversation"
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {clearing ? "Emptying…" : "Empty"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="space-y-2 max-w-xs">
              <div className="text-4xl">💬</div>
              <p className="text-gray-500 text-sm font-medium">
                No messages yet. Say hi to break the ice.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.sender_id === currentUserId}
              isDeleting={deletingId === msg.id}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {otherTypingName && (
        // Tiny "X is typing" pill above the composer. The 3-dot
        // animation is pure CSS via tailwind's animate-pulse on
        // staggered children — no JS timer. The pill is
        // aria-live="polite" so screen readers announce the
        // change without interrupting the current focus.
        <div
          aria-live="polite"
          className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-slate-500 flex items-center gap-2"
        >
          <span className="flex gap-1" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "300ms" }} />
          </span>
          <span>{otherTypingName} is typing…</span>
        </div>
      )}

      <MessageComposer
        value={newMessage}
        onChange={(v) => {
          onNewMessageChange(v);
          // Fire on every keystroke — the page debounces before
          // broadcasting. Calling this for each char is cheap
          // (just a ref check + maybe a supabase send) and keeps
          // the composer dumb.
          onTyping?.();
        }}
        onSubmit={onSend}
      />
    </div>
  );
}
