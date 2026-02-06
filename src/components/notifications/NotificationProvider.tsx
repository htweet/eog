import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Notification } from "@/hooks/useNotifications";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { showNotification, isGranted } = usePushNotifications();

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications and show toast + push
    const channel = supabase
      .channel('notification-toasts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          
          // Show in-app toast
          toast({
            title: notification.title,
            description: notification.message,
          });

          // Show browser push notification if granted
          if (isGranted && document.hidden) {
            showNotification(notification.title, {
              body: notification.message,
              tag: notification.id,
              data: { url: notification.task_id ? `/task/${notification.task_id}` : '/' },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, showNotification, isGranted]);

  return <>{children}</>;
}
