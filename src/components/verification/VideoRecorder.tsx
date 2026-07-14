import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  StopCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Camera,
  AlertCircle,
  Loader2,
  MapPin
} from "lucide-react";

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface VideoRecorderProps {
  onVideoRecorded: (blob: Blob, gpsData: GPSData | null) => void;
  minDuration?: number; // minimum recording duration in seconds
  maxDuration?: number; // maximum recording duration in seconds
}

export function VideoRecorder({ 
  onVideoRecorded, 
  minDuration = 10, 
  maxDuration = 120 
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize camera
  const initCamera = useCallback(async () => {
    setLoading(true);
    setCameraError(null);
    
    // Stop existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Unable to access camera. Please grant permission and try again.");
    } finally {
      setLoading(false);
    }
  }, [facingMode]);

  // Initialize GPS
  const initGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
        });
        setGpsError(null);
      },
      (error) => {
        console.error("GPS error:", error);
        setGpsError("Unable to get location. Please enable GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    initCamera();
    initGPS();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, []);

  // Reinitialize camera when facing mode changes
  useEffect(() => {
    if (!recording && !recordedBlob) {
      initCamera();
    }
  }, [facingMode, recording, recordedBlob, initCamera]);

  const startRecording = async () => {
    if (!stream) return;

    // Get fresh GPS data
    initGPS();

    chunksRef.current = [];
    setDuration(0);
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm"
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every second
    setRecording(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setDuration((d) => {
        const newDuration = d + 1;
        if (newDuration >= maxDuration) {
          stopRecording();
        }
        return newDuration;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Stop the stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const resetRecording = async () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setIsPlaying(false);
    await initCamera();
    initGPS();
  };

  const confirmRecording = () => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob, gpsData);
    }
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isValidDuration = duration >= minDuration;

  if (cameraError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">{cameraError}</p>
          <Button className="mt-4" onClick={initCamera}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay={!recordedUrl}
            muted={!recordedUrl}
            playsInline
            className="w-full aspect-video bg-black object-cover"
            src={recordedUrl || undefined}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Recording indicator */}
          {recording && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                REC
              </span>
            </div>
          )}

          {/* Duration timer */}
          <div className="absolute top-4 right-4">
            <Badge 
              variant={recording ? "destructive" : "secondary"}
              className="text-lg font-mono"
            >
              {formatTime(duration)} / {formatTime(maxDuration)}
            </Badge>
          </div>

          {/* GPS indicator */}
          <div className="absolute bottom-4 left-4">
            <Badge 
              variant={gpsData ? "secondary" : "destructive"}
              className="gap-1"
            >
              <MapPin className="h-3 w-3" />
              {gpsData 
                ? `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}`
                : gpsError || "Getting location..."
              }
            </Badge>
          </div>

          {/* Minimum duration indicator */}
          {recording && !isValidDuration && (
            <div className="absolute bottom-4 right-4">
              <Badge variant="outline" className="bg-background/80">
                Min: {minDuration - duration}s more
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!recording && !recordedUrl && (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={switchCamera}
              className="gap-2"
            >
              <RotateCcw className="h-5 w-5" />
              Flip
            </Button>
            <Button
              size="lg"
              onClick={startRecording}
              className="gap-2 bg-destructive hover:bg-destructive/90"
              disabled={loading}
            >
              <Video className="h-5 w-5" />
              Start Recording
            </Button>
          </>
        )}

        {recording && (
          <Button
            size="lg"
            onClick={stopRecording}
            className="gap-2"
            variant="destructive"
            disabled={!isValidDuration}
          >
            <StopCircle className="h-5 w-5" />
            {isValidDuration ? "Stop Recording" : `Wait ${minDuration - duration}s`}
          </Button>
        )}

        {recordedUrl && (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={resetRecording}
              className="gap-2"
            >
              <RotateCcw className="h-5 w-5" />
              Retake
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={togglePlayback}
              className="gap-2"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              size="lg"
              onClick={confirmRecording}
              className="gap-2"
            >
              <Check className="h-5 w-5" />
              Use This Video
            </Button>
          </>
        )}
      </div>

      {/* Instructions */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Recording Guidelines</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Minimum recording duration: {minDuration} seconds</li>
            <li>• Maximum recording duration: {maxDuration} seconds</li>
            <li>• Ensure good lighting and steady camera</li>
            <li>• Capture all items in the verification checklist</li>
            <li>• GPS location will be embedded automatically</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
