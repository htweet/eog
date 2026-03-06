import { useState, useEffect } from "react";
import { getSignedVideoUrl } from "@/lib/storageUtils";
import { Loader2 } from "lucide-react";

interface VerificationVideoPlayerProps {
  videoUrl: string;
}

export function VerificationVideoPlayer({ videoUrl }: VerificationVideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSignedVideoUrl(videoUrl).then((url) => {
      if (!cancelled) {
        setSignedUrl(url);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [videoUrl]);

  if (loading) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Video unavailable</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
      <video
        src={signedUrl}
        controls
        className="w-full h-full object-contain"
      />
    </div>
  );
}
