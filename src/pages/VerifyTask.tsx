import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { VideoRecorder } from "@/components/verification/VideoRecorder";
import { ChecklistProgress } from "@/components/verification/ChecklistProgress";
import { VerificationSummary } from "@/components/verification/VerificationSummary";
import { WebRTCStream } from "@/components/streaming/WebRTCStream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Video,
  CheckSquare,
  Send,
  Loader2,
  MapPin,
  Radio,
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

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface CompletedItem {
  id: number;
  checked: boolean;
  notes?: string;
}

export default function VerifyTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("video");

  // Verification data
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [completedItems, setCompletedItems] = useState<CompletedItem[]>([]);
  const [showLiveStream, setShowLiveStream] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTask();
    }
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

    // Verify this user is the assigned voucher
    if (data.voucher_id !== user?.id) {
      toast({
        title: "Unauthorized",
        description: "You are not assigned to this task",
        variant: "destructive",
      });
      navigate("/browse");
      return;
    }

    // Verify task is in assigned status
    if (data.status !== "assigned") {
      toast({
        title: "Invalid Status",
        description: "This task cannot be verified at this time",
        variant: "destructive",
      });
      navigate(`/task/${id}`);
      return;
    }

    const taskData = {
      ...data,
      checklist: data.checklist as Task["checklist"],
    };
    setTask(taskData);
    setLoading(false);
  };

  const handleVideoRecorded = (blob: Blob, gps: GPSData | null) => {
    setVideoBlob(blob);
    if (gps) {
      setGpsData(gps);
    }
    toast({
      title: "Video recorded!",
      description: "You can now proceed to the checklist",
    });
    setActiveTab("checklist");
  };

  const handleSubmit = async () => {
    if (!task || !videoBlob || !gpsData) return;

    setSubmitting(true);

    try {
      // Upload video to storage
      const fileName = `${task.id}/${Date.now()}.webm`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("verification-videos")
        .upload(fileName, videoBlob, {
          contentType: "video/webm",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Store the file path (not a public URL) since bucket is private
      const videoPath = fileName;

      // Create verification record
      const { error: verificationError } = await supabase
        .from("verifications")
        .insert([{
          task_id: task.id,
          video_url: videoPath,
          gps_latitude: gpsData.latitude,
          gps_longitude: gpsData.longitude,
          device_timestamp: gpsData.timestamp.toISOString(),
          completed_checklist: completedItems as any,
        }]);

      if (verificationError) {
        throw new Error(`Verification creation failed: ${verificationError.message}`);
      }

      // Update task status to pending_review
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: "pending_review" })
        .eq("id", task.id);

      if (taskError) {
        throw new Error(`Task update failed: ${taskError.message}`);
      }

      // Notify the requester about the verification submission
      await supabase
        .from("notifications")
        .insert({
          user_id: task.requester_id,
          type: "verification_submitted",
          title: "Verification Submitted",
          message: `A voucher has submitted verification for "${task.title}"`,
          task_id: task.id,
        });

      toast({
        title: "Verification submitted!",
        description: "The requester will review your submission",
      });

      navigate(`/task/${task.id}`);
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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

  const checklist = task.checklist || [];
  const requiredItems = checklist.filter(item => item.required);
  const requiredCompleted = requiredItems.filter(item =>
    completedItems.find(c => c.id === item.id && c.checked)
  ).length;
  const allRequiredComplete = requiredItems.length === requiredCompleted || requiredItems.length === 0;

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

        {/* Task info header */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-semibold truncate">{task.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{task.address}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xl font-bold text-primary">
                  <span className="text-lg">₦</span>
                  {task.bounty_amount.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Go Live Button */}
        <Dialog open={showLiveStream} onOpenChange={setShowLiveStream}>
          <DialogTrigger asChild>
            <Button 
              variant={isStreaming ? "destructive" : "default"}
              className={`w-full mb-6 gap-2 ${!isStreaming ? 'bg-red-600 hover:bg-red-700' : ''}`}
              size="lg"
            >
              <Radio className={`h-5 w-5 ${isStreaming ? 'animate-pulse' : ''}`} />
              {isStreaming ? "Live Streaming..." : "Go Live for Requester"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Live Stream to Requester</DialogTitle>
            </DialogHeader>
            <WebRTCStream
              taskId={task.id}
              taskTitle={task.title}
              mode="broadcast"
              onStreamEnd={() => {
                setShowLiveStream(false);
                setIsStreaming(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Verification steps */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="video" className="gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Record</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </TabsTrigger>
            <TabsTrigger value="submit" className="gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Submit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video">
            <VideoRecorder
              onVideoRecorded={handleVideoRecorded}
              minDuration={10}
              maxDuration={120}
            />
          </TabsContent>

          <TabsContent value="checklist">
            <ChecklistProgress
              checklist={checklist}
              completedItems={completedItems}
              onItemChange={setCompletedItems}
            />
            {videoBlob && allRequiredComplete && (
              <Button
                className="w-full mt-4"
                onClick={() => setActiveTab("submit")}
              >
                Continue to Submit
              </Button>
            )}
          </TabsContent>

          <TabsContent value="submit">
            <VerificationSummary
              videoBlob={videoBlob}
              gpsData={gpsData}
              completedItems={completedItems}
              checklist={checklist}
              taskTitle={task.title}
              bountyAmount={task.bounty_amount}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
