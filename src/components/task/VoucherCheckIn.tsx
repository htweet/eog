import { useState, useEffect } from "react";
import { useLocation } from "@/hooks/useLocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";

interface VoucherCheckInProps {
  taskId: string;
  taskLatitude: number | null;
  taskLongitude: number | null;
  taskAddress: string;
  onCheckInSuccess?: () => void;
}

export function VoucherCheckIn({
  taskId,
  taskLatitude,
  taskLongitude,
  taskAddress,
  onCheckInSuccess,
}: VoucherCheckInProps) {
  const {
    latitude,
    longitude,
    accuracy,
    loading: locationLoading,
    error: locationError,
    getCurrentPosition,
    checkIn,
  } = useLocation();

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<"idle" | "verified" | "failed">("idle");
  const [distance, setDistance] = useState<number | null>(null);

  const MAX_DISTANCE = 100; // meters

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  // Calculate distance to task
  useEffect(() => {
    if (latitude && longitude && taskLatitude && taskLongitude) {
      const R = 6371000; // Earth radius in meters
      const dLat = ((taskLatitude - latitude) * Math.PI) / 180;
      const dLon = ((taskLongitude - longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((latitude * Math.PI) / 180) *
          Math.cos((taskLatitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;
      setDistance(Math.round(d));
    }
  }, [latitude, longitude, taskLatitude, taskLongitude]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    const result = await checkIn(taskId, MAX_DISTANCE);
    
    if (result.success && 'verified' in result) {
      if (result.verified) {
        setCheckInStatus("verified");
        onCheckInSuccess?.();
      } else {
        setCheckInStatus("failed");
      }
      
      if ('distance' in result && result.distance) {
        setDistance(result.distance);
      }
    } else {
      setCheckInStatus("failed");
    }
    
    setCheckingIn(false);
  };

  const isWithinRange = distance !== null && distance <= MAX_DISTANCE;
  const progressValue = distance !== null ? Math.max(0, 100 - (distance / MAX_DISTANCE) * 100) : 0;

  return (
    <Card className={checkInStatus === "verified" ? "border-green-500/50 bg-green-500/5" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Location Check-In
            </CardTitle>
            <CardDescription>
              Verify you've arrived at the task location
            </CardDescription>
          </div>
          {checkInStatus === "verified" && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Location */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <MapPin className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm">Task Location</p>
            <p className="text-sm text-muted-foreground">{taskAddress}</p>
          </div>
        </div>

        {/* Current Location Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Location</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={getCurrentPosition}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {locationError ? (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{locationError}</span>
            </div>
          ) : latitude && longitude ? (
            <div className="text-sm text-muted-foreground">
              <p>Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}</p>
              {accuracy && <p className="text-xs">Accuracy: ±{Math.round(accuracy)}m</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Fetching location...</p>
          )}
        </div>

        {/* Distance Progress */}
        {distance !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Distance to task</span>
              <span className={isWithinRange ? "text-green-500 font-medium" : "text-muted-foreground"}>
                {distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {isWithinRange
                ? "You're within check-in range!"
                : `Get within ${MAX_DISTANCE}m to check in`}
            </p>
          </div>
        )}

        {/* Check-In Button */}
        {checkInStatus !== "verified" && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckIn}
            disabled={checkingIn || locationLoading || !latitude || !longitude}
          >
            {checkingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying Location...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Check In at Location
              </>
            )}
          </Button>
        )}

        {/* Navigation Link */}
        {!isWithinRange && taskLatitude && taskLongitude && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${taskLatitude},${taskLongitude}`,
                "_blank"
              );
            }}
          >
            <Navigation className="mr-2 h-4 w-4" />
            Get Directions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
