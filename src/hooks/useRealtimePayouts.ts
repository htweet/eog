import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimePayouts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('payout-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payout_requests',
        },
        (payload) => {
          console.log('Payout request realtime update:', payload);
          // Invalidate the admin payouts query to refetch
          queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
