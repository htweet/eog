import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import {
  Video,
  VideoOff,
  Radio,
  Users,
  StopCircle,
  Settings,
  Mic,
  MicOff,
  Camera,
  CameraOff,
} from "lucide-react";

interface WebRTCStreamProps {
  taskId: string;
  taskTitle: string;
  mode: "broadcast" | "watch";
  onStreamEnd?: (recordingUrl?: string) => void;
}

export function WebRTCStream({ taskId, taskTitle, mode, onStreamEnd }: WebRTCStreamProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { streamConfig } = usePlatformSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoRecord, setAutoRecord] = useState(streamConfig.autoRecordStreams);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [streamId, setStreamId] = useState<string | null>(null);

  const streamingEnabled = streamConfig.enableLiveStreaming;
  const maxDurationSeconds = streamConfig.maxStreamDuration * 60;
  
  // Timer for stream duration
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamDuration((prev) => {
          const next = prev + 1;
          // Auto-stop when max duration reached
          if (next >= maxDurationSeconds) {
            stopStream();
            toast({ title: "Stream Ended", description: `Maximum duration of ${streamConfig.maxStreamDuration} minutes reached.` });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreaming, maxDurationSeconds]);

  // Real-time viewer count updates
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`stream-${streamId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && mode === 'watch') {
          await channel.track({ user_id: user?.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, mode, user]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startStream = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: true,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create live stream record in database
      const { data: streamData, error } = await supabase
        .from("live_streams")
        .insert({
          task_id: taskId,
          voucher_id: user?.id,
          status: "live",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      setStreamId(streamData.id);
      setIsStreaming(true);

      // Auto-start recording if enabled
      if (autoRecord) {
        startRecording(stream);
      }

      toast({
        title: "Stream Started",
        description: "You are now live!",
      });
    } catch (error) {
      console.error("Error starting stream:", error);
      toast({
        title: "Stream Failed",
        description: "Could not access camera/microphone",
        variant: "destructive",
      });
    }
  };

  const startRecording = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopStream = async () => {
    let recordingUrl: string | undefined;

    // Stop recording and save
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Wait for final data
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Create video blob and upload
      if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        
        // Upload to Supabase storage
        const fileName = `stream-${streamId}-${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("verification-videos")
          .upload(fileName, blob);

        if (!uploadError && uploadData) {
          // Store file path, not public URL (bucket is private)
          recordingUrl = fileName;
        }
      }
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Update stream status in database
    if (streamId) {
      await supabase
        .from("live_streams")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          recording_url: recordingUrl,
        })
        .eq("id", streamId);
    }

    setIsStreaming(false);
    setIsRecording(false);
    setStreamDuration(0);
    
    toast({
      title: "Stream Ended",
      description: recordingUrl ? "Recording saved successfully" : "Stream ended",
    });

    onStreamEnd?.(recordingUrl);
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  if (mode === "watch") {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="h-5 w-5 text-red-500 animate-pulse" />
              Live Stream: {taskTitle}
            </CardTitle>
            <Badge variant="destructive" className="animate-pulse">
              <Radio className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                <Users className="h-4 w-4 text-white" />
                <span className="text-white text-sm">{viewerCount} watching</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isStreaming ? (
              <>
                <Radio className="h-5 w-5 text-red-500 animate-pulse" />
                Streaming: {taskTitle}
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                Start Live Stream
              </>
            )}
          </CardTitle>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {formatDuration(streamDuration)}
              </Badge>
              <Badge variant="destructive" className="animate-pulse">
                <Radio className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {isStreaming ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                  <Users className="h-4 w-4 text-white" />
                  <span className="text-white text-sm">{viewerCount} watching</span>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2 bg-red-500 rounded-full px-3 py-1">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-sm">REC</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Video className="h-16 w-16 mb-4 opacity-50" />
              <p>Camera preview will appear here</p>
            </div>
          )}
        </div>

        {/* Stream Controls */}
        {isStreaming ? (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isCameraOn ? "outline" : "destructive"}
              size="icon"
              onClick={toggleCamera}
            >
              {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </Button>
            <Button
              variant={isMicOn ? "outline" : "destructive"}
              size="icon"
              onClick={toggleMic}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button variant="destructive" onClick={stopStream}>
              <StopCircle className="h-5 w-5 mr-2" />
              End Stream
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-0.5">
                <Label>Auto-Record Stream</Label>
                <p className="text-xs text-muted-foreground">
                  Save recording for verification
                </p>
              </div>
              <Switch checked={autoRecord} onCheckedChange={setAutoRecord} />
            </div>
            <Button className="w-full" size="lg" onClick={startStream} disabled={!streamingEnabled}>
              <Radio className="h-5 w-5 mr-2" />
              {streamingEnabled ? "Go Live" : "Streaming Disabled"}
            </Button>
            {!streamingEnabled && (
              <p className="text-xs text-muted-foreground text-center">Live streaming has been disabled by the administrator.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
