"use client";

import React, { useState, useEffect, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { UserContext } from "@/components/UserContext";
import { toast } from "sonner";
import { Message, Conversation, Profile } from "@/types/chat";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { createConversationAction } from "@/app/actions/chat";

function ChatContent() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const targetUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadConversations();

    if (targetUserId) {
      handleInitiateChat(targetUserId, projectId);
    }
  }, [user, targetUserId, projectId]);

  const handleInitiateChat = async (userId: string, projId?: string | null) => {
    try {
      const result = await createConversationAction(userId, projId || undefined);
      if (result.success && result.conversationId) {
        await loadConversations();
        const conv = conversations.find(c => c.id === result.conversationId);
        if (conv) setActiveConv(conv);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (err: any) {
      toast.error("Failed to start conversation");
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          profiles:participant_ids (
            id, first_name, last_name, avatar_url
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err: any) {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      toast.error("Failed to load messages");
    }
  };

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);

      const channel = supabase
        .channel(`conv-${activeConv.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`,
        }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeConv]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || !user) return;

    const msgContent = newMessage;
    setNewMessage("");

    try {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          content: msgContent,
        });

      if (msgError) throw msgError;

      await supabase
        .from('conversations')
        .update({
          last_message: msgContent,
          last_message_at: new Date().toISOString()
        })
        .eq('id', activeConv.id);

    } catch (err: any) {
      toast.error("Failed to send message");
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    const other = conv.participant_ids.find(id => id !== user?.id);
    const profile = conv.profiles?.find((p: Profile) => p.id === other);
    return profile || { first_name: "Unknown", last_name: "" };
  };

  return (
    <div className="flex h-[calc(100vh-70px)] bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white">
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
            conversations.map(conv => {
              const other = getOtherParticipant(conv);
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`p-4 cursor-pointer transition-colors flex items-center gap-3 border-b border-gray-100 ${
                    activeConv?.id === conv.id ? "bg-blue-50 border-l-4 border-l-blue-600" : "hover:bg-gray-100"
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
                    <p className="text-xs text-gray-500 truncate">{conv.last_message || "Start a conversation..."}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {getOtherParticipant(activeConv).first_name[0]}
                </div>
                <h3 className="font-bold text-slate-900">
                  {getOtherParticipant(activeConv).first_name} {getOtherParticipant(activeConv).last_name}
                </h3>
              </div>
              {activeConv.project_id && (
                <Badge variant="info" className="px-3">
                  Project Context: {activeConv.project_id.slice(0, 8)}...
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-md p-3 rounded-2xl text-sm ${
                    msg.sender_id === user?.id
                      ? "bg-blue-600 text-white rounded-tr-none shadow-sm"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none"
                  }`}>
                    {msg.content}
                    <div className={`text-[10px] mt-1 text-right ${msg.sender_id === user?.id ? "text-blue-200" : "text-gray-400"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                Send
              </Button>
            </form>
          </>
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
