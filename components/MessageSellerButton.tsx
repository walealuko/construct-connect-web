"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/lib/chat";
import { toast } from "sonner";

export default function MessageSellerButton({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMessage = async () => {
    setLoading(true);
    try {
      // This needs the current user ID, but since we are in a client component
      // We can't easily get the user from the server.
      // We will assume the UserContext is available via a wrapper or we get it here.
      // For now, we'll use a simplified approach where we pass the current user from parent if needed
      // or we fetch it from supabase auth.
      const { data: { user } } = await import('@/lib/supabase').then(m => m.supabase.auth.getUser());

      if (!user) {
        toast.error("Please sign in to send a message");
        router.push("/login");
        return;
      }

      const conv = await startConversation(sellerId, user.id);
      toast.success("Conversation started!");
      router.push(`/messages?convId=${conv.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start conversation");
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
