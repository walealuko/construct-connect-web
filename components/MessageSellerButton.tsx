"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createConversationAction } from "@/app/actions/chat";

export default function MessageSellerButton({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMessage = async () => {
    setLoading(true);
    try {
      // Use the server action — it (a) checks auth server-side,
      // (b) refuses self-chat, (c) returns the existing
      // conversation id if one is already open, (d) seeds
      // last_message + last_message_at on new conversations so
      // the sidebar preview isn't blank until the first message
      // is sent. The previous client-side helper
      // (lib/chat.ts:startConversation) duplicated this logic
      // without the last_message seeding and without the
      // self-chat check.
      const result = await createConversationAction(sellerId);

      if (!result.success) {
        // The action's failure branch always sets an `error`
        // message (auth, self-chat, db insert), but TS narrows
        // the success branch away (no `error` key there), which
        // makes `result.error` optional on the failure branch.
        // Pull it into a local so we don't have to repeat the
        // optional chain and the cast is local to this block.
        const message = result.error ?? "Failed to start conversation";
        // Most common cause here: not signed in. The action's
        // error message is specific ("You must be logged in…").
        // Surface it; if the user is anonymous, send them to
        // /login. (The action's auth check happens before the
        // self-chat check, so this branch is the "signed out"
        // case in practice.)
        toast.error(message);
        if (message.toLowerCase().includes("logged in")) {
          router.push("/login");
        }
        return;
      }

      // Deep-link the messages page to the conversation we just
      // resolved. The page reads ?convId= and selects the
      // conversation from the loaded list — a no-op for the
      // buyer, who lands directly in the chat with the seller.
      router.push(`/messages?convId=${result.conversationId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start conversation";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleMessage}
      disabled={loading}
      className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
    >
      {loading ? "Opening Chat..." : "Message Seller"}
    </button>
  );
}

