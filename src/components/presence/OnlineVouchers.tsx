import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PresenceIndicator } from "./PresenceIndicator";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/usePresence";
import { Users, Video, MapPin } from "lucide-react";

interface VoucherProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  trust_score: number | null;
}

export function OnlineVouchers() {
  const { onlineUsers, loading } = usePresence();
  const [profiles, setProfiles] = useState<Record<string, VoucherProfile>>({});

  useEffect(() => {
    const fetchProfiles = async () => {
      const userIds = onlineUsers.map(u => u.user_id);
      if (userIds.length === 0) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, trust_score")
        .in("id", userIds);

      if (data) {
        const profileMap = data.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, VoucherProfile>);
        setProfiles(profileMap);
      }
    };

    fetchProfiles();
  }, [onlineUsers]);

  const activeVouchers = onlineUsers.filter(u => u.status !== "offline");
  const streamingVouchers = onlineUsers.filter(u => u.is_streaming);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Online Vouchers
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600">
              {activeVouchers.length} Online
            </Badge>
            {streamingVouchers.length > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-500">
                <Video className="h-3 w-3 mr-1" />
                {streamingVouchers.length} Live
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeVouchers.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No vouchers online right now
          </p>
        ) : (
          <div className="space-y-3">
            {activeVouchers.map((presence) => {
              const profile = profiles[presence.user_id];
              return (
                <div 
                  key={presence.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile?.full_name?.[0] || "V"}
                        </AvatarFallback>
                      </Avatar>
                      <PresenceIndicator 
                        userId={presence.user_id} 
                        size="sm"
                        className="absolute -bottom-0.5 -right-0.5"
                      />
                    </div>
                    <div>
                      <p className="font-medium">
                        {profile?.full_name || "Anonymous Voucher"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {presence.is_streaming && (
                          <span className="flex items-center gap-1 text-red-500">
                            <Video className="h-3 w-3" />
                            Live
                          </span>
                        )}
                        {presence.current_task_id && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            On Task
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {profile?.trust_score && (
                    <Badge variant="secondary">
                      ★ {profile.trust_score.toFixed(1)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
