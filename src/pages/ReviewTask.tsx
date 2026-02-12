import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  DollarSign,
  Video,
  Clock,
  Navigation,
  Loader2,
  Star,
  Check,
  X,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  bounty_amount: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  requester_id: string;
  voucher_id: string | null;
  checklist: { id: number; label: string; required: boolean }[] | null;
}

interface Verification {
  id: string;
  task_id: string;
  video_url: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  device_timestamp: string | null;
  submitted_at: string | null;
  completed_checklist: { id: number; checked: boolean; notes?: string }[] | null;
  ai_analysis_score: number | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
}

export default function ReviewTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [voucher, setVoucher] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    if (!id) return;

    // Fetch task
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (taskError || !taskData) {
      toast({
        title: "Error",
        description: "Task not found",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Verify this user is the requester
    if (taskData.requester_id !== user?.id) {
      toast({
        title: "Unauthorized",
        description: "You are not the requester of this task",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Verify task is pending review
    if (taskData.status !== "pending_review") {
      toast({
        title: "Invalid Status",
        description: "This task is not pending review",
        variant: "destructive",
      });
      navigate(`/task/${id}`);
      return;
    }

    const formattedTask = {
      ...taskData,
      checklist: taskData.checklist as Task["checklist"],
    };
    setTask(formattedTask);

    // Fetch verification
    const { data: verificationData, error: verificationError } = await supabase
      .from("verifications")
      .select("*")
      .eq("task_id", id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verificationError || !verificationData) {
      toast({
        title: "Error",
        description: "Verification not found",
        variant: "destructive",
      });
      return;
    }

    setVerification({
      ...verificationData,
      completed_checklist: verificationData.completed_checklist as Verification["completed_checklist"],
    });

    // Fetch voucher profile
    if (taskData.voucher_id) {
      const { data: voucherData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", taskData.voucher_id)
        .maybeSingle();
      
      if (voucherData) setVoucher(voucherData);
    }

    setLoading(false);
  };

  const handleApprove = async () => {
    if (!task || !verification) return;
    setProcessing(true);

    try {
      // Update task status to completed
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", task.id);

      if (taskError) throw taskError;

      // Create review
      const { error: reviewError } = await supabase
        .from("reviews")
        .insert({
          task_id: task.id,
          reviewer_id: user!.id,
          rating: rating,
          comment: reviewComment || null,
        });

      if (reviewError) throw reviewError;

      // Release escrow to voucher using secure RPC
      if (task.voucher_id) {
        const { data: escrowResult, error: escrowError } = await supabase.rpc("release_escrow", {
          p_task_id: task.id,
          p_voucher_id: task.voucher_id,
        });

        if (escrowError) {
          console.warn("Escrow release failed, falling back to manual transfer:", escrowError);
          // Fallback: create transaction record manually
          await supabase
            .from("transactions")
            .insert({
              user_id: task.voucher_id,
              task_id: task.id,
              type: "bounty_earned",
              amount: task.bounty_amount,
              status: "completed",
              description: `Bounty earned for task: ${task.title}`,
            });
        }

        // Create notifications for voucher
        await supabase
          .from("notifications")
          .insert({
            user_id: task.voucher_id,
            type: "payment_received",
            title: "Payment Received!",
            message: `You earned ₦${task.bounty_amount.toLocaleString()} for completing "${task.title}"`,
            task_id: task.id,
          });

        await supabase
          .from("notifications")
          .insert({
            user_id: task.voucher_id,
            type: "review_received",
            title: "New Review",
            message: `You received a ${rating}-star review`,
            task_id: task.id,
          });
      }

      toast({
        title: "Task approved!",
        description: `The voucher has been paid ₦${task.bounty_amount.toLocaleString()}`,
      });

      navigate(`/task/${task.id}`);
    } catch (error) {
      console.error("Approval error:", error);
      toast({
        title: "Error",
        description: "Failed to approve task",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowApproveDialog(false);
    }
  };

  const handleDispute = async () => {
    if (!task || !disputeReason.trim()) return;
    setProcessing(true);

    try {
      // Update task status to disputed
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: "disputed" })
        .eq("id", task.id);

      if (taskError) throw taskError;

      // Create a review with low rating and dispute reason
      const { error: reviewError } = await supabase
        .from("reviews")
        .insert({
          task_id: task.id,
          reviewer_id: user!.id,
          rating: 1,
          comment: `DISPUTE: ${disputeReason}`,
        });

      if (reviewError) throw reviewError;

      // Notify the voucher about the dispute
      if (task.voucher_id) {
        await supabase
          .from("notifications")
          .insert({
            user_id: task.voucher_id,
            type: "task_disputed",
            title: "Task Disputed",
            message: `Your verification for "${task.title}" has been disputed`,
            task_id: task.id,
          });
      }

      toast({
        title: "Task disputed",
        description: "The dispute has been filed and will be reviewed",
      });

      navigate(`/task/${task.id}`);
    } catch (error) {
      console.error("Dispute error:", error);
      toast({
        title: "Error",
        description: "Failed to file dispute",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowDisputeDialog(false);
    }
  };

  const calculateGPSDistance = () => {
    if (!task?.latitude || !task?.longitude || !verification?.gps_latitude || !verification?.gps_longitude) {
      return null;
    }
    
    const R = 6371000; // Earth's radius in meters
    const dLat = (verification.gps_latitude - task.latitude) * Math.PI / 180;
    const dLon = (verification.gps_longitude - task.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(task.latitude * Math.PI / 180) * Math.cos(verification.gps_latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const gpsDistance = calculateGPSDistance();
  const gpsVerified = gpsDistance !== null && gpsDistance < 100; // Within 100 meters

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

  if (!task || !verification) {
    return null;
  }

  const checklist = task.checklist || [];
  const completedItems = verification.completed_checklist || [];
  const requiredItems = checklist.filter(item => item.required);
  const requiredCompleted = requiredItems.filter(item =>
    completedItems.find(c => c.id === item.id && c.checked)
  ).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container max-w-3xl py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate(`/task/${task.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Task
        </Button>

        {/* Task Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-blue-500/10 text-blue-500 border-blue-500/20" variant="outline">
                  PENDING REVIEW
                </Badge>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4" />
                  {task.address}
                </CardDescription>
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
        </Card>

        {/* Voucher Info */}
        {voucher && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardDescription>Verified by</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={voucher.avatar_url || undefined} />
                  <AvatarFallback>
                    {voucher.full_name?.[0]?.toUpperCase() || "V"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{voucher.full_name || "Anonymous"}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Trust Score: {voucher.trust_score?.toFixed(1) || "5.0"}
                    {voucher.is_verified && (
                      <Badge variant="secondary" className="text-xs">Verified</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Review */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="h-5 w-5" />
              Verification Video
            </CardTitle>
            <CardDescription>
              Submitted {verification.submitted_at ? new Date(verification.submitted_at).toLocaleString() : "recently"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <video
                src={verification.video_url}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          </CardContent>
        </Card>

        {/* GPS Verification */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Navigation className="h-5 w-5" />
              Location Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {gpsVerified ? (
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {gpsVerified ? "Location Verified" : "Location Check"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {gpsDistance !== null
                      ? `${Math.round(gpsDistance)}m from task location`
                      : "GPS data not available"}
                  </p>
                </div>
              </div>
              {verification.gps_latitude && verification.gps_longitude && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(
                    `https://www.google.com/maps?q=${verification.gps_latitude},${verification.gps_longitude}`,
                    "_blank"
                  )}
                >
                  View on Map
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Checklist Review */}
        {checklist.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Checklist Completion</CardTitle>
              <CardDescription>
                {requiredCompleted}/{requiredItems.length} required items completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checklist.map((item) => {
                  const completed = completedItems.find(c => c.id === item.id);
                  const isChecked = completed?.checked || false;
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        isChecked ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" : "bg-muted/50"
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${isChecked ? "text-green-500" : "text-muted-foreground"}`}>
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        {item.required && (
                          <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                        )}
                        {completed?.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Note: {completed.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Approve Dialog */}
              <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Approve & Pay
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Approve Verification</DialogTitle>
                    <DialogDescription>
                      Rate the voucher's work and release the ${task.bounty_amount} payment.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    {/* Rating */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={`p-1 transition-colors ${
                              star <= rating ? "text-yellow-500" : "text-muted-foreground"
                            }`}
                          >
                            <Star className={`h-8 w-8 ${star <= rating ? "fill-current" : ""}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
                      <Textarea
                        placeholder="Add a comment about the verification..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleApprove} disabled={processing} className="gap-2">
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Confirm & Pay ${task.bounty_amount}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dispute Dialog */}
              <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="lg" className="gap-2">
                    <XCircle className="h-5 w-5" />
                    Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>File a Dispute</DialogTitle>
                    <DialogDescription>
                      Explain why you're disputing this verification. This will be reviewed by our team.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <Textarea
                      placeholder="Describe the issue with this verification..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDispute}
                      disabled={processing || !disputeReason.trim()}
                      className="gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Submit Dispute
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
