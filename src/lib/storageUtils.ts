import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a verification video.
 * If the video_url is already a full URL (legacy), return it as-is.
 * If it's a file path, create a signed URL with 1-hour expiry.
 */
export async function getSignedVideoUrl(videoPath: string): Promise<string | null> {
  if (!videoPath) return null;
  
  // Legacy: if it's already a full URL, return as-is
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return videoPath;
  }

  const { data, error } = await supabase.storage
    .from('verification-videos')
    .createSignedUrl(videoPath, 3600); // 1 hour

  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }

  return data.signedUrl;
}
