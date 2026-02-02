import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useLocation() {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  });
  const [watchId, setWatchId] = useState<number | null>(null);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          error: error.message,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const updateProfileLocation = useCallback(async () => {
    if (!user || !location.latitude || !location.longitude) return;

    try {
      await supabase
        .from("profiles")
        .update({
          current_location: `POINT(${location.longitude} ${location.latitude})`,
          is_online: true,
          last_seen_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);
    } catch (error) {
      console.error("Error updating location:", error);
    }
  }, [user, location.latitude, location.longitude]);

  const checkIn = useCallback(async (taskId: string, maxDistance: number = 100) => {
    if (!location.latitude || !location.longitude) {
      toast.error("Unable to get your current location");
      return { success: false, error: "Location not available" };
    }

    try {
      const { data, error } = await supabase.rpc("verify_checkin", {
        p_task_id: taskId,
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_max_distance_meters: maxDistance,
      });

      if (error) {
        toast.error("Check-in failed");
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; verified: boolean; distance: number; error?: string };

      if (result.verified) {
        toast.success("Check-in verified! You're at the task location.");
      } else {
        toast.error(`You're ${result.distance}m away. Get within ${maxDistance}m to check in.`);
      }

      return result;
    } catch (error: any) {
      toast.error("Check-in failed");
      return { success: false, error: error.message };
    }
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    ...location,
    getCurrentPosition,
    startWatching,
    stopWatching,
    updateProfileLocation,
    checkIn,
    isWatching: watchId !== null,
  };
}
