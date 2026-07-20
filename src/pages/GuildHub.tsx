import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trophy, Crown, Loader2, Lock, Globe, TrendingUp, Shield } from "lucide-react";

interface Guild {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
  badge_emoji: string;
  badge_color: string;
  total_earnings: number;
  total_tasks: number;
  weekly_earnings: number;
  member_count: number;
  max_members: number;
  is_open: boolean;
  created_at: string;
  leader_name?: string | null;
}

interface MyGuildMembership {
  guild_id: string;
  role: string;
  earnings_contributed: number;
  tasks_contributed: number;
}

const EMOJI_OPTIONS = ["🏛️","⚡","🔥","💎","🦅","🛡️","🌟","🚀","🐉","🦁","🗡️","🏆","🌊","🎯","🌙"];
const COLOR_OPTIONS = ["#8B5CF6","#06B6D4","#10B981","#F59E0B","#EF4444","#EC4899","#3B82F6","#6366F1"];

export default function GuildHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myMembership, setMyMembership] = useState<MyGuildMembership | null>(null);
  const [myGuildId, setMyGuildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    badge_emoji: "🏛️",
    badge_color: "#8B5CF6",
    is_open: true,
  });

  useEffect(() => {
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);

    const [guildsRes, membershipRes, profileRes] = await Promise.all([
      supabase.from("guilds").select("*").order("weekly_earnings", { ascending: false }),
      supabase.from("guild_members").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("guild_id").eq("id", user.id).single(),
    ]);

    const guildsList = (guildsRes.data || []) as Guild[];

    // Enrich with leader names
    if (guildsList.length > 0) {
      const leaderIds = [...new Set(guildsList.map((g) => g.leader_id))];
      const { data: leaders } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", leaderIds);
      const leaderMap = Object.fromEntries((leaders || []).map((l) => [l.id, l.full_name]));
      guildsList.forEach((g) => { g.leader_name = leaderMap[g.leader_id] || null; });
    }

    setGuilds(guildsList);
    setMyMembership(membershipRes.data as MyGuildMembership | null);
    setMyGuildId(profileRes.data?.guild_id || null);
    setLoading(false);
  };

  const handleJoin = async (guildId: string) => {
    if (!user) return;
    if (myGuildId) {
      toast({ title: "Already in a guild", description: "Leave your current guild first.", variant: "destructive" });
      return;
    }
    setJoining(guildId);

    // Check capacity
    const guild = guilds.find((g) => g.id === guildId);
    if (!guild || !guild.is_open) { setJoining(null); return; }
    if (guild.member_count >= guild.max_members) {
      toast({ title: "Guild is full", description: "This guild has reached max members.", variant: "destructive" });
      setJoining(null); return;
    }

    const { error: memberErr } = await supabase.from("guild_members").insert({
      guild_id: guildId,
      user_id: user.id,
      role: "member",
    });
    if (memberErr) {
      toast({ title: "Error joining", description: memberErr.message, variant: "destructive" });
      setJoining(null); return;
    }

    // Update profiles.guild_id
    await supabase.from("profiles").update({ guild_id: guildId }).eq("id", user.id);

    // Update member count
    await supabase.from("guilds")
      .update({ member_count: (guild.member_count || 0) + 1 })
      .eq("id", guildId);

    toast({ title: `Joined ${guild.name}!`, description: "Welcome to the guild." });
    fetchAll();
    setJoining(null);
  };

  const handleLeave = async () => {
    if (!user || !myGuildId) return;
    const guild = guilds.find((g) => g.id === myGuildId);
    if (guild?.leader_id === user.id) {
      toast({ title: "Leader can't leave", description: "Transfer leadership or disband the guild first.", variant: "destructive" });
      return;
    }
    await supabase.from("guild_members").delete().eq("guild_id", myGuildId).eq("user_id", user.id);
    await supabase.from("profiles").update({ guild_id: null }).eq("id", user.id);
    if (guild) {
      await supabase.from("guilds").update({ member_count: Math.max(0, (guild.member_count || 1) - 1) }).eq("id", myGuildId);
    }
    toast({ title: "Left guild" });
    fetchAll();
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (myGuildId) {
      toast({ title: "Already in a guild", description: "Leave your current guild first.", variant: "destructive" });
      return;
    }
    setCreating(true);

    const { data: guildData, error } = await supabase.from("guilds").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      leader_id: user.id,
      badge_emoji: form.badge_emoji,
      badge_color: form.badge_color,
      is_open: form.is_open,
      member_count: 1,
    }).select().single();

    if (error || !guildData) {
      toast({ title: "Failed to create guild", description: error?.message, variant: "destructive" });
      setCreating(false); return;
    }

    // Join as leader
    await supabase.from("guild_members").insert({ guild_id: guildData.id, user_id: user.id, role: "leader" });
    await supabase.from("profiles").update({ guild_id: guildData.id }).eq("id", user.id);

    toast({ title: `Guild "${form.name}" created!`, description: "You're the leader." });
    setCreateOpen(false);
    setForm({ name: "", description: "", badge_emoji: "🏛️", badge_color: "#8B5CF6", is_open: true });
    fetchAll();
    setCreating(false);
  };

  const myGuild = guilds.find((g) => g.id === myGuildId);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container max-w-2xl py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-violet-500" /> Guild Hub
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Team up, compete, earn more together</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/leaderboard")}>
              <Trophy className="h-4 w-4 mr-1 text-yellow-500" /> Rankings
            </Button>
            {!myGuildId && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> Create
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Create a Guild</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Guild Name</Label>
                      <Input
                        placeholder="e.g. Lagos Eagles"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        maxLength={40}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description (optional)</Label>
                      <Textarea
                        placeholder="What's your guild about?"
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        rows={2}
                        maxLength={200}
                      />
                    </div>

                    {/* Emoji picker */}
                    <div className="space-y-1.5">
                      <Label>Badge Emoji</Label>
                      <div className="flex flex-wrap gap-2">
                        {EMOJI_OPTIONS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, badge_emoji: e }))}
                            className={`text-xl rounded-lg p-1.5 border-2 transition-colors ${form.badge_emoji === e ? "border-primary bg-primary/10" : "border-transparent hover:border-muted"}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color picker */}
                    <div className="space-y-1.5">
                      <Label>Badge Color</Label>
                      <div className="flex gap-2">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, badge_color: c }))}
                            className={`h-7 w-7 rounded-full border-2 transition-transform ${form.badge_color === c ? "scale-125 border-foreground" : "border-transparent"}`}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Open/closed */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, is_open: !p.is_open }))}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition-colors ${form.is_open ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {form.is_open ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {form.is_open ? "Open to join" : "Invite only"}
                      </button>
                    </div>

                    <Button className="w-full" onClick={handleCreate} disabled={creating}>
                      {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                      Found Guild
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {/* My Guild Card */}
            {myGuild && (
              <div
                className="rounded-xl p-4 text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${myGuild.badge_color}CC, ${myGuild.badge_color}80)` }}
              >
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                      {myGuild.badge_emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-lg leading-tight">{myGuild.name}</h2>
                        {myGuild.leader_id === user?.id && <Crown className="h-4 w-4 text-yellow-300" />}
                      </div>
                      <p className="text-white/70 text-xs">
                        {myMembership?.role === "leader" ? "Guild Leader" : myMembership?.role === "officer" ? "Officer" : "Member"}
                        {" · "}{myGuild.member_count}/{myGuild.max_members} members
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/15 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold">₦{Number(myMembership?.earnings_contributed || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-white/70">My earnings</p>
                    </div>
                    <div className="bg-white/15 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold">{myMembership?.tasks_contributed || 0}</p>
                      <p className="text-[10px] text-white/70">My tasks</p>
                    </div>
                    <div className="bg-white/15 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold">₦{Number(myGuild.weekly_earnings).toLocaleString()}</p>
                      <p className="text-[10px] text-white/70">Guild/wk</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-8 bg-white/20 hover:bg-white/30 text-white border-0 flex-1"
                      onClick={handleLeave}
                      disabled={myGuild.leader_id === user?.id}
                    >
                      Leave Guild
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Guild List */}
            {guilds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-semibold mb-1">No guilds yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Be the first to create one!</p>
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Create Guild
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All Guilds</h2>
                  <span className="text-xs text-muted-foreground">{guilds.length} guilds</span>
                </div>
                <div className="space-y-2">
                  {guilds.map((g, idx) => {
                    const isMine = g.id === myGuildId;
                    const isFull = g.member_count >= g.max_members;
                    const canJoin = !myGuildId && g.is_open && !isFull;
                    return (
                      <Card key={g.id} className={isMine ? "border-2" : ""} style={isMine ? { borderColor: g.badge_color + "80" } : {}}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Rank badge */}
                            <div className="text-sm font-bold text-muted-foreground w-5 text-center shrink-0">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                            </div>

                            {/* Guild badge */}
                            <div
                              className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                              style={{ background: `${g.badge_color}20`, border: `1px solid ${g.badge_color}50` }}
                            >
                              {g.badge_emoji}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm truncate">{g.name}</p>
                                {g.leader_id === user?.id && <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                                {!g.is_open && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                Led by {g.leader_name || "Unknown"} · {g.member_count}/{g.max_members} members
                              </p>
                              {g.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{g.description}</p>
                              )}
                            </div>

                            {/* Stats + action */}
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-green-600">₦{Number(g.weekly_earnings).toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground mb-1.5">this week</p>
                              {isMine ? (
                                <Badge variant="outline" style={{ borderColor: g.badge_color, color: g.badge_color }} className="text-[10px] px-1.5">
                                  My Guild
                                </Badge>
                              ) : canJoin ? (
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs"
                                  onClick={() => handleJoin(g.id)}
                                  disabled={joining === g.id}
                                >
                                  {joining === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Join"}
                                </Button>
                              ) : isFull ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5">Full</Badge>
                              ) : !g.is_open ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5">Closed</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5">In Guild</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
