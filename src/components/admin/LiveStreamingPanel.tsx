import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Video, Radio, Users, Monitor, Settings, Activity, Loader2, Eye, Clock, StopCircle,
} from "lucide-react";

interface LiveStreamDB {
  id: string;
  task_id: string;
  voucher_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number | null;
  recording_url: string | null;
  task?: { title: string } | null;
  voucher?: { full_name: string | null } | null;
}

interface StreamSettings {
  enableLiveStreaming: boolean;
  autoRecordStreams: boolean;
  maxStreamDuration: number;
  requireApproval: boolean;
  allowRewatch: boolean;
}

export function LiveStreamingPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<LiveStreamDB[]>([]);
  const [settings, setSettings] = useState<StreamSettings>({
    enableLiveStreaming: true,
    autoRecordStreams: true,
    maxStreamDuration: 30,
    requireApproval: false,
    allowRewatch: true,
  });

  useEffect(() => {
    fetchStreams();

    // Real-time subscription for live stream updates
    const channel = supabase
      .channel("admin-streams")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        fetchStreams();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select(`*, task:tasks!live_streams_task_id_fkey (title), voucher:profiles!live_streams_voucher_id_fkey (full_name)`)
      .order("started_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setStreams(data.map(s => ({
        ...s,
        task: Array.isArray(s.task) ? s.task[0] : s.task,
        voucher: Array.isArray(s.voucher) ? s.voucher[0] : s.voucher,
      })));
    }
    setLoading(false);
  };

  const endStream = async (streamId: string) => {
    await supabase.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", streamId);
    toast({ title: "Stream Ended", description: "The stream has been terminated" });
    fetchStreams();
  };

  const updateSetting = (key: keyof StreamSettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({ title: "Settings Updated" });
  };

  const activeStreams = streams.filter(s => s.status === "live");
  const endedStreams = streams.filter(s => s.status === "ended");
  const todayStreams = streams.filter(s => {
    if (!s.started_at) return false;
    return new Date(s.started_at).toDateString() === new Date().toDateString();
  });

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return "--";
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const diff = Math.floor((e - s) / 1000);
    const m = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Now</CardTitle>
            <Radio className={`h-4 w-4 ${activeStreams.length > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeStreams.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeStreams.reduce((s, st) => s + (st.viewer_count || 0), 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Streams</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{todayStreams.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className={`h-4 w-4 ${settings.enableLiveStreaming ? "text-green-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${settings.enableLiveStreaming ? "text-green-500" : "text-muted-foreground"}`}>
              {settings.enableLiveStreaming ? "Active" : "Disabled"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active + Recent Streams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-destructive" />Streams</CardTitle>
            <CardDescription>{activeStreams.length} live · {endedStreams.length} ended</CardDescription>
          </CardHeader>
          <CardContent>
            {streams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No streams yet</p>
                <p className="text-sm mt-1">Streams will appear here when vouchers go live</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {streams.map((stream) => (
                    <Card key={stream.id} className={stream.status === "live" ? "border-destructive/30" : "border-border/50"}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {stream.status === "live" ? (
                                <Badge variant="destructive" className="animate-pulse text-xs">
                                  <Radio className="h-3 w-3 mr-1" />LIVE
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Ended</Badge>
                              )}
                              <span className="font-medium text-sm truncate">{stream.task?.title || "Unknown Task"}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">By {stream.voucher?.full_name || "Unknown"}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(stream.started_at, stream.ended_at)}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stream.viewer_count || 0}</span>
                              {stream.recording_url && <span className="text-primary">📹 Recorded</span>}
                            </div>
                          </div>
                          {stream.status === "live" && (
                            <Button size="sm" variant="destructive" onClick={() => endStream(stream.id)} className="ml-2">
                              <StopCircle className="h-4 w-4 mr-1" />End
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Stream Settings</CardTitle>
            <CardDescription>Configure live streaming options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {([
              { key: "enableLiveStreaming" as const, label: "Enable Live Streaming", desc: "Allow vouchers to stream" },
              { key: "autoRecordStreams" as const, label: "Auto-Record Streams", desc: "Save stream recordings" },
              { key: "requireApproval" as const, label: "Require Approval", desc: "Admin approval before going live" },
              { key: "allowRewatch" as const, label: "Allow Rewatch", desc: "Let requesters rewatch streams" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={settings[key] as boolean} onCheckedChange={(c) => updateSetting(key, c)} />
              </div>
            ))}
            <div className="pt-4 border-t">
              <Label>Max Duration: {settings.maxStreamDuration} min</Label>
              <input type="range" min={5} max={60} value={settings.maxStreamDuration}
                onChange={(e) => updateSetting("maxStreamDuration", parseInt(e.target.value))} className="w-full mt-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>5 min</span><span>60 min</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
