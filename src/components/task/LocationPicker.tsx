import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationPickerProps {
  address: string;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  latitude?: number | null;
  longitude?: number | null;
}

export function LocationPicker({
  address,
  onAddressChange,
  onCoordinatesChange,
  latitude,
  longitude,
}: LocationPickerProps) {
  const { toast } = useToast();
  const [isLocating, setIsLocating] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onCoordinatesChange(lat, lng);
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          if (data.display_name) {
            onAddressChange(data.display_name);
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
        }
        
        setIsLocating(false);
        toast({
          title: "Location detected",
          description: "Your current location has been set",
        });
      },
      (error) => {
        setIsLocating(false);
        toast({
          title: "Error",
          description: "Unable to retrieve your location",
          variant: "destructive",
        });
      }
    );
  };

  const geocodeAddress = async (addr: string) => {
    if (!addr || addr.length < 5) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`
      );
      const data = await response.json();
      if (data[0]) {
        onCoordinatesChange(parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Location Address</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="address"
              placeholder="Enter the verification address..."
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              onBlur={(e) => geocodeAddress(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={getCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter an address or use the location button to auto-detect
        </p>
      </div>

      {latitude && longitude && (
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">Coordinates detected:</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
