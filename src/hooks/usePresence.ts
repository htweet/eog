import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PresenceUser {
  user_id: string;
  status: "online" | "away" | "busy" | "offline";
  current_task_id: string | null;
  last_seen: string;
  is_streaming: boolean;
}

export function usePresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all online users
  const fetchPresence = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("user_presence")
      .select("*")
      .neq("status", "offline");

    if (!error && data) {
      setOnlineUsers(data as PresenceUser[]);
    }
    setLoading(false);
  }, []);

  // Update current user's presence
  const updatePresence = useCallback(async (
    status: "online" | "away" | "busy" | "offline",
    currentTaskId?: string | null,
    isStreaming?: boolean
  ) => {
    if (!user) return;

    const { error } = await (supabase as any)
      .from("user_presence")
      .upsert({
        user_id: user.id,
        status,
        current_task_id: currentTaskId ?? null,
        last_seen: new Date().toISOString(),
        is_streaming: isStreaming ?? false,
      }, {
        onConflict: "user_id"
      });

    if (error) {
      console.error("Error updating presence:", error);
    }
  }, [user]);

  // Set user as offline
  const goOffline = useCallback(async () => {
    if (!user) return;
    await updatePresence("offline");
  }, [user, updatePresence]);

  // Check if a specific user is online
  const isUserOnline = useCallback((userId: string) => {
    const presence = onlineUsers.find(p => p.user_id === userId);
    return presence?.status === "online" || presence?.status === "busy";
  }, [onlineUsers]);

  // Get user's presence status
  const getUserPresence = useCallback((userId: string) => {
    return onlineUsers.find(p => p.user_id === userId);
  }, [onlineUsers]);

  // Initial setup and realtime subscription
  useEffect(() => {
    fetchPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel("presence-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        () => {
          fetchPresence();
        }
      )
      .subscribe();

    // Set current user online when hook mounts
    if (user) {
      updatePresence("online");
    }

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(() => {
      if (user) {
        updatePresence("online");
      }
    }, 30000); // Every 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(heartbeat);
      goOffline();
      supabase.removeChannel(channel);
    };
  }, [user, fetchPresence, updatePresence, goOffline]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence("away");
      } else {
        updatePresence("online");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updatePresence]);

  return {
    onlineUsers,
    loading,
    updatePresence,
    goOffline,
    isUserOnline,
    getUserPresence,
  };
}
