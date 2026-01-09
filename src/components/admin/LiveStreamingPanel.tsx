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
  Video,
  Radio,
  Users,
  Play,
  Pause,
  Monitor,
  Settings,
  Activity,
  Loader2,
  Eye,
  Clock,
} from "lucide-react";

interface ActiveStream {
  id: string;
  taskId: string;
  taskTitle: string;
  voucherName: string;
  startedAt: Date;
  viewers: number;
  status: "live" | "paused" | "ended";
}

interface StreamSettings {
  enableLiveStreaming: boolean;
  autoRecordStreams: boolean;
  maxStreamDuration: number; // minutes
  requireApproval: boolean;
  allowRewatch: boolean;
}

export function LiveStreamingPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeStreams, setActiveStreams] = useState<ActiveStream[]>([]);
  const [settings, setSettings] = useState<StreamSettings>({
    enableLiveStreaming: true,
    autoRecordStreams: true,
    maxStreamDuration: 30,
    requireApproval: false,
    allowRewatch: true,
  });

  useEffect(() => {
    // Simulate loading active streams
    setTimeout(() => {
      setActiveStreams([]);
      setLoading(false);
    }, 1000);
  }, []);

  const updateSettings = (key: keyof StreamSettings, value: boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast({
      title: "Settings Updated",
      description: "Live streaming settings have been saved",
    });
  };

  const formatDuration = (startedAt: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Now</CardTitle>
            <Radio className={`h-4 w-4 ${activeStreams.length > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStreams.filter((s) => s.status === "live").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStreams.reduce((sum, s) => sum + s.viewers, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Streams</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
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
        {/* Active Streams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500" />
              Active Streams
            </CardTitle>
            <CardDescription>Currently live verification streams</CardDescription>
          </CardHeader>
          <CardContent>
            {activeStreams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active streams</p>
                <p className="text-sm mt-1">Streams will appear here when vouchers go live</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {activeStreams.map((stream) => (
                    <Card key={stream.id} className="border-red-500/30">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="animate-pulse">
                                <Radio className="h-3 w-3 mr-1" />
                                LIVE
                              </Badge>
                              <span className="font-medium">{stream.taskTitle}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              By {stream.voucherName}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(stream.startedAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {stream.viewers} viewers
                              </span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Monitor className="h-4 w-4 mr-1" />
                            Watch
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Streaming Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Stream Settings
            </CardTitle>
            <CardDescription>Configure live streaming options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Live Streaming</Label>
                <p className="text-xs text-muted-foreground">Allow vouchers to stream verifications</p>
              </div>
              <Switch
                checked={settings.enableLiveStreaming}
                onCheckedChange={(checked) => updateSettings("enableLiveStreaming", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Record Streams</Label>
                <p className="text-xs text-muted-foreground">Automatically save stream recordings</p>
              </div>
              <Switch
                checked={settings.autoRecordStreams}
                onCheckedChange={(checked) => updateSettings("autoRecordStreams", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Approval</Label>
                <p className="text-xs text-muted-foreground">Admin must approve before going live</p>
              </div>
              <Switch
                checked={settings.requireApproval}
                onCheckedChange={(checked) => updateSettings("requireApproval", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Rewatch</Label>
                <p className="text-xs text-muted-foreground">Let requesters rewatch streams</p>
              </div>
              <Switch
                checked={settings.allowRewatch}
                onCheckedChange={(checked) => updateSettings("allowRewatch", checked)}
              />
            </div>

            <div className="pt-4 border-t">
              <Label>Max Stream Duration: {settings.maxStreamDuration} minutes</Label>
              <input
                type="range"
                min={5}
                max={60}
                value={settings.maxStreamDuration}
                onChange={(e) => updateSettings("maxStreamDuration", parseInt(e.target.value))}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5 min</span>
                <span>60 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
