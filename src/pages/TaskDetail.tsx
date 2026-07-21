import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskCompletionBanner } from "@/components/task/TaskCompletionBanner";
import { CertificateDownloadButton } from "@/components/certificate/CertificateDownloadButton";
import { ReviewsList } from "@/components/review/ReviewsList";
import { WebRTCStream } from "@/components/streaming/WebRTCStream";
import { TaskChat } from "@/components/chat/TaskChat";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  User,
  CheckCircle2,
  Circle,
  Loader2,
  Car,
  Home,
  Smartphone,
  Package,
  Navigation,
  Star,
  Radio,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  bounty_amount: number;
  address: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  requester_id: string;
  voucher_id: string | null;
  checklist: { id: number; label: string; required: boolean }[] | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  auto: <Car className="h-5 w-5" />,
  realestate: <Home className="h-5 w-5" />,
  electronics: <Smartphone className="h-5 w-5" />,
  general: <Package className="h-5 w-5" />,
};

const categoryLabels: Record<string, string> = {
  auto: "Automobiles",
  realestate: "Real Estate",
  electronics: "Electronics",
  general: "General Items",
};

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  assigned: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  pending_review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  disputed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [requester, setRequester] = useState<Profile | null>(null);
  const [voucher, setVoucher] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [liveStream, setLiveStream] = useState<{ id: string } | null>(null);
  const [showLiveStream, setShowLiveStream] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTask();
      checkLiveStream();
    }
  }, [id]);

  const checkLiveStream = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from("live_streams")
      .select("id")
      .eq("task_id", id)
      .eq("status", "live")
      .maybeSingle();
    
    setLiveStream(data);
  };

  // Subscribe to live stream updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`task-stream-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
          filter: `task_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || (payload.eventType === "UPDATE" && payload.new.status === "live")) {
            setLiveStream({ id: payload.new.id as string });
          } else if (payload.eventType === "UPDATE" && payload.new.status === "ended") {
            setLiveStream(null);
            setShowLiveStream(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchTask = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching task:", error);
      toast({
        title: "Error",
        description: "Task not found",
        variant: "destructive",
      });
      navigate("/browse");
      return;
    }

    // Type assertion for checklist
    const taskData = {
      ...data,
      checklist: data.checklist as Task["checklist"],
    };
    setTask(taskData);

    // Fetch requester profile
    const { data: requesterData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.requester_id)
      .maybeSingle();
    
    if (requesterData) setRequester(requesterData);

    // Fetch voucher profile if assigned
    if (data.voucher_id) {
      const { data: voucherData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.voucher_id)
        .maybeSingle();
      
      if (voucherData) setVoucher(voucherData);
    }

    setLoading(false);
  };

  const claimTask = async () => {
    if (!user || !task || userRole !== "voucher") return;

    setClaiming(true);

    try {
      // Use secure RPC function for atomic task claiming
      const { data, error } = await supabase.rpc('claim_task_secure', {
        p_task_id: task.id
      });

      const result = data as { success?: boolean; error?: string } | null;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to claim task. Please try again.",
          variant: "destructive",
        });
      } else if (result?.success) {
        toast({
          title: "Task claimed!",
          description: "You can now proceed with the verification",
        });
        fetchTask();
      } else {
        toast({
          title: "Error",
          description: result?.error || "Failed to claim task. It may have been claimed by someone else.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }

    setClaiming(false);
  };

  const openInMaps = () => {
    if (task?.latitude && task?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`,
        "_blank"
      );
    } else if (task?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address)}`,
        "_blank"
      );
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const isRequester = user?.id === task.requester_id;
  const isVoucher = user?.id === task.voucher_id;
  const canClaim = userRole === "voucher" && task.status === "open" && !isRequester;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container max-w-3xl py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Header Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {categoryIcons[task.category]}
                </div>
                <div>
                  <Badge className={statusColors[task.status]} variant="outline">
                    {task.status.replace("_", " ").toUpperCase()}
                  </Badge>
                  <CardTitle className="mt-1">{task.title}</CardTitle>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                  <span className="text-lg">₦</span>
                  {task.bounty_amount.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Bounty</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                {categoryIcons[task.category]}
                <span>{categoryLabels[task.category]}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{getTimeAgo(task.created_at)}</span>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-4">
              <MapPin className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{task.address}</p>
                {task.latitude && task.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.latitude.toFixed(6)}, {task.longitude.toFixed(6)}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={openInMaps} className="gap-2">
                <Navigation className="h-4 w-4" />
                Navigate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* People involved */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Requester */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Requester</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={requester?.avatar_url || undefined} />
                  <AvatarFallback>
                    {requester?.full_name?.[0]?.toUpperCase() || "R"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{requester?.full_name || "Anonymous"}</p>
                  {requester?.is_verified && (
                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voucher */}
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Voucher</CardDescription>
            </CardHeader>
            <CardContent>
              {voucher ? (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={voucher.avatar_url || undefined} />
                    <AvatarFallback>
                      {voucher.full_name?.[0]?.toUpperCase() || "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{voucher.full_name || "Anonymous"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Trust: {voucher.trust_score?.toFixed(1)}</span>
                      {voucher.is_verified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5" />
                  </div>
                  <p className="text-sm">Not yet assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Watch Live Button for Requesters */}
        {isRequester && task.status === "assigned" && liveStream && (
          <Dialog open={showLiveStream} onOpenChange={setShowLiveStream}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                className="w-full mb-6 gap-2 bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <Radio className="h-5 w-5 animate-pulse" />
                Watch Live Stream
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Live Verification Stream</DialogTitle>
              </DialogHeader>
              <WebRTCStream
                taskId={task.id}
                taskTitle={task.title}
                mode="watch"
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Live Stream Available Indicator */}
        {isRequester && task.status === "assigned" && !liveStream && (
          <Card className="mb-6 border-dashed">
            <CardContent className="flex items-center justify-center py-6 text-muted-foreground">
              <Radio className="h-5 w-5 mr-2" />
              <span>Waiting for voucher to start live stream...</span>
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        {task.checklist && task.checklist.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Verification Checklist</CardTitle>
              <CardDescription>
                Items to verify during the inspection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {task.checklist.map((item, index) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{item.label}</p>
                      {item.required && (
                        <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Status Banner */}
        {(task.status === "completed" || task.status === "disputed" || task.status === "pending_review") && (
          <TaskCompletionBanner
            status={task.status}
            bountyAmount={task.bounty_amount}
            isRequester={isRequester}
            isVoucher={isVoucher}
            taskId={task.id}
          />
        )}

        {/* Actions for other statuses */}
        {task.status !== "completed" && task.status !== "disputed" && task.status !== "pending_review" && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {canClaim && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={claimTask}
                  disabled={claiming}
                >
                  {claiming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    "Claim This Task"
                  )}
                </Button>
              )}

              {isVoucher && task.status === "assigned" && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate(`/task/${task.id}/verify`)}
                >
                  Start Verification
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chat Section - available when task has a voucher assigned */}
        {(task.status === "assigned" || task.status === "pending_review") && (isRequester || isVoucher) && (
          <div className="mt-6">
            <TaskChat
              taskId={task.id}
              otherUserId={isRequester ? task.voucher_id : task.requester_id}
              otherUserName={isRequester ? voucher?.full_name || "Voucher" : requester?.full_name || "Requester"}
            />
          </div>
        )}

        {/* Certificate Download for completed tasks */}
        {task.status === "completed" && (isRequester || isVoucher) && (
          <div className="mt-4">
            <CertificateDownloadButton taskId={task.id} size="default" className="w-full" />
          </div>
        )}

        {/* Reviews Section (for completed tasks) */}
        {task.status === "completed" && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5" />
                Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewsList taskId={task.id} />
            </CardContent>
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
