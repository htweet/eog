import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useChat(taskId: string, otherUserId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  // Fetch participant profiles
  const fetchProfiles = useCallback(async () => {
    if (!user || !otherUserId) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", [user.id, otherUserId]);

    if (data) {
      const profileMap = data.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profileMap);
    }
  }, [user, otherUserId]);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!taskId || !user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const enrichedMessages = data.map((msg) => ({
        ...msg,
        sender_name: profiles[msg.sender_id]?.full_name || "Unknown",
        sender_avatar: profiles[msg.sender_id]?.avatar_url || undefined,
      }));
      setMessages(enrichedMessages);
    }
    setLoading(false);
  }, [taskId, user, profiles]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !otherUserId || !taskId || !content.trim()) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      task_id: taskId,
      sender_id: user.id,
      receiver_id: otherUserId,
      content: content.trim(),
    });

    if (error) {
      toast.error("Failed to send message");
    }
    setSending(false);
  }, [user, otherUserId, taskId]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!user || !taskId) return;

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("task_id", taskId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  }, [user, taskId]);

  // Fetch profiles and messages on mount
  useEffect(() => {
    if (!taskId || !user) return;
    fetchProfiles();
    fetchMessages();
  }, [taskId, user, otherUserId]);

  // Set up realtime subscription (separate effect to avoid re-renders)
  useEffect(() => {
    if (!taskId || !user) return;

    let retryTimeout: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`chat:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Mark as read if received
          if (newMsg.receiver_id === user.id) {
            markAsRead();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("disconnected");
          retryTimeout = setTimeout(() => channel.subscribe(), 3000);
        } else if (status === "CLOSED") {
          setConnectionStatus("disconnected");
        }
      });

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      supabase.removeChannel(channel);
    };
  }, [taskId, user]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    connectionStatus,
    profiles,
    unreadCount: messages.filter((m) => m.receiver_id === user?.id && !m.is_read).length,
  };
}
