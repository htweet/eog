import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, DollarSign, X, List, Map } from "lucide-react";

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

interface TaskMapViewProps {
  tasks: Task[];
  userLocation: { lat: number; lng: number } | null;
}

const categoryColors: Record<string, string> = {
  auto: "bg-blue-500",
  realestate: "bg-emerald-500",
  electronics: "bg-purple-500",
  general: "bg-orange-500",
};

const categoryLabels: Record<string, string> = {
  auto: "Auto",
  realestate: "Real Estate",
  electronics: "Electronics",
  general: "General",
};

export function TaskMapView({ tasks, userLocation }: TaskMapViewProps) {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [mapBounds, setMapBounds] = useState({
    minLat: 0,
    maxLat: 0,
    minLng: 0,
    maxLng: 0,
  });

  useEffect(() => {
    // Calculate bounds from tasks
    const tasksWithCoords = tasks.filter(t => t.latitude && t.longitude);
    if (tasksWithCoords.length === 0) return;

    const lats = tasksWithCoords.map(t => t.latitude!);
    const lngs = tasksWithCoords.map(t => t.longitude!);

    // Add user location if available
    if (userLocation) {
      lats.push(userLocation.lat);
      lngs.push(userLocation.lng);
    }

    const padding = 0.01; // ~1km padding
    setMapBounds({
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLng: Math.min(...lngs) - padding,
      maxLng: Math.max(...lngs) + padding,
    });
  }, [tasks, userLocation]);

  const getPositionStyle = (lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    if (maxLat === minLat || maxLng === minLng) {
      return { top: "50%", left: "50%" };
    }
    
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    
    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(5, Math.min(95, y))}%`,
    };
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

  const tasksWithCoords = tasks.filter(t => t.latitude && t.longitude);

  if (tasksWithCoords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No tasks with location data</p>
        <p className="text-muted-foreground">Tasks will appear here when they have coordinates</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Map Container */}
      <div className="relative h-[500px] bg-muted/30 rounded-xl border border-border overflow-hidden">
        {/* Grid background to simulate map */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* User location marker */}
        {userLocation && (
          <div
            className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
            style={getPositionStyle(userLocation.lat, userLocation.lng)}
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-primary/30 rounded-full w-8 h-8" />
              <div className="relative flex items-center justify-center w-8 h-8 bg-primary rounded-full border-2 border-white shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <span className="absolute top-10 left-1/2 -translate-x-1/2 text-xs font-medium bg-background px-2 py-1 rounded shadow whitespace-nowrap">
              You
            </span>
          </div>
        )}

        {/* Task markers */}
        {tasksWithCoords.map((task) => (
          <button
            key={task.id}
            className={`absolute z-10 transform -translate-x-1/2 -translate-y-full transition-all ${
              selectedTask?.id === task.id ? "z-30 scale-125" : "hover:scale-110"
            }`}
            style={getPositionStyle(task.latitude!, task.longitude!)}
            onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
          >
            <div className="relative">
              <div className={`w-8 h-8 ${categoryColors[task.category]} rounded-full flex items-center justify-center shadow-lg border-2 border-white`}>
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 bg-background text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border">
                ${task.bounty_amount}
              </div>
            </div>
          </button>
        ))}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur rounded-lg p-3 shadow-lg border">
          <p className="text-xs font-medium mb-2">Categories</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${categoryColors[key]}`} />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task count */}
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg border">
          <span className="text-sm font-medium">{tasksWithCoords.length} tasks</span>
        </div>
      </div>

      {/* Selected task popup */}
      {selectedTask && (
        <Card className="mt-4 animate-in slide-in-from-bottom-4">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${categoryColors[selectedTask.category]} text-white border-0`}>
                    {categoryLabels[selectedTask.category]}
                  </Badge>
                  {userLocation && selectedTask.latitude && selectedTask.longitude && (
                    <span className="text-xs text-muted-foreground">
                      {calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        selectedTask.latitude,
                        selectedTask.longitude
                      ).toFixed(1)} km away
                    </span>
                  )}
                </div>
                <h3 className="font-semibold truncate">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{selectedTask.address}</p>
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
    </div>
  );
}
