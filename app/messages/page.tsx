"use client";

import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "@/components/UserContext";
import { toast } from "sonner";
import { Message, Conversation } from "@/types/chat";
import { useSearchParams } from "next/navigation";
import {
  createConversationAction,
  deleteMessageAction,
  clearConversationAction,
  sendMessageAction,
} from "@/app/actions/chat";
import { supabase } from "@/lib/supabase";
import { loadConversations, loadMessages, getOtherParticipant } from "@/lib/messages-client";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatWindow } from "@/components/messages/ChatWindow";

function ChatContent() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const targetUserId = searchParams.get("userId");
  // Deep-link target. Three callers set this:
  //   - MessageSellerButton: ?convId=<existing or newly-created id>
  //   - buyer-dashboard:     ?convId=<id from the conversation list>
  //   - direct paste / link share
  // When set, we resolve the conversation from the loaded list and
  // select it. We do NOT auto-create from convId — that would be
  // a security hole (anyone who guesses a uuid could land in
  // someone else's thread if it happens to be theirs). The page
  // only auto-creates from ?userId= (an explicit "start a chat
  // with this person" intent), and from there the server action
  // returns a real id and the URL is rewritten via setActiveConv.
  const convIdFromUrl = searchParams.get("convId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  // Tracks the message currently being deleted so the trash button
  // shows a spinner / is disabled during the round-trip. The DELETE
  // also propagates via the realtime channel, so we don't need to
  // optimistically remove it from `messages` locally — the channel
  // listener will drop it on confirmation.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Tracks whether a "clear all" operation is in flight on the active
  // conversation so the Empty button shows a spinner / is disabled.
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadConversations().then((fresh) => {
      setConversations(fresh);
      // Deep-link: if the URL names a conversation, select it. This
      // runs once on first load and again whenever the convId
      // changes (e.g. the user clicks another conversation row
      // somewhere on the site and the link is followed).
      if (convIdFromUrl) {
        const target = fresh.find((c) => c.id === convIdFromUrl);
        // RLS means the user can only see conversations they
        // participate in. If the id is in the loaded list, it's
        // theirs. If not, silently skip — the user just sees the
        // empty state rather than an error toast for a 404.
        if (target) setActiveConv(target);
      }
    }).catch(() => {
      toast.error("Failed to load conversations");
    });

    if (targetUserId) {
      handleInitiateChat(targetUserId, projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, targetUserId, projectId, convIdFromUrl]);

  const handleInitiateChat = async (userId: string, projId?: string | null) => {
    try {
      const result = await createConversationAction(userId, projId || undefined);
      if (result.success && result.conversationId) {
        const fresh = await loadConversations().catch(() => conversations);
        setConversations(fresh);
        const conv = fresh.find((c) => c.id === result.conversationId);
        if (conv) setActiveConv(conv);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  // Sidebar refresh — wraps the lib helper so we can update the
  // loading state and surface errors uniformly. Used after every
  // mutating action that affects the conversation snapshot.
  const refreshConversations = async () => {
    setLoading(true);
    try {
      const fresh = await loadConversations();
      setConversations(fresh);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id).then(setMessages).catch(() => {
      toast.error("Failed to load messages");
    });

    const channel = supabase
      .channel(`conv-${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .on(
        "postgres_changes",
        {
          // Mirror a remote delete (either participant's) into the
          // local state so the other side sees the bubble disappear
          // in real time without a refresh.
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          const oldId = (payload.old as Partial<Message>)?.id;
          if (typeof oldId === "string") {
            setMessages((prev) => prev.filter((m) => m.id !== oldId));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || !user) return;

    const msgContent = newMessage;
    setNewMessage("");

    // Optimistic insert: append the message to the local state
    // immediately so the sender sees it. The server action does
    // the actual write (RLS-gated) and fires the email to the
    // recipient when their last_seen is older than 5 minutes.
    //
    // The realtime channel will also deliver an INSERT for this
    // message. To avoid a duplicate in the UI we mark the
    // optimistic row with a `__optimistic: true` flag in a side
    // channel; when the realtime insert lands with the same
    // content + sender, we drop the optimistic one.
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: msgContent,
      created_at: new Date().toISOString(),
      is_read: false,
    } as Message & { __optimistic?: boolean };
    optimisticMsg.__optimistic = true;
    setMessages((prev) => [...prev, optimisticMsg]);

    const result = await sendMessageAction(activeConv.id, msgContent);
    if (!result.success) {
      // Roll back the optimistic insert.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setNewMessage(msgContent);
      toast.error(`Failed to send: ${result.error}`);
      return;
    }
    // Drop the optimistic row. The realtime channel will deliver
    // the real INSERT; if it doesn't (channel down), the optimistic
    // row is still good enough — it's a perfect copy of what the
    // server stored.
    setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
  };

  // Either participant of the conversation can delete any message.
  // The action layer talks to the server (which enforces RLS); the
  // realtime channel mirrors the row removal into local state.
  const deleteMessage = async (messageId: string) => {
    if (!user || !activeConv) return;
    if (!window.confirm("Delete this message? This will remove it for both participants.")) {
      return;
    }
    setDeletingId(messageId);
    try {
      const result = await deleteMessageAction(messageId);
      if (!result.success) {
        toast.error(result.error || "Failed to delete message");
        return;
      }
      // Belt-and-braces: drop it from local state immediately. The
      // realtime DELETE listener would also do this, but if the
      // listener drops the event for any reason the user still sees
      // the bubble disappear.
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      // Refresh the sidebar so the conversation's last_message
      // snapshot updates without waiting for the next realtime push.
      await refreshConversations();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  };

  // Empty the entire conversation. Either participant can do this —
  // RLS gates the messages DELETE inside the action. The realtime
  // channel will drop every message locally; we also clear optimistically
  // so the chat area snaps to empty even before the first DELETE event
  // lands. The conversation row itself stays — the sidebar still shows
  // the participant with an empty preview ("Start a conversation…").
  const clearConversation = async () => {
    if (!user || !activeConv) return;
    if (
      !window.confirm(
        "Empty this conversation? All messages will be removed for both participants. This cannot be undone.",
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const result = await clearConversationAction(activeConv.id);
      if (!result.success) {
        toast.error(result.error || "Failed to empty conversation");
        return;
      }
      // Snap the chat area to empty. Realtime DELETEs would also do
      // this, but the batch DELETE fires one event per row and the
      // optimistic clear avoids the user seeing the messages fade out
      // one-by-one.
      setMessages([]);
      await refreshConversations();
      toast.success(
        result.deleted
          ? `Emptied ${result.deleted} message${result.deleted === 1 ? "" : "s"}`
          : "Conversation emptied",
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to empty conversation");
    } finally {
      setClearing(false);
    }
  };

  // Used by the empty-state pane so we can show the participant's
  // name when the user lands via ?userId=… and a conversation is
  // created but not yet selected.
  const previewsOther = activeConv ? getOtherParticipant(activeConv, user?.id) : null;

  return (
    <div className="flex h-[calc(100vh-70px)] bg-white overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeConv={activeConv}
        loading={loading}
        currentUserId={user?.id}
        onSelect={setActiveConv}
      />

      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <ChatWindow
            activeConv={activeConv}
            messages={messages}
            currentUserId={user?.id}
            deletingId={deletingId}
            clearing={clearing}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onSend={sendMessage}
            onDelete={deleteMessage}
            onClear={clearConversation}
          />
        ) : previewsOther && previewsOther.first_name !== "Unknown" ? (
          // A conversation was just created via the ?userId=… flow
          // but state hasn't caught up yet. Show a quick "starting…"
          // pane rather than the generic empty state.
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-xs space-y-4">
              <div className="text-6xl">💬</div>
              <h3 className="text-xl font-bold text-slate-900">
                Starting conversation with {previewsOther.first_name}…
              </h3>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-xs space-y-4">
              <div className="text-6xl">💬</div>
              <h3 className="text-xl font-bold text-slate-900">No Conversation Selected</h3>
              <p className="text-gray-500">
                Select a conversation from the sidebar or start a new one from a product or project page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={<div className="h-screen flex items-center justify-center">Loading chat...</div>}>
      <ChatContent />
    </React.Suspense>
  );
}
