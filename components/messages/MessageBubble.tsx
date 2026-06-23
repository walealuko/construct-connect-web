"use client";

import React from "react";
import type { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

/**
 * A single chat bubble. Renders the message body, timestamp, and a
 * trash button on hover/focus. Either participant can delete any
 * message in the conversation; the button is hidden until hover so
 * the chat stays clean.
 */
export function MessageBubble({ message, isMine, isDeleting, onDelete }: MessageBubbleProps) {
  return (
    <div className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-md">
        <div
          className={`p-3 rounded-2xl text-sm ${
            isMine
              ? "bg-blue-600 text-white rounded-tr-none shadow-sm"
              : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none"
          }`}
        >
          {message.content}
          <div
            className={`text-[10px] mt-1 text-right ${isMine ? "text-blue-200" : "text-gray-400"}`}
          >
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(message.id)}
          disabled={isDeleting}
          aria-label="Delete message"
          title="Delete message"
          className={`absolute -top-2 ${isMine ? "-left-2" : "-right-2"} w-7 h-7 rounded-full bg-white shadow-md border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 transition-all flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDeleting ? "…" : "🗑"}
        </button>
      </div>
    </div>
  );
}
