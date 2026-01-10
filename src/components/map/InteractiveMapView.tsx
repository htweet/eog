import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, DollarSign, X, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  bounty_amount: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface InteractiveMapViewProps {
  tasks: Task[];
  userLocation: { lat: number; lng: number } | null;
}

const categoryColors: Record<string, string> = {
  auto: "#3b82f6",
  realestate: "#22c55e",
  electronics: "#a855f7",
  general: "#f97316",
};

const categoryLabels: Record<string, string> = {
  auto: "Auto",
  realestate: "Real Estate",
  electronics: "Electronics",
  general: "General",
};

export function InteractiveMapView({ tasks, userLocation }: InteractiveMapViewProps) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Try to load token from localStorage or env
  useEffect(() => {
    const storedToken = localStorage.getItem("mapbox_token");
    const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    if (envToken) {
      setMapboxToken(envToken);
    } else if (storedToken) {
      setMapboxToken(storedToken);
    } else {
      setShowTokenInput(true);
    }
  }, []);

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      const tasksWithCoords = tasks.filter(t => t.latitude && t.longitude);
      
      // Calculate center
      let center: [number, number] = [-98.5795, 39.8283]; // US center
      if (userLocation) {
        center = [userLocation.lng, userLocation.lat];
      } else if (tasksWithCoords.length > 0) {
        const avgLng = tasksWithCoords.reduce((sum, t) => sum + t.longitude!, 0) / tasksWithCoords.length;
        const avgLat = tasksWithCoords.reduce((sum, t) => sum + t.latitude!, 0) / tasksWithCoords.length;
        center = [avgLng, avgLat];
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom: userLocation ? 12 : 4,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );

      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        "top-right"
      );

      map.current.on("load", () => {
        setIsMapReady(true);
        localStorage.setItem("mapbox_token", mapboxToken);
      });

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e);
        setError("Failed to load map. Please check your Mapbox token.");
        setShowTokenInput(true);
      });

    } catch (err) {
      console.error("Map initialization error:", err);
      setError("Failed to initialize map");
      setShowTokenInput(true);
    }
  }, [mapboxToken, tasks, userLocation]);

  // Initialize map when token is set
  useEffect(() => {
    if (mapboxToken && !map.current) {
      initializeMap();
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, initializeMap]);

  // Add markers when map is ready
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const tasksWithCoords = tasks.filter(t => t.latitude && t.longitude);

    // Add task markers
    tasksWithCoords.forEach((task) => {
      const el = document.createElement("div");
      el.className = "task-marker";
      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          background: ${categoryColors[task.category] || categoryColors.general};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: white;
          color: #333;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: bold;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        ">$${task.bounty_amount}</div>
      `;

      el.addEventListener("mouseenter", () => {
        el.querySelector("div")?.setAttribute("style", 
          el.querySelector("div")?.getAttribute("style")?.replace("transform: scale(1)", "transform: scale(1.1)") || ""
        );
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([task.longitude!, task.latitude!])
        .addTo(map.current!);

      el.addEventListener("click", () => {
        setSelectedTask(task);
        map.current?.flyTo({
          center: [task.longitude!, task.latitude!],
          zoom: 15,
          duration: 1000,
        });
      });

      markersRef.current.push(marker);
    });

    // Add user location marker
    if (userLocation && !userMarkerRef.current) {
      const userEl = document.createElement("div");
      userEl.innerHTML = `
        <div style="
          position: relative;
          width: 24px;
          height: 24px;
        ">
          <div style="
            position: absolute;
            inset: 0;
            background: hsl(16 85% 60% / 0.3);
            border-radius: 50%;
            animation: pulse 2s infinite;
          "></div>
          <div style="
            position: absolute;
            inset: 4px;
            background: hsl(16 85% 60%);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          "></div>
        </div>
      `;

      userMarkerRef.current = new mapboxgl.Marker({ element: userEl })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);
    }

    // Fit bounds to show all markers
    if (tasksWithCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      tasksWithCoords.forEach(t => bounds.extend([t.longitude!, t.latitude!]));
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
      
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [tasks, userLocation, isMapReady]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const openNavigation = (task: Task) => {
    if (task.latitude && task.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address)}`,
        "_blank"
      );
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      setError(null);
      setShowTokenInput(false);
      initializeMap();
    }
  };

  const tasksWithCoords = tasks.filter((t) => t.latitude && t.longitude);

  if (tasksWithCoords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No tasks with location data</p>
        <p className="text-muted-foreground">
          Tasks will appear here when they have coordinates
        </p>
      </div>
    );
  }

  if (showTokenInput) {
    return (
      <Card className="p-6">
        <div className="text-center mb-6">
          <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Mapbox Token Required</h3>
          <p className="text-muted-foreground text-sm mb-4">
            To view the interactive map, please enter your Mapbox public token.
            <br />
            Get one free at{" "}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-4 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleTokenSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="pk.xxxxx..."
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            className="font-mono text-sm"
          />
          <Button type="submit" className="w-full" disabled={!mapboxToken.trim()}>
            Load Map
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="h-[500px] rounded-xl border border-border overflow-hidden"
      />

      {/* Loading overlay */}
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur rounded-lg p-3 shadow-lg border">
        <p className="text-xs font-medium mb-2">Categories</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: categoryColors[key] }}
              />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Task count */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg border">
        <span className="text-sm font-medium">{tasksWithCoords.length} tasks</span>
      </div>

      {/* Selected task popup */}
      {selectedTask && (
        <Card className="mt-4 animate-in slide-in-from-bottom-4">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    style={{
                      backgroundColor: categoryColors[selectedTask.category] + "20",
                      color: categoryColors[selectedTask.category],
                    }}
                  >
                    {categoryLabels[selectedTask.category]}
                  </Badge>
                  {userLocation && selectedTask.latitude && selectedTask.longitude && (
                    <span className="text-xs text-muted-foreground">
                      {calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        selectedTask.latitude,
                        selectedTask.longitude
                      ).toFixed(1)}{" "}
                      km away
                    </span>
                  )}
                </div>
                <h3 className="font-semibold truncate">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedTask.address}
                </p>
                <div className="flex items-center gap-1 mt-2 text-lg font-bold text-primary">
                  <DollarSign className="h-5 w-5" />
                  {selectedTask.bounty_amount.toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setSelectedTask(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => openNavigation(selectedTask)}
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate(`/task/${selectedTask.id}`)}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
