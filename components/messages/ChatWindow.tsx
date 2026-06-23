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
}: ChatWindowProps) {
  const other = getOtherParticipant(activeConv, currentUserId);

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            {other.first_name[0]}
          </div>
          <h3 className="font-bold text-slate-900">
            {other.first_name} {other.last_name}
          </h3>
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

      <MessageComposer value={newMessage} onChange={onNewMessageChange} onSubmit={onSend} />
    </div>
  );
}
