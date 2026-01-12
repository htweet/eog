import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
  Circle,
  Maximize2,
  MessageSquare
} from "lucide-react";

interface LiveStreamViewerProps {
  taskId: string;
  isVoucher: boolean;
  onStreamEnd?: () => void;
}

export const LiveStreamViewer = ({ taskId, isVoucher, onStreamEnd }: LiveStreamViewerProps) => {
  const { toast } = useToast();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // ICE servers for WebRTC
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  useEffect(() => {
    // Subscribe to realtime stream updates
    const channel = supabase
      .channel(`stream-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          console.log("Stream update:", payload);
          if (payload.eventType === "UPDATE") {
            const data = payload.new as any;
            setViewerCount(data.viewer_count || 0);
            if (data.status === "ended" && !isVoucher) {
              handleStreamEnd();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      cleanupStream();
    };
  }, [taskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startStream = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate via signaling (Supabase realtime)
          console.log("ICE candidate:", event.candidate);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        setIsConnected(pc.connectionState === "connected");
      };

      // Create offer and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Create stream record in database
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("live_streams").insert({
          task_id: taskId,
          voucher_id: userData.user.id,
          status: "live"
        });
      }

      setIsStreaming(true);
      setStreamDuration(0);
      toast({ title: "Stream started!", description: "You are now live" });

    } catch (error: any) {
      console.error("Error starting stream:", error);
      toast({
        title: "Failed to start stream",
        description: error.message || "Please check camera permissions",
        variant: "destructive"
      });
    }
  };

  const stopStream = async () => {
    await cleanupStream();
    
    // Update stream status in database
    const { error } = await supabase
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("task_id", taskId);

    if (error) {
      console.error("Error updating stream:", error);
    }

    setIsStreaming(false);
    toast({ title: "Stream ended" });
    onStreamEnd?.();
  };

  const cleanupStream = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setIsConnected(false);
  };

  const handleStreamEnd = () => {
    cleanupStream();
    setIsStreaming(false);
    toast({ title: "Stream has ended" });
    onStreamEnd?.();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleRecording = async () => {
    setIsRecording(!isRecording);
    
    await supabase
      .from("live_streams")
      .update({ status: isRecording ? "live" : "recording" })
      .eq("task_id", taskId);

    toast({
      title: isRecording ? "Recording stopped" : "Recording started",
      description: isRecording ? "Stream will not be saved" : "Stream is being recorded"
    });
  };

  return (
    <Card className="rounded-3xl shadow-card border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-destructive/10 to-primary/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            {isVoucher ? "Your Stream" : "Live View"}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isStreaming && (
              <>
                <Badge variant="destructive" className="animate-pulse-live flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-current" />
                  LIVE
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {viewerCount}
                </Badge>
                <Badge variant="outline">
                  {formatDuration(streamDuration)}
                </Badge>
              </>
            )}
            {isRecording && (
              <Badge className="bg-red-500 text-white">
                <Circle className="w-2 h-2 fill-current mr-1" />
                REC
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Video Container */}
        <div className="relative aspect-video bg-black">
          {isVoucher ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
            />
          ) : (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
              <div className="text-center">
                <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">
                  {isVoucher ? "Ready to go live?" : "Waiting for stream..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isVoucher 
                    ? "Start streaming to share your view with the requester" 
                    : "The voucher will start streaming when they arrive"}
                </p>
              </div>
            </div>
          )}

          {isVideoOff && isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
              <VideoOff className="w-16 h-16 text-muted-foreground" />
            </div>
          )}

          {/* Stream Controls Overlay */}
          {isStreaming && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm p-2 rounded-full">
              <Button
                size="icon"
                variant={isMuted ? "destructive" : "secondary"}
                className="rounded-full w-10 h-10"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>

              {isVoucher && (
                <>
                  <Button
                    size="icon"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    className="rounded-full w-10 h-10"
                    onClick={toggleVideo}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </Button>

                  <Button
                    size="icon"
                    variant={isRecording ? "destructive" : "secondary"}
                    className="rounded-full w-10 h-10"
                    onClick={toggleRecording}
                  >
                    <Circle className={`w-4 h-4 ${isRecording ? "fill-current" : ""}`} />
                  </Button>
                </>
              )}

              <Button
                size="icon"
                variant="secondary"
                className="rounded-full w-10 h-10"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>

              <Button
                size="icon"
                variant="secondary"
                className="rounded-full w-10 h-10"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 flex justify-center gap-4">
          {isVoucher ? (
            isStreaming ? (
              <Button
                size="lg"
                variant="destructive"
                className="rounded-xl"
                onClick={stopStream}
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Stream
              </Button>
            ) : (
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground rounded-xl shadow-button"
                onClick={startStream}
              >
                <Video className="w-5 h-5 mr-2" />
                Start Live Stream
              </Button>
            )
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              {isStreaming 
                ? "You are watching the live stream"
                : "Stream will appear here when the voucher goes live"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
