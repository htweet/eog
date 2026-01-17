import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BountyCard } from "@/components/BountyCard";
import { InteractiveMapView } from "@/components/map/InteractiveMapView";
import { BrowseFilters } from "@/components/browse/BrowseFilters";
import { Button } from "@/components/ui/button";
import { Flame, Loader2, MapPin, List, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  bounty_amount: number;
  address: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  required_tier: string | null;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "auto", label: "Automobiles" },
  { value: "realestate", label: "Real Estate" },
  { value: "electronics", label: "Electronics" },
  { value: "general", label: "General Items" },
];

interface FilterState {
  searchQuery: string;
  category: string;
  sortBy: string;
  minBounty: number;
  maxBounty: number;
  maxDistance: number;
  tierFilter: string;
}

export default function Browse() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [voucherTier, setVoucherTier] = useState<string>("standard");
  
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    category: "all",
    sortBy: "newest",
    minBounty: 0,
    maxBounty: 10000,
    maxDistance: 50,
    tierFilter: "all",
  });

  useEffect(() => {
    fetchTasks();
    fetchVoucherTier();
    
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          // Update user's current location in profile
          if (user) {
            updateUserLocation(pos.coords.latitude, pos.coords.longitude);
          }
        },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    filterAndSortTasks();
  }, [tasks, filters, userLocation, voucherTier]);

  const updateUserLocation = async (lat: number, lng: number) => {
    if (!user) return;
    
    await supabase
      .from("profiles")
      .update({
        last_seen_at: new Date().toISOString(),
        is_online: true,
      })
      .eq("id", user.id);
  };

  const fetchVoucherTier = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("voucher_tier")
      .eq("id", user.id)
      .single();
    
    if (data?.voucher_tier) {
      setVoucherTier(data.voucher_tier);
    }
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number | null, lng2: number | null): number | null => {
    if (lat2 === null || lng2 === null) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const filterAndSortTasks = useCallback(() => {
    let filtered = [...tasks];

    // Filter by tier - hide pro_only tasks from standard vouchers
    if (userRole === "voucher" && voucherTier !== "pro") {
      filtered = filtered.filter((task) => task.required_tier !== "pro_only");
    }

    // Apply tier filter
    if (filters.tierFilter !== "all") {
      if (filters.tierFilter === "pro") {
        filtered = filtered.filter((task) => task.required_tier === "pro_only");
      } else {
        filtered = filtered.filter((task) => task.required_tier !== "pro_only");
      }
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.address.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (filters.category !== "all") {
      filtered = filtered.filter((task) => task.category === filters.category);
    }

    // Filter by bounty range
    filtered = filtered.filter(
      (task) =>
        task.bounty_amount >= filters.minBounty &&
        task.bounty_amount <= filters.maxBounty
    );

    // Filter by distance if user location is available
    if (userLocation && filters.maxDistance < 50) {
      filtered = filtered.filter((task) => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          task.latitude,
          task.longitude
        );
        return distance === null || distance <= filters.maxDistance;
      });
    }

    // Sort
    switch (filters.sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "highest":
        filtered.sort((a, b) => b.bounty_amount - a.bounty_amount);
        break;
      case "lowest":
        filtered.sort((a, b) => a.bounty_amount - b.bounty_amount);
        break;
      case "nearest":
        if (userLocation) {
          filtered.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
            const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
            if (distA === null) return 1;
            if (distB === null) return -1;
            return distA - distB;
          });
        }
        break;
    }

    setFilteredTasks(filtered);
  }, [tasks, filters, userLocation, voucherTier, userRole, calculateDistance]);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const getCategoryType = (category: string): "auto" | "realestate" | "electronics" | "general" => {
    if (["auto", "realestate", "electronics", "general"].includes(category)) {
      return category as "auto" | "realestate" | "electronics" | "general";
    }
    return "general";
  };

  const getDistance = (task: Task): string => {
    if (!userLocation || !task.latitude || !task.longitude) return "--";
    const distance = calculateDistance(userLocation.lat, userLocation.lng, task.latitude, task.longitude);
    if (distance === null) return "--";
    return `${distance.toFixed(1)} km`;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Browse Tasks</h1>
          </div>
          <p className="text-muted-foreground">
            Find verification tasks near you and start earning
          </p>
          {/* View mode toggle */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="gap-2"
            >
              <Map className="h-4 w-4" />
              Map
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <BrowseFilters
            filters={filters}
            onFiltersChange={setFilters}
            userLocation={userLocation}
            categories={categories}
          />
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {loading ? "Loading..." : `${filteredTasks.length} tasks found`}
        </div>

        {/* Tasks View */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">No tasks found</p>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : viewMode === "map" ? (
          <InteractiveMapView tasks={filteredTasks} userLocation={userLocation} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredTasks.map((task, index) => (
              <div
                key={task.id}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <BountyCard
                  title={task.title}
                  location={task.address}
                  distance={getDistance(task)}
                  price={task.bounty_amount}
                  category={getCategoryType(task.category)}
                  timePosted={getTimeAgo(task.created_at)}
                  urgency="medium"
                  isPro={task.required_tier === "pro_only"}
                  onClick={() => navigate(`/task/${task.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
