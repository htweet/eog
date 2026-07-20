import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BountyCard } from "@/components/BountyCard";
import { InteractiveMapView } from "@/components/map/InteractiveMapView";
import { BrowseFilters } from "@/components/browse/BrowseFilters";
import { AISearchBar } from "@/components/browse/AISearchBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Loader2, MapPin, List, Map, Sparkles, TrendingUp, Zap } from "lucide-react";
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
  is_flash: boolean | null;
  flash_expires_at: string | null;
  is_featured: boolean | null;
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (user) updateUserLocation(pos.coords.latitude, pos.coords.longitude);
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
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString(), is_online: true }).eq("id", user.id);
  };

  const fetchVoucherTier = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("voucher_tier").eq("id", user.id).single();
    if (data?.voucher_tier) setVoucherTier(data.voucher_tier);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from("tasks").select("*").eq("status", "open").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load tasks", variant: "destructive" });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number | null, lng2: number | null): number | null => {
    if (lat2 === null || lng2 === null) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, []);

  const filterAndSortTasks = useCallback(() => {
    let filtered = [...tasks];

    if (userRole === "voucher" && voucherTier !== "pro") {
      filtered = filtered.filter((task) => task.required_tier !== "pro_only");
    }
    if (filters.tierFilter !== "all") {
      filtered = filters.tierFilter === "pro"
        ? filtered.filter((t) => t.required_tier === "pro_only")
        : filtered.filter((t) => t.required_tier !== "pro_only");
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q) || t.address.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (filters.category !== "all") filtered = filtered.filter((t) => t.category === filters.category);
    filtered = filtered.filter((t) => t.bounty_amount >= filters.minBounty && t.bounty_amount <= filters.maxBounty);
    if (userLocation && filters.maxDistance < 50) {
      filtered = filtered.filter((t) => {
        const d = calculateDistance(userLocation.lat, userLocation.lng, t.latitude, t.longitude);
        return d === null || d <= filters.maxDistance;
      });
    }

    switch (filters.sortBy) {
      case "newest": filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest": filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "highest": filtered.sort((a, b) => b.bounty_amount - a.bounty_amount); break;
      case "lowest": filtered.sort((a, b) => a.bounty_amount - b.bounty_amount); break;
      case "nearest":
        if (userLocation) {
          filtered.sort((a, b) => {
            const dA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
            const dB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
            if (dA === null) return 1;
            if (dB === null) return -1;
            return dA - dB;
          });
        }
        break;
    }
    setFilteredTasks(filtered);
  }, [tasks, filters, userLocation, voucherTier, userRole, calculateDistance]);

  const handleAISuggestion = (suggestion: string) => {
    const map: Record<string, Partial<FilterState>> = {
      "Near me": { sortBy: "nearest" },
      "High pay": { sortBy: "highest", minBounty: 5000 },
      "Quick jobs": { sortBy: "lowest", maxBounty: 2000 },
      "Vehicles": { category: "auto" },
      "Real Estate": { category: "realestate" },
      "Electronics": { category: "electronics" },
    };
    const update = map[suggestion];
    if (update) setFilters(prev => ({ ...prev, ...update }));
  };

  const getTimeAgo = (date: string) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getCategoryType = (category: string): "auto" | "realestate" | "electronics" | "general" => {
    return (["auto", "realestate", "electronics", "general"].includes(category) ? category : "general") as any;
  };

  const getDistance = (task: Task): string => {
    if (!userLocation || !task.latitude || !task.longitude) return "--";
    const d = calculateDistance(userLocation.lat, userLocation.lng, task.latitude, task.longitude);
    return d === null ? "--" : `${d.toFixed(1)} km`;
  };

  // Stats
  const totalBounty = filteredTasks.reduce((s, t) => s + t.bounty_amount, 0);
  const avgBounty = filteredTasks.length > 0 ? totalBounty / filteredTasks.length : 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        {/* Hero Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Browse Tasks</h1>
          </div>
          <p className="text-muted-foreground">Find verification tasks near you and start earning</p>
        </div>

        {/* AI Search */}
        <div className="mb-6">
          <AISearchBar
            onSearch={(q) => setFilters(prev => ({ ...prev, searchQuery: q }))}
            onAISuggestion={handleAISuggestion}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{filteredTasks.length}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Available</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">₦{avgBounty > 0 ? Math.round(avgBounty).toLocaleString() : "0"}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Avg Bounty</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">₦{totalBounty.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Total Pool</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle + Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")} className="gap-1.5 h-8">
              <List className="h-3.5 w-3.5" />List
            </Button>
            <Button variant={viewMode === "map" ? "default" : "outline"} size="sm" onClick={() => setViewMode("map")} className="gap-1.5 h-8">
              <Map className="h-3.5 w-3.5" />Map
            </Button>
          </div>
          <Badge variant="outline" className="text-xs">{loading ? "Loading..." : `${filteredTasks.length} tasks`}</Badge>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <BrowseFilters filters={filters} onFiltersChange={setFilters} userLocation={userLocation} categories={categories} />
        </div>

        {/* Tasks */}
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
            {filteredTasks.map((task, i) => (
              <div key={task.id} style={{ animationDelay: `${i * 50}ms` }}>
                <BountyCard
                  title={task.title}
                  location={task.address}
                  distance={getDistance(task)}
                  price={task.bounty_amount}
                  category={getCategoryType(task.category)}
                  timePosted={getTimeAgo(task.created_at)}
                  urgency="medium"
                  isPro={task.required_tier === "pro_only"}
                  isFlash={task.is_flash ?? false}
                  flashExpiresAt={task.flash_expires_at}
                  isFeatured={task.is_featured ?? false}
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
