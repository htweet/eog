import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BountyCard } from "@/components/BountyCard";
import { InteractiveMapView } from "@/components/map/InteractiveMapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Flame, Search, Filter, Loader2, MapPin, List, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "auto", label: "Automobiles" },
  { value: "realestate", label: "Real Estate" },
  { value: "electronics", label: "Electronics" },
  { value: "general", label: "General Items" },
];

export default function Browse() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchTasks();
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    filterAndSortTasks();
  }, [tasks, searchQuery, selectedCategory, sortBy]);

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

  const filterAndSortTasks = () => {
    let filtered = [...tasks];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((task) => task.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
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
    }

    setFilteredTasks(filtered);
  };

  const claimTask = async (taskId: string) => {
    if (!user || userRole !== "voucher") {
      toast({
        title: "Error",
        description: "Only vouchers can claim tasks",
        variant: "destructive",
      });
      return;
    }

    setClaiming(taskId);

    const { error } = await supabase
      .from("tasks")
      .update({ voucher_id: user.id, status: "assigned" })
      .eq("id", taskId)
      .eq("status", "open");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to claim task. It may have been claimed by someone else.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Task claimed successfully! Check your dashboard.",
      });
      fetchTasks();
    }
    setClaiming(null);
  };

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
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Bounty</SelectItem>
                <SelectItem value="lowest">Lowest Bounty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters */}
          <div className="flex flex-wrap gap-2">
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="capitalize">
                {selectedCategory}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="ml-2 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary">
                Search: {searchQuery}
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-2 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
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
                  distance="--"
                  price={task.bounty_amount}
                  category={getCategoryType(task.category)}
                  timePosted={getTimeAgo(task.created_at)}
                  urgency="medium"
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
