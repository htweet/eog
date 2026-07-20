import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Zap, Users, Loader2, TrendingUp } from "lucide-react";
import { VouchScoreBadge } from "@/components/voucher/VouchScoreBadge";

interface VoucherRank {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  vouchscore: number;
  voucher_level: string;
  total_tasks_completed: number;
  rank: number;
}

interface GuildRank {
  guild_id: string;
  name: string;
  badge_emoji: string;
  badge_color: string;
  total_earnings: number;
  total_tasks: number;
  weekly_earnings: number;
  member_count: number;
  rank: number;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard() {
  const [vouchers, setVouchers] = useState<VoucherRank[]>([]);
  const [guilds, setGuilds] = useState<GuildRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    const [vRes, gRes] = await Promise.all([
      supabase.rpc("get_voucher_leaderboard"),
      supabase.rpc("get_guild_leaderboard"),
    ]);
    setVouchers((vRes.data || []) as VoucherRank[]);
    setGuilds((gRes.data || []) as GuildRank[]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container max-w-2xl py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" /> Leaderboard
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Top vouchers and guilds this week</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="vouchers">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="vouchers" className="gap-2"><Zap className="h-4 w-4" />Top Vouchers</TabsTrigger>
              <TabsTrigger value="guilds" className="gap-2"><Users className="h-4 w-4" />Top Guilds</TabsTrigger>
            </TabsList>

            <TabsContent value="vouchers">
              {vouchers.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No vouchers ranked yet. Complete tasks to appear here!</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {/* Top 3 podium */}
                  {vouchers.slice(0, 3).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[vouchers[1], vouchers[0], vouchers[2]].filter(Boolean).map((v, i) => {
                        const pos = i === 0 ? 2 : i === 1 ? 1 : 3;
                        const heights = { 1: "pt-0", 2: "pt-6", 3: "pt-8" };
                        return (
                          <div key={v.user_id} className={`flex flex-col items-center text-center ${heights[pos as keyof typeof heights]}`}>
                            <div className="text-2xl mb-1">{MEDAL[pos] || ""}</div>
                            <Avatar className="h-12 w-12 mb-1 ring-2 ring-offset-1 ring-yellow-400">
                              <AvatarFallback className="font-bold">{(v.full_name?.[0] || "?").toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-bold truncate w-full">{v.full_name || "Voucher"}</p>
                            <p className="text-xs text-muted-foreground">{v.vouchscore?.toFixed(0)} pts</p>
                            <VouchScoreBadge score={v.vouchscore || 0} level={v.voucher_level || "bronze"} compact className="mt-1 scale-75 origin-top" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Full list */}
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {vouchers.map((v) => (
                          <div key={v.user_id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 text-center font-bold text-sm text-muted-foreground">
                              {MEDAL[v.rank] || `#${v.rank}`}
                            </div>
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-sm font-bold">{(v.full_name?.[0] || "?").toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{v.full_name || "Anonymous Voucher"}</p>
                              <p className="text-xs text-muted-foreground">{v.total_tasks_completed} tasks completed</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{v.vouchscore?.toFixed(1)}</p>
                              <VouchScoreBadge score={v.vouchscore || 0} level={v.voucher_level || "bronze"} compact />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="guilds">
              {guilds.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No guilds yet. Create one and climb the ranks!</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {guilds.map((g) => (
                          <div key={g.guild_id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 text-center font-bold text-sm text-muted-foreground">
                              {MEDAL[g.rank] || `#${g.rank}`}
                            </div>
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                              style={{ background: `${g.badge_color}20`, border: `1px solid ${g.badge_color}40` }}
                            >
                              {g.badge_emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{g.name}</p>
                              <p className="text-xs text-muted-foreground">{g.member_count} members · {g.total_tasks} tasks</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-green-600">₦{Number(g.weekly_earnings).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">this week</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
