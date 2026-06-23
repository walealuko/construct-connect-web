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
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {other.first_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {other.first_name} {other.last_name}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
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
